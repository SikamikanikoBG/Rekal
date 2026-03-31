import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { DependencyStatus, ScanResult } from '../../shared/types';
import { getConfig } from '../config/store';

const execFileAsync = promisify(execFile);

/**
 * Scans the system for all required dependencies.
 * No Python needed — we use whisper.cpp (standalone binary).
 * Only Ollama needs to be pre-installed by the user.
 */
export async function scanDependencies(): Promise<ScanResult> {
  const [whisperBin, whisperModel, ollama, ollamaRunning, ollamaModels] =
    await Promise.all([
      scanWhisperCpp(),
      scanWhisperModel(),
      scanOllama(),
      checkOllamaRunning(),
      listOllamaModels(),
    ]);

  return {
    whisperBin,
    whisperModel,
    ollama,
    ollamaRunning,
    ollamaModels,
  };
}

async function scanWhisperCpp(): Promise<DependencyStatus> {
  const binPath = getWhisperBinPath();
  if (fs.existsSync(binPath)) {
    return { name: 'Whisper Engine', found: true, path: binPath, details: 'whisper-cli.exe found' };
  }
  return { name: 'Whisper Engine', found: false, details: 'whisper-cli.exe not found. Will download automatically.' };
}

async function scanWhisperModel(): Promise<DependencyStatus> {
  const modelsDir = getModelsDir();
  const modelFiles = ['ggml-small.bin', 'ggml-base.bin', 'ggml-medium.bin', 'ggml-large-v3.bin', 'ggml-tiny.bin'];

  for (const file of modelFiles) {
    const fullPath = path.join(modelsDir, file);
    if (fs.existsSync(fullPath)) {
      const size = file.replace('ggml-', '').replace('.bin', '');
      return { name: 'Whisper Model', found: true, version: size, path: fullPath, details: `Found ${size} model` };
    }
  }

  // Also check bundled location
  const resourceModels = path.join(process.resourcesPath || '', 'whisper', 'models');
  if (fs.existsSync(resourceModels)) {
    for (const file of modelFiles) {
      const fullPath = path.join(resourceModels, file);
      if (fs.existsSync(fullPath)) {
        const size = file.replace('ggml-', '').replace('.bin', '');
        return { name: 'Whisper Model', found: true, version: size, path: fullPath, details: `Bundled ${size} model` };
      }
    }
  }

  return { name: 'Whisper Model', found: false, details: 'No model found. Will download on first use (~500MB for small).' };
}

async function scanOllama(): Promise<DependencyStatus> {
  const commonPaths = [
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama.exe'),
    path.join(process.env.PROGRAMFILES || '', 'Ollama', 'ollama.exe'),
    'ollama',
  ];

  for (const p of commonPaths) {
    try {
      const { stdout } = await execFileAsync(p, ['--version'], { timeout: 5000 });
      return { name: 'Ollama', found: true, version: stdout.trim(), path: p };
    } catch {
      // Try next
    }
  }

  return { name: 'Ollama', found: false, details: 'Not found. Install from https://ollama.com' };
}

function getOllamaBaseUrl(): string {
  return (getConfig().ollamaUrl || 'http://localhost:11434').replace(/\/+$/, '');
}

async function checkOllamaRunning(): Promise<boolean> {
  try {
    const baseUrl = getOllamaBaseUrl();
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function listOllamaModels(): Promise<string[]> {
  try {
    const baseUrl = getOllamaBaseUrl();
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { models?: Array<{ name: string }> };
    return (data.models || []).map((m) => m.name);
  } catch {
    return [];
  }
}

// ── Path helpers ──

export function getAppDataPath(): string {
  return path.join(process.env.APPDATA || process.env.LOCALAPPDATA || '', 'Rekal');
}

export function getWhisperDir(): string {
  return path.join(getAppDataPath(), 'whisper');
}

export function getWhisperBinPath(): string {
  return path.join(getWhisperDir(), 'whisper-cli.exe');
}

export function getModelsDir(): string {
  const dir = path.join(getWhisperDir(), 'models');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
