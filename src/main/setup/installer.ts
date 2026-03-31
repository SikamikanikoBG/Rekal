import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { ScanResult } from '../../shared/types';
import { getWhisperDir, getWhisperBinPath, getModelsDir } from './scanner';

const execAsync = promisify(exec);

type ProgressCallback = (step: string, detail: string, percent: number) => void;

// Verified working URLs as of v1.8.4
const WHISPER_ZIP_URL = 'https://github.com/ggml-org/whisper.cpp/releases/download/v1.8.4/whisper-blas-bin-Win32.zip';

const WHISPER_MODEL_URLS: Record<string, { url: string; size: string }> = {
  tiny:   { url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',   size: '~75 MB' },
  base:   { url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',   size: '~150 MB' },
  small:  { url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',  size: '~500 MB' },
  medium: { url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin', size: '~1.5 GB' },
};

const DEFAULT_MODEL = 'base';

/**
 * Downloads and installs only the missing components.
 * Uses curl (built into Windows 10+) for downloads and PowerShell for zip extraction.
 * No Python, no admin rights — everything goes to %APPDATA%/Rekal.
 */
export async function installMissing(
  scan: ScanResult,
  onProgress: ProgressCallback
): Promise<void> {
  const steps: string[] = [];
  if (!scan.whisperBin.found) steps.push('bin');
  if (!scan.whisperModel.found) steps.push('model');
  const total = steps.length || 1;
  let current = 0;

  // ── Step 1: Download & extract whisper.cpp binaries ──
  if (!scan.whisperBin.found) {
    current++;
    const whisperDir = getWhisperDir();
    fs.mkdirSync(whisperDir, { recursive: true });

    const zipPath = path.join(whisperDir, 'whisper-bin.zip');
    const extractDir = path.join(whisperDir, '_extract');

    // Download zip
    onProgress('Downloading whisper engine', 'Downloading whisper.cpp (~10 MB)...', pct(current, total, 5));
    try {
      await execAsync(
        `curl -L --fail -o "${zipPath}" "${WHISPER_ZIP_URL}"`,
        { timeout: 120000 }
      );
    } catch (e) {
      throw new Error(
        `Failed to download whisper.cpp. Check your internet connection.\n${(e as Error).message}`
      );
    }

    // Extract zip using PowerShell (available on all Windows 10+)
    onProgress('Downloading whisper engine', 'Extracting...', pct(current, total, 60));
    try {
      // Clean previous extraction
      if (fs.existsSync(extractDir)) {
        fs.rmSync(extractDir, { recursive: true });
      }
      await execAsync(
        `powershell -NoProfile -Command "Expand-Archive -Force -Path '${zipPath}' -DestinationPath '${extractDir}'"`,
        { timeout: 30000 }
      );
    } catch (e) {
      throw new Error(`Failed to extract whisper.cpp zip.\n${(e as Error).message}`);
    }

    // Find and copy the binaries (they may be in a Release/ subfolder)
    onProgress('Downloading whisper engine', 'Installing...', pct(current, total, 85));
    const releaseDir = findReleaseDir(extractDir);
    if (!releaseDir) {
      throw new Error(
        `Could not find whisper binaries in extracted zip. Contents: ${fs.readdirSync(extractDir).join(', ')}`
      );
    }

    // Copy whisper-cli.exe and all required DLLs to whisperDir
    const files = fs.readdirSync(releaseDir);
    for (const file of files) {
      if (file.endsWith('.exe') || file.endsWith('.dll')) {
        fs.copyFileSync(path.join(releaseDir, file), path.join(whisperDir, file));
      }
    }

    // Verify whisper-cli.exe exists now
    if (!fs.existsSync(getWhisperBinPath())) {
      throw new Error(
        `whisper-cli.exe not found after extraction. Available files: ${files.join(', ')}`
      );
    }

    // Cleanup
    try {
      fs.unlinkSync(zipPath);
      fs.rmSync(extractDir, { recursive: true });
    } catch {
      // Non-critical cleanup failure
    }

    onProgress('Downloading whisper engine', 'Done', pct(current, total, 100));
  }

  // ── Step 2: Download whisper model ──
  if (!scan.whisperModel.found) {
    current++;
    const model = WHISPER_MODEL_URLS[DEFAULT_MODEL];
    const modelPath = path.join(getModelsDir(), `ggml-${DEFAULT_MODEL}.bin`);

    onProgress(
      'Downloading whisper model',
      `Downloading "${DEFAULT_MODEL}" model (${model.size})...`,
      pct(current, total, 5)
    );

    try {
      await execAsync(
        `curl -L --fail -o "${modelPath}" "${model.url}"`,
        { timeout: 600000 } // 10 min for large download
      );

      // Verify file was actually downloaded (not an error page)
      const stat = fs.statSync(modelPath);
      if (stat.size < 10_000_000) {
        // Less than 10MB — probably an error page, not a model
        fs.unlinkSync(modelPath);
        throw new Error('Downloaded file is too small — likely a download error. Please try again.');
      }

      onProgress('Downloading whisper model', 'Done', pct(current, total, 100));
    } catch (e) {
      // Clean up partial download
      try { fs.unlinkSync(modelPath); } catch {}
      throw new Error(
        `Failed to download whisper model. Check your internet connection.\n${(e as Error).message}`
      );
    }
  }
}

/**
 * Finds the directory containing whisper-cli.exe inside the extracted zip.
 * The zip may have files directly or in a Release/ subfolder.
 */
function findReleaseDir(extractDir: string): string | null {
  // Check top level
  if (fs.existsSync(path.join(extractDir, 'whisper-cli.exe'))) {
    return extractDir;
  }

  // Check subdirectories (e.g., Release/)
  const entries = fs.readdirSync(extractDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subPath = path.join(extractDir, entry.name);
      if (fs.existsSync(path.join(subPath, 'whisper-cli.exe'))) {
        return subPath;
      }
      // One more level deep (e.g., extracted/Release/)
      const subEntries = fs.readdirSync(subPath, { withFileTypes: true });
      for (const sub of subEntries) {
        if (sub.isDirectory()) {
          const deepPath = path.join(subPath, sub.name);
          if (fs.existsSync(path.join(deepPath, 'whisper-cli.exe'))) {
            return deepPath;
          }
        }
      }
    }
  }

  return null;
}

function pct(step: number, total: number, within: number): number {
  const base = ((step - 1) / total) * 100;
  const chunk = (1 / total) * 100;
  return Math.round(base + (within / 100) * chunk);
}
