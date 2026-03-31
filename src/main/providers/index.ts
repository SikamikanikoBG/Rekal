import { registry } from './registry';
import { WhisperLocalProvider } from './transcription/whisper-local';
import { OpenAIWhisperProvider } from './transcription/openai-whisper';
import { AzureSpeechProvider } from './transcription/azure-speech';
import { OllamaProvider } from './summarization/ollama';
import { OpenAIProvider } from './summarization/openai';
import { ClaudeProvider } from './summarization/claude';
import { AzureOpenAIProvider } from './summarization/azure-openai';

// Register all providers
registry.registerTranscription(new WhisperLocalProvider());
registry.registerTranscription(new OpenAIWhisperProvider());
registry.registerTranscription(new AzureSpeechProvider());

registry.registerSummarization(new OllamaProvider());
registry.registerSummarization(new OpenAIProvider());
registry.registerSummarization(new ClaudeProvider());
registry.registerSummarization(new AzureOpenAIProvider());

export { registry };
