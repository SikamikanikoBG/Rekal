import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

const LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.DEBUG]: 'DEBUG',
};

const SENSITIVE_KEYS = new Set([
  'apikey',
  'api_key',
  'key',
  'token',
  'password',
  'secret',
  'authorization',
  'credential',
  'encryptionkey',
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 3;

function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = redact(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

class Logger {
  private level: LogLevel;
  private logDir: string;
  private logFile: string;

  constructor() {
    this.level = process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO;
    this.logDir = path.join(
      process.env.LOCALAPPDATA || process.env.APPDATA || '',
      'Rekal',
      'logs'
    );
    this.logFile = path.join(this.logDir, 'app.log');

    try {
      fs.mkdirSync(this.logDir, { recursive: true });
    } catch {
      // If we can't create the log dir, logging will be best-effort
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (level > this.level) return;

    const entry: Record<string, unknown> = {
      level: LEVEL_NAMES[level],
      timestamp: new Date().toISOString(),
      message,
    };

    if (context) {
      entry.context = redact(context);
    }

    const line = JSON.stringify(entry) + '\n';

    // Write to console in dev
    if (process.env.NODE_ENV === 'development') {
      const consoleFn = level === LogLevel.ERROR ? console.error
        : level === LogLevel.WARN ? console.warn
        : console.log;
      consoleFn(`[${LEVEL_NAMES[level]}] ${message}`, context ? redact(context) : '');
    }

    // Write to file asynchronously to avoid blocking
    try {
      this.rotateIfNeeded();
      fs.appendFileSync(this.logFile, line);
    } catch {
      // Logging should never crash the app
    }
  }

  private rotateIfNeeded(): void {
    try {
      if (!fs.existsSync(this.logFile)) return;
      const stat = fs.statSync(this.logFile);
      if (stat.size < MAX_FILE_SIZE) return;

      // Rotate: app.log.2 -> deleted, app.log.1 -> app.log.2, app.log -> app.log.1
      for (let i = MAX_FILES - 1; i >= 1; i--) {
        const older = `${this.logFile}.${i + 1}`;
        const newer = `${this.logFile}.${i}`;
        if (i === MAX_FILES - 1 && fs.existsSync(older)) {
          fs.unlinkSync(older);
        }
        if (fs.existsSync(newer)) {
          fs.renameSync(newer, older);
        }
      }
      fs.renameSync(this.logFile, `${this.logFile}.1`);
    } catch {
      // Best-effort rotation
    }
  }
}

export const logger = new Logger();
