import type {
  ChatCompletionOptions,
  ChatCompletionResponse,
  EmbeddingOptions,
  EmbeddingResponse,
  AIProviderType,
  ProviderConfig,
} from '../ai.types';

export default abstract class BaseAIProvider {
  abstract readonly providerType: AIProviderType;
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  abstract chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse>;

  abstract chatStream(
    options: ChatCompletionOptions,
    onChunk: (chunk: string) => void
  ): Promise<ChatCompletionResponse>;

  abstract embed(options: EmbeddingOptions): Promise<EmbeddingResponse>;

  abstract listModels(): string[];

  abstract isConfigured(): boolean;

  getDefaultModel(): string | undefined {
    return this.config.defaultModel;
  }

  getMaxTokens(): number {
    return this.config.maxTokens || 4096;
  }
}
