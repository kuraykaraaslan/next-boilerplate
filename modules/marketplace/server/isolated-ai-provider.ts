// Host-facing facade that makes a sandboxed community plugin look like a normal
// first-party AI provider. Each BaseAIProvider method forwards a provider op
// (ai:provider#<op>) to the plugin-host, which runs it in the isolate. The host
// (AIProviderService) never knows the difference.

import BaseAIProvider from '@kuraykaraaslan/ai/server/providers/base.provider';
import type {
  ChatCompletionOptions, ChatCompletionResponse, EmbeddingOptions, EmbeddingResponse, ProviderConfig,
} from '@kuraykaraaslan/ai/server/ai.types';
import { AIError } from '@kuraykaraaslan/ai/server/ai.types';
import { runOnHost } from '@kuraykaraaslan/plugin_runtime/server/rpc/host-client';
import type { SandboxConfig } from '@kuraykaraaslan/plugin_runtime/server/rpc/protocol';

export class IsolatedAIProvider extends BaseAIProvider {
  readonly providerType: string;
  private readonly models: string[];
  private readonly tenantId: string;
  private readonly sandbox: SandboxConfig;
  private readonly getBundle: () => Promise<string>;

  constructor(args: { tenantId: string; key: string; models: string[]; sandbox: SandboxConfig; getBundle: () => Promise<string> }) {
    super({ apiKey: '(sandboxed)', defaultModel: args.models[0] } as ProviderConfig);
    this.providerType = args.key;
    this.models = args.models;
    this.tenantId = args.tenantId;
    this.sandbox = args.sandbox;
    this.getBundle = args.getBundle;
  }

  private async op<T>(op: string, input: unknown): Promise<T> {
    try {
      const resultJson = await runOnHost({
        tenantId: this.tenantId,
        sandbox: this.sandbox,
        kind: 'provider',
        target: `ai:provider#${op}`,
        payloadJson: JSON.stringify(input ?? {}),
        getBundle: this.getBundle,
      });
      return JSON.parse(resultJson) as T;
    } catch (e: any) {
      throw new AIError(e?.message ?? `sandboxed provider op '${op}' failed`, this.providerType, 'SANDBOX_ERROR');
    }
  }

  isConfigured(): boolean {
    return true; // credentials live host-side (broker secrets / signed egress)
  }

  listModels(): string[] {
    return [...this.models]; // from the approved manifest metadata — no round-trip
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
