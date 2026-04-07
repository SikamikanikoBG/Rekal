import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { app } from 'electron';
import { setConfig, setApiKey } from './store';
import { logger } from '../logging/logger';

const HAIPER_CONFIG_URL = 'https://haiper.test.postbank.bg/api/meeting-ai/config';
const APP_TOKEN = 'rekal-app-v1-2026';

export type ConfigSource = 'file' | 'remote' | 'none';

function getPrivateKeyPath(): string {
  // In production: next to the exe in resources/
  // In dev: from the repo root resources/
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'private.pem');
  }
  return path.join(app.getAppPath(), 'resources', 'private.pem');
}

function getConfigFilePath(): string {
  // Look for rekal.config.json next to the exe
  const exeDir = path.dirname(app.getPath('exe'));
  return path.join(exeDir, 'rekal.config.json');
}

// Fields that belong in the API keys store, not the general config
const API_KEY_FIELDS = ['haiperApiKey', 'openai', 'anthropic', 'azureSpeechKey', 'azureSpeechRegion', 'azureOpenaiKey', 'azureOpenaiEndpoint', 'azureOpenaiDeployment'];

function applyConfig(config: Record<string, any>): void {
  const { apiKeys, ...rest } = config;

  // Separate any top-level API key fields from general config
  const topLevelKeys: Record<string, string> = {};
  for (const field of API_KEY_FIELDS) {
    if (typeof rest[field] === 'string') {
      topLevelKeys[field] = rest[field];
      delete rest[field];
    }
  }

  // Apply general config fields (providers, language, etc.)
  if (Object.keys(rest).length > 0) {
    setConfig(rest);
  }

  // Apply API keys from nested apiKeys object
  if (apiKeys && typeof apiKeys === 'object') {
    for (const [key, value] of Object.entries(apiKeys)) {
      if (typeof value === 'string') setApiKey(key as any, value);
    }
  }

  // Apply API keys from top-level fields
  for (const [key, value] of Object.entries(topLevelKeys)) {
    setApiKey(key as any, value);
  }
}

function decryptConfig(encryptedKey: string, encryptedData: string): Record<string, any> {
  const privatePemPath = getPrivateKeyPath();

  if (!fs.existsSync(privatePemPath)) {
    throw new Error(`Private key not found at ${privatePemPath}`);
  }

  const privateKey = fs.readFileSync(privatePemPath, 'utf-8');

  // Unwrap AES key with RSA-OAEP
  const aesKey = crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(encryptedKey, 'base64')
  );

  // Split nonce (12 bytes) + ciphertext + GCM tag (last 16 bytes)
  const raw = Buffer.from(encryptedData, 'base64');
  const nonce = raw.subarray(0, 12);
  const tag = raw.subarray(raw.length - 16);
  const ciphertext = raw.subarray(12, raw.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, nonce);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return JSON.parse(plaintext.toString('utf-8'));
}

async function loadFromFile(): Promise<boolean> {
  const configPath = getConfigFilePath();

  if (!fs.existsSync(configPath)) {
    return false;
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw);
    applyConfig(config);
    logger.info('Managed config loaded from file', { path: configPath });
    return true;
  } catch (e) {
    logger.error('Failed to load config file', { error: (e as Error).message });
    return false;
  }
}

async function loadFromRemote(): Promise<boolean> {
  try {
    const { net } = await import('electron');

    const res = await net.fetch(HAIPER_CONFIG_URL, {
      method: 'GET',
      headers: { 'X-App-Token': APP_TOKEN },
    });

    if (!res.ok) {
      logger.warn('Remote config fetch failed', { status: res.status });
      return false;
    }

    const body = await res.json() as { key?: string; data?: string };

    if (!body.key || !body.data) {
      logger.warn('Remote config response missing key/data fields');
      return false;
    }

    const config = decryptConfig(body.key, body.data);
    applyConfig(config);
    logger.info('Managed config loaded from remote');
    return true;
  } catch (e) {
    logger.error('Failed to load remote config', { error: (e as Error).message });
    return false;
  }
}

export async function loadManagedConfig(): Promise<ConfigSource> {
  // Priority 1: local config file (IT-managed)
  if (await loadFromFile()) return 'file';

  // Priority 2: remote config from hAIper
  if (await loadFromRemote()) return 'remote';

  // Neither worked
  logger.warn('No managed config available, running unconfigured');
  return 'none';
}
