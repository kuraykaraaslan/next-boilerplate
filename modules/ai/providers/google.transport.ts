import Logger from '@/modules/logger';
import type {
  ChatCompletionOptions, ChatCompletionResponse, EmbeddingOptions, EmbeddingResponse,
} from '../ai.types';
import { AIError } from '../ai.types';
import {
  buildGeminiContents, handleGoogleError,
  type GoogleCtx, type GeminiResponse, type GeminiEmbeddingResponse,
} from './google.helpers';

export async function runChat(ctx: GoogleCtx, options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
  const model = options.model || ctx.defaultModel || 'gemini-2.0-flash';
  const { contents, systemInstruction } = buildGeminiContents(options);

  try {
    const response = await fetch(
      `${ctx.baseUrl}/models/${model}:generateContent?key=${ctx.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? ctx.maxTokens,
            topP: options.topP ?? 1,
          },
        }),
      }
    );

    if (!response.ok) {
      await handleGoogleError(response);
    }

    const data: GeminiResponse = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';

    return {
      content,
      model: data.modelVersion || model,
      provider: 'google',
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount,
            completionTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount,
          }
        : undefined,
      finishReason: data.candidates?.[0]?.finishReason,
    };
  } catch (error) {
    if (error instanceof AIError) throw error;
    Logger.error(`Google chat error: ${error}`);
    throw new AIError(`Google request failed: ${error}`, 'google');
  }
}

export async function runChatStream(
  ctx: GoogleCtx,
  options: ChatCompletionOptions,
  onChunk: (chunk: string) => void,
): Promise<ChatCompletionResponse> {
  const model = options.model || ctx.defaultModel || 'gemini-2.0-flash';
  const { contents, systemInstruction } = buildGeminiContents(options);

  try {
    const response = await fetch(
      `${ctx.baseUrl}/models/${model}:streamGenerateContent?key=${ctx.apiKey}&alt=sse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? ctx.maxTokens,
            topP: options.topP ?? 1,
          },
        }),
      }
    );

    if (!response.ok) {
      await handleGoogleError(response);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new AIError('No response body', 'google');
    }

    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) {
            fullContent += text;
            onChunk(text);
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }

    return { content: fullContent, model, provider: 'google' };
  } catch (error) {
    if (error instanceof AIError) throw error;
    Logger.error(`Google stream error: ${error}`);
    throw new AIError(`Google stream failed: ${error}`, 'google');
  }
}

export async function runEmbed(ctx: GoogleCtx, options: EmbeddingOptions): Promise<EmbeddingResponse> {
  const model = options.model || 'text-embedding-004';
  const inputs = Array.isArray(options.input) ? options.input : [options.input];

  try {
    const embeddings: number[][] = [];

    for (const input of inputs) {
      const response = await fetch(
        `${ctx.baseUrl}/models/${model}:embedContent?key=${ctx.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: { parts: [{ text: input }] } }),
        }
      );

      if (!response.ok) {
        await handleGoogleError(response);
      }

      const data: GeminiEmbeddingResponse = await response.json();
      embeddings.push(data.embedding.values);
    }

    return { embeddings, model, provider: 'google' };
  } catch (error) {
    if (error instanceof AIError) throw error;
    Logger.error(`Google embedding error: ${error}`);
    throw new AIError(`Google embedding failed: ${error}`, 'google');
  }
}
