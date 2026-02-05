/**
 * OpenAI LLM provider implementation
 */

import OpenAI from 'openai';
import type {
  ILLMProvider,
  LLMRequest,
  LLMResponse,
  LLMChunk,
  LLMProviderConfig
} from '../types/providers';

export class OpenAIProvider implements ILLMProvider {
  readonly name = 'openai';
  readonly streamingEnabled: boolean;
  private client: OpenAI;
  private model: string;
  private defaultTemperature: number;
  private defaultMaxTokens?: number;

  constructor(config: LLMProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      organization: config.organization,
      dangerouslyAllowBrowser: true,
    });
    this.model = config.model || 'gpt-4o';
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultMaxTokens = config.maxTokens;
    this.streamingEnabled = config.streaming ?? false; // Default to true for OpenAI
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    try {
      const messages = this.buildMessages(request);

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: this.defaultTemperature,
        max_tokens: this.defaultMaxTokens,
        tools: request.tools ? this.convertTools(request.tools) : undefined
      });

      const choice = completion.choices[0];
      if (!choice) {
        throw new Error('No completion choice returned from OpenAI');
      }

      const message = choice.message;

      return {
        content: message.content || '',
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens
        } : undefined
      };
    } catch (error: any) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  async *stream(request: LLMRequest): AsyncIterable<LLMChunk> {
    try {
      const messages = this.buildMessages(request);

      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: this.defaultTemperature,
        max_tokens: this.defaultMaxTokens,
        stream: true,
        tools: request.tools ? this.convertTools(request.tools) : undefined
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        const isComplete = chunk.choices[0]?.finish_reason !== null;

        yield {
          delta,
          isComplete
        };
      }
    } catch (error: any) {
      throw new Error(`OpenAI streaming error: ${error.message}`);
    }
  }

  private buildMessages(request: LLMRequest): OpenAI.Chat.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt
      });
    }

    for (const msg of request.messages) {
      messages.push({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      });
    }

    return messages;
  }

  private convertTools(tools: any[]): OpenAI.Chat.ChatCompletionTool[] {
    return tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  private mapFinishReason(reason: string): LLMResponse['finishReason'] {
    switch (reason) {
      case 'stop': return 'stop';
      case 'length': return 'length';
      case 'tool_calls': return 'tool_calls';
      case 'content_filter': return 'content_filter';
      default: return 'stop';
    }
  }
}
