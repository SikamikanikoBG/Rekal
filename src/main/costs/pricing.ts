// Prices per unit as of March 2026 — all costs are estimates based on published pricing

interface STTPricing {
  perMinute: number;
}

interface LLMPricing {
  input: number;   // per 1K tokens
  output: number;  // per 1K tokens
}

type ProviderPricing<T> = Record<string, T>;

export const STT_PRICING: Record<string, ProviderPricing<STTPricing>> = {
  'openai-whisper': {
    'whisper-1': { perMinute: 0.006 },
  },
  'whisper-local': {
    '*': { perMinute: 0 },
  },
  'azure-speech': {
    '*': { perMinute: 0.016 },
  },
};

export const LLM_PRICING: Record<string, ProviderPricing<LLMPricing>> = {
  'openai': {
    'gpt-4o': { input: 0.0025, output: 0.01 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
  },
  'claude': {
    'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
    'claude-haiku-4-5-20251001': { input: 0.0008, output: 0.004 },
  },
  'ollama': {
    '*': { input: 0, output: 0 },
  },
  'azure-openai': {
    '*': { input: 0.0025, output: 0.01 },
  },
};

export function calculateSTTCost(provider: string, model: string, audioSeconds: number): number {
  const providerPricing = STT_PRICING[provider];
  if (!providerPricing) return 0;
  const pricing = providerPricing[model] || providerPricing['*'];
  if (!pricing) return 0;
  const minutes = audioSeconds / 60;
  return minutes * pricing.perMinute;
}

export function calculateLLMCost(provider: string, model: string, inputTokens: number, outputTokens: number): number {
  const providerPricing = LLM_PRICING[provider];
  if (!providerPricing) return 0;
  const pricing = providerPricing[model] || providerPricing['*'];
  if (!pricing) return 0;
  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
}

/** Rough token estimation: ~4 chars per token */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
