import { useState, useRef, useCallback } from 'react';

const SAMPLE_RATE = 16000;
const CHUNK_SECONDS = 10;
const CHUNK_SAMPLES = SAMPLE_RATE * CHUNK_SECONDS; // 160,000 samples per chunk

interface UseAudioRecorderResult {
  isRecording: boolean;
  duration: number;
  audioLevel: number;
  startRecording: (onChunk: (wav: Blob) => void) => Promise<void>;
  stopRecording: () => Promise<Blob>;
  error: string | null;
}

/**
 * Records microphone + system audio mixed together.
 * Calls onChunk(wavBlob) every ~10 seconds while recording, and once more
 * with the remaining audio when stopRecording() is called.
 * Also returns the full recording as a WAV blob from stopRecording() for saving.
 */
export function useAudioRecorder(): UseAudioRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamsRef = useRef<MediaStream[]>([]);
  // All samples accumulated (for full WAV on stop)
  const allSamplesRef = useRef<Float32Array[]>([]);
  // Samples since last chunk was dispatched
  const pendingSamplesRef = useRef<Float32Array[]>([]);
  const pendingCountRef = useRef(0);
  const onChunkRef = useRef<(wav: Blob) => void>(() => {});
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef(0);

  const startRecording = useCallback(async (onChunk: (wav: Blob) => void) => {
    setError(null);
    setDuration(0);
    allSamplesRef.current = [];
    pendingSamplesRef.current = [];
    pendingCountRef.current = 0;
    onChunkRef.current = onChunk;

    try {
      // ── Microphone ──────────────────────────────────────────────────────────
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
      streamsRef.current = [micStream];

      // ── System audio (loopback) ─────────────────────────────────────────────
      try {
        const sources = await window.api.getDesktopSources();
        if (sources.length > 0) {
          const constraints: any = {
            audio: { mandatory: { chromeMediaSource: 'desktop' } },
            video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sources[0].id } },
          };
          const desktopStream = await navigator.mediaDevices.getUserMedia(constraints);
          desktopStream.getVideoTracks().forEach((t) => t.stop());
          streamsRef.current.push(new MediaStream(desktopStream.getAudioTracks()));
        }
      } catch {
        console.warn('System audio unavailable, mic only');
      }

      // ── Mix & capture ───────────────────────────────────────────────────────
      const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioCtxRef.current = audioCtx;

      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const input = new Float32Array(e.inputBuffer.getChannelData(0));

        allSamplesRef.current.push(input);
        pendingSamplesRef.current.push(input);
        pendingCountRef.current += input.length;

        // Audio level
        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
        setAudioLevel(Math.min(1, Math.sqrt(sum / input.length) * 3));

        // Dispatch chunk when enough samples accumulated
        if (pendingCountRef.current >= CHUNK_SAMPLES) {
          const merged = mergeSamples(pendingSamplesRef.current);
          pendingSamplesRef.current = [];
          pendingCountRef.current = 0;
          onChunkRef.current(encodeWav(merged, SAMPLE_RATE));
        }
      };

      streamsRef.current.forEach((s) => audioCtx.createMediaStreamSource(s).connect(processor));
      processor.connect(audioCtx.destination);

      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 200);

      setIsRecording(true);
    } catch (err) {
      const msg = (err as Error).message;
      setError(
        msg.includes('Permission denied') || msg.includes('NotAllowedError')
          ? 'Microphone access denied. Please allow microphone access in your system settings.'
          : `Failed to start recording: ${msg}`
      );
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!isRecording) { reject(new Error('Not recording')); return; }

      clearInterval(timerRef.current);
      processorRef.current?.disconnect();
      audioCtxRef.current?.close();
      streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
      streamsRef.current = [];

      // Dispatch any remaining samples as the final chunk
      if (pendingSamplesRef.current.length > 0) {
        const remaining = mergeSamples(pendingSamplesRef.current);
        pendingSamplesRef.current = [];
        pendingCountRef.current = 0;
        onChunkRef.current(encodeWav(remaining, SAMPLE_RATE));
      }

      // Build full WAV for saving
      const fullWav = encodeWav(mergeSamples(allSamplesRef.current), SAMPLE_RATE);
      allSamplesRef.current = [];

      setIsRecording(false);
      setAudioLevel(0);
      resolve(fullWav);
    });
  }, [isRecording]);

  return { isRecording, duration, audioLevel, startRecording, stopRecording, error };
}

function mergeSamples(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) { merged.set(c, offset); offset += c.length; }
  return merged;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataLength = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}
