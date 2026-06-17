// Host-facing facade that makes a runtime-discovered (sandboxed community) AI
// provider look like a normal first-party provider. Each BaseAIProvider method
// forwards to a generic `invoke(op, input)` supplied by the external-contribution
// source — so the ai module needs no marketplace/plugin_runtime import.

import BaseAIProvider from './base.provider';
import type {
  ChatCompletionOptions, ChatCompletionResponse, EmbeddingOptions, EmbeddingResponse, ProviderConfig,
} from '../ai.types';
import { AIError } from '../ai.types';

export class IsolatedAIProvider extends BaseAIProvider {
  readonly providerType: string;
  private readonly models: string[];
  private readonly configured: boolean;
  private readonly invoke: (op: string, input: unknown) => Promise<unknown>;

  constructor(args: { key: string; models: string[]; configured: boolean; invoke: (op: string, input: unknown) => Promise<unknown> }) {
    super({ apiKey: '(sandboxed)', defaultModel: args.models[0] } as ProviderConfig);
    this.providerType = args.key;
    this.models = args.models;
    this.configured = args.configured;
    this.invoke = args.invoke;
  }

  private async op<T>(op: string, input: unknown): Promise<T> {
    try {
      return (await this.invoke(op, input)) as T;
    } catch (e: any) {
      throw new AIError(e?.message ?? `sandboxed provider op '${op}' failed`, this.providerType, 'SANDBOX_ERROR');
    }
  }

  isConfigured(): boolean {
    // Credentials live host-side (broker secrets / signed egress); "configured"
    // reflects whether the plugin's declared secrets are actually set.
    return this.configured;
  }

  listModels(): string[] {
    return [...this.models]; // from approved manifest metadata — no round-trip
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    return this.op<ChatCompletionResponse>('chat', options);
  }

  // No isolate streaming in this phase: run a normal completion, emit it once.
  async chatStream(options: ChatCompletionOptions, onChunk: (chunk: string) => void): Promise<ChatCompletionResponse> {
    const res = await this.chat({ ...options, stream: false });
    if (res?.content) onChunk(res.content);
    return res;
  }

  async embed(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    return this.op<EmbeddingResponse>('embed', options);
  }
}
