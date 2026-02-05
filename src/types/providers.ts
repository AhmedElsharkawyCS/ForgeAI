/**
 * LLM provider interfaces and types
 */

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMRequest {
  messages: LLMMessage[];
  systemPrompt?: string;
  tools?: ToolDefinition[];
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMChunk {
  delta: string;
  isComplete: boolean;
}

export interface ILLMProvider {
  name: string;
  /** Whether streaming is enabled for this provider */
  streamingEnabled: boolean;
  complete(request: LLMRequest): Promise<LLMResponse>;
  stream?(request: LLMRequest): AsyncIterable<LLMChunk>;
}

export interface LLMProviderConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
  organization?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}
