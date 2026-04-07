import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderResult {
  isRecording: boolean;
  duration: number;
  audioLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
  error: string | null;
}

/**
 * Records microphone + system audio (WASAPI loopback via desktopCapturer) mixed together.
 * Falls back to microphone-only if system audio capture is unavailable.
 * Produces a 16kHz mono WAV blob.
 */
export function useAudioRecorder(): UseAudioRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamsRef = useRef<MediaStream[]>([]);
  const chunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef(0);

  const startRecording = useCallback(async () => {
    setError(null);
    setDuration(0);
    chunksRef.current = [];
    streamsRef.current = [];

    try {
      // ── Microphone ──────────────────────────────────────────────────────────
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
      streamsRef.current.push(micStream);

      // ── System audio (loopback) ─────────────────────────────────────────────
      let systemStream: MediaStream | null = null;
      try {
        const sources = await window.api.getDesktopSources();
        if (sources.length > 0) {
          const constraints: any = {
            audio: { mandatory: { chromeMediaSource: 'desktop' } },
            video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sources[0].id } },
          };
          const desktopStream = await navigator.mediaDevices.getUserMedia(constraints);
          // Drop video tracks — we only want the audio
          desktopStream.getVideoTracks().forEach((t) => t.stop());
          systemStream = new MediaStream(desktopStream.getAudioTracks());
          streamsRef.current.push(systemStream);
        }
      } catch (sysErr) {
        // System audio unavailable — continue with mic only
        console.warn('System audio capture unavailable, using mic only:', sysErr);
      }

      // ── Mix streams ─────────────────────────────────────────────────────────
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;

      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(inputData));

        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
        setAudioLevel(Math.min(1, Math.sqrt(sum / inputData.length) * 3));
      };

      // Connect mic
      audioCtx.createMediaStreamSource(micStream).connect(processor);

      // Connect system audio if available
      if (systemStream) {
        audioCtx.createMediaStreamSource(systemStream).connect(processor);
      }

      processor.connect(audioCtx.destination);

      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 200);

      setIsRecording(true);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('Permission denied') || msg.includes('NotAllowedError')) {
        setError('Microphone access denied. Please allow microphone access in your system settings.');
      } else {
        setError(`Failed to start recording: ${msg}`);
      }
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!isRecording) {
        reject(new Error('Not recording'));
        return;
      }

      clearInterval(timerRef.current);

      processorRef.current?.disconnect();
      audioCtxRef.current?.close();
      streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
      streamsRef.current = [];

      const totalLength = chunksRef.current.reduce((acc, c) => acc + c.length, 0);
      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of chunksRef.current) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      const wavBlob = encodeWav(merged, 16000);
      chunksRef.current = [];

      setIsRecording(false);
      setAudioLevel(0);

      resolve(wavBlob);
    });
  }, [isRecording]);

  return { isRecording, duration, audioLevel, startRecording, stopRecording, error };
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
