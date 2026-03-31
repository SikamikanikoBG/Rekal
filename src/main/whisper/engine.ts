import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { Transcript, TranscriptSegment } from '../../shared/types';
import { getWhisperBinPath, getModelsDir } from '../setup/scanner';

interface TranscribeOptions {
  audioPath: string;
  model?: string;
  language?: string;
  onProgress?: (percent: number, text: string) => void;
}

/**
 * Runs whisper.cpp on an audio file.
 * whisper.cpp is a standalone .exe — no Python, no dependencies.
 */
export async function transcribe(options: TranscribeOptions): Promise<Transcript> {
  const { audioPath, model = 'base', language } = options;

  const binPath = getWhisperBinPath();
  if (!fs.existsSync(binPath)) {
    throw new Error('Whisper engine not found. Please run setup first.');
  }

  const modelPath = path.join(getModelsDir(), `ggml-${model}.bin`);
  if (!fs.existsSync(modelPath)) {
    throw new Error(`Whisper model '${model}' not found at ${modelPath}`);
  }

  // whisper-cli -of takes a path WITHOUT extension, adds .json itself
  const outputBase = audioPath + '.transcript';
  const outputJson = outputBase + '.json';

  return new Promise((resolve, reject) => {
    const args = [
      '-m', modelPath,
      '-f', audioPath,
      '-oj',                  // output JSON
      '-of', outputBase,      // output file path (no extension)
      '--print-progress',
    ];

    if (language && language !== 'auto') {
      args.push('-l', language);
    }

    options.onProgress?.(5, 'Loading whisper model...');

    const proc = spawn(binPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.dirname(binPath),  // run from whisper dir so DLLs are found
    });

    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      // whisper-cli prints transcription lines to stdout
      const lines = text.trim().split('\n');
      for (const line of lines) {
        if (line.includes('-->')) {
          // Parse timestamp lines like: [00:00:00.000 --> 00:00:05.000]  Hello world
          options.onProgress?.(50, line.trim().substring(0, 80));
        }
      }
    });

    proc.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;

      // Parse whisper.cpp progress from stderr
      // It prints lines like: "whisper_full_with_state: progress = 45%"
      const progressMatch = text.match(/progress\s*=\s*(\d+)%/);
      if (progressMatch) {
        const pct = parseInt(progressMatch[1]);
        options.onProgress?.(Math.min(95, 5 + pct * 0.9), `Transcribing... ${pct}%`);
      }
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Transcription failed (code ${code}):\n${stderr.slice(-500)}`));
        return;
      }

      options.onProgress?.(98, 'Parsing results...');

      try {
        if (!fs.existsSync(outputJson)) {
          reject(new Error(
            `Transcription output not found at: ${outputJson}\n` +
            `Whisper stderr: ${stderr.slice(-300)}`
          ));
          return;
        }

        const raw = JSON.parse(fs.readFileSync(outputJson, 'utf-8'));

        const segments: TranscriptSegment[] = (raw.transcription || [])
          .filter((seg: any) => {
            // Filter out blank audio markers
            const text = (seg.text || '').trim();
            return text && !text.includes('[BLANK_AUDIO]');
          })
          .map((seg: any) => ({
            start: parseTimestamp(seg.timestamps?.from || '00:00:00,000'),
            end: parseTimestamp(seg.timestamps?.to || '00:00:00,000'),
            text: (seg.text || '').trim(),
          }));

        const duration = segments.length > 0 ? segments[segments.length - 1].end : 0;

        // Clean up temp file
        try { fs.unlinkSync(outputJson); } catch {}

        options.onProgress?.(100, 'Done');

        resolve({
          segments,
          language: raw.result?.language || 'en',
          duration,
        });
      } catch (e) {
        reject(new Error(`Failed to parse transcription: ${e}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to start whisper: ${err.message}`));
    });
  });
}

/**
 * Parses whisper.cpp timestamp format: "00:01:23,456" or "00:01:23.456"
 */
function parseTimestamp(ts: string): number {
  const parts = ts.replace(',', '.').split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  }
  return 0;
}
