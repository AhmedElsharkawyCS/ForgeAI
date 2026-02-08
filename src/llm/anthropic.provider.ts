/**
 * Anthropic (Claude) LLM provider implementation
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ILLMProvider,
  LLMRequest,
  LLMResponse,
  LLMChunk,
  LLMProviderConfig
} from '../types/providers';

export class AnthropicProvider implements ILLMProvider {
  readonly name = 'anthropic';
  readonly streamingEnabled: boolean;
  private client: Anthropic;
  private model: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: LLMProviderConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      dangerouslyAllowBrowser: true,
    });
    this.model = config.model || 'claude-sonnet-4-5';
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultMaxTokens = config.maxTokens ?? 8192;
    this.streamingEnabled = config.streaming ?? false; // Default to true for Anthropic
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    try {
      const { system, messages } = this.buildMessages(request);

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.defaultMaxTokens,
        temperature: this.defaultTemperature,
        system,
        messages,
        tools: request.tools ? this.convertTools(request.tools) : undefined
      });

      // Extract text content
      const textContent = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('\n');

      // Extract tool calls
      const toolCalls = response.content
        .filter(block => block.type === 'tool_use')
        .map(block => {
          const toolBlock = block as any;
          return {
            id: toolBlock.id,
            name: toolBlock.name,
            arguments: toolBlock.input
          };
        });

      return {
        content: textContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        finishReason: this.mapStopReason(response.stop_reason),
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        }
      };
    } catch (error: unknown) {
      throw new Error(`Anthropic API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async *stream(request: LLMRequest): AsyncIterable<LLMChunk> {
    try {
      const { system, messages } = this.buildMessages(request);

      const stream = await this.client.messages.create({
        model: this.model,
        max_tokens: this.defaultMaxTokens,
        temperature: this.defaultTemperature,
        system,
        messages,
        stream: true,
        tools: request.tools ? this.convertTools(request.tools) : undefined
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const delta = (event.delta as any).text || '';
          yield {
            delta,
            isComplete: false
          };
        } else if (event.type === 'message_stop') {
          yield {
            delta: '',
            isComplete: true
          };
        }
      }
    } catch (error: unknown) {
      throw new Error(`Anthropic streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildMessages(request: LLMRequest): {
    system?: string;
    messages: Anthropic.MessageParam[];
  } {
    const messages: Anthropic.MessageParam[] = [];

    for (const msg of request.messages) {
      if (msg.role === 'system') {
        // Skip system messages - they'll be handled separately
        continue;
      }

      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      });
    }

    return {
      system: request.systemPrompt,
      messages
    };
  }

  private convertTools(tools: any[]): Anthropic.Tool[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters
    }));
  }

  private mapStopReason(reason: string | null): LLMResponse['finishReason'] {
    switch (reason) {
      case 'end_turn': return 'stop';
      case 'max_tokens': return 'length';
      case 'tool_use': return 'tool_calls';
      case 'stop_sequence': return 'stop';
      default: return 'stop';
    }
  }
}
