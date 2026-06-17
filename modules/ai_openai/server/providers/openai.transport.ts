import Logger from '@kuraykaraaslan/logger';
import type {
  ChatCompletionOptions, ChatCompletionResponse, EmbeddingOptions, EmbeddingResponse,
} from '@kuraykaraaslan/ai/server/ai.types';
import { AIError } from '@kuraykaraaslan/ai/server/ai.types';
import {
  buildOpenAIMessages, handleOpenAIError,
  type OpenAICtx, type OpenAIChatResponse, type OpenAIEmbeddingResponse,
} from './openai.helpers';

export async function runChat(ctx: OpenAICtx, options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
  const model = options.model || ctx.defaultModel || 'gpt-4o-mini';
  const messages = buildOpenAIMessages(options);

  try {
    const response = await fetch(`${ctx.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? ctx.maxTokens,
        top_p: options.topP ?? 1,
      }),
    });

    if (!response.ok) {
      await handleOpenAIError(response);
    }

    const data: OpenAIChatResponse = await response.json();

    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      provider: 'openai',
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      finishReason: data.choices[0]?.finish_reason,
    };
  } catch (error) {
    if (error instanceof AIError) throw error;
    Logger.error(`OpenAI chat error: ${error}`);
    throw new AIError(`OpenAI request failed: ${error}`, 'openai');
  }
}

export async function runChatStream(
  ctx: OpenAICtx,
  options: ChatCompletionOptions,
  onChunk: (chunk: string) => void,
): Promise<ChatCompletionResponse> {
  const model = options.model || ctx.defaultModel || 'gpt-4o-mini';
  const messages = buildOpenAIMessages(options);

  try {
    const response = await fetch(`${ctx.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? ctx.maxTokens,
        top_p: options.topP ?? 1,
        stream: true,
      }),
    });

    if (!response.ok) {
      await handleOpenAIError(response);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new AIError('No response body', 'openai');
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
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) {
            fullContent += content;
            onChunk(content);
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }

    return { content: fullContent, model, provider: 'openai' };
  } catch (error) {
    if (error instanceof AIError) throw error;
    Logger.error(`OpenAI stream error: ${error}`);
    throw new AIError(`OpenAI stream failed: ${error}`, 'openai');
  }
}

export async function runEmbed(ctx: OpenAICtx, options: EmbeddingOptions): Promise<EmbeddingResponse> {
  const model = options.model || 'text-embedding-3-small';

  try {
    const response = await fetch(`${ctx.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: options.input,
      }),
    });

    if (!response.ok) {
      await handleOpenAIError(response);
    }

    const data: OpenAIEmbeddingResponse = await response.json();

    return {
      embeddings: data.data.map((d) => d.embedding),
      model: data.model,
      provider: 'openai',
      usage: {
        totalTokens: data.usage.total_tokens,
      },
    };
  } catch (error) {
    if (error instanceof AIError) throw error;
    Logger.error(`OpenAI embedding error: ${error}`);
    throw new AIError(`OpenAI embedding failed: ${error}`, 'openai');
  }
}
