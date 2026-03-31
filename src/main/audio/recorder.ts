import * as path from 'path';
import * as fs from 'fs';

/**
 * Returns the path where a new recording should be saved.
 * The actual recording happens in the renderer via MediaRecorder API.
 * This module handles the file management side.
 */
export function getRecordingsDir(): string {
  const dir = path.join(
    process.env.APPDATA || process.env.LOCALAPPDATA || '',
    'Rekal',
    'recordings'
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getNewRecordingPath(): string {
  const dir = getRecordingsDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(dir, `meeting_${timestamp}.wav`);
}
