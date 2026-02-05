/**
 * Centralized type exports
 */

export * from './state';
export * from './phases';
export * from './providers';

// Additional common types
export interface AgentOptions {
  adapter: IStorageAdapter;
  provider: ILLMProvider;
  initialFiles?: VirtualFile[];
  policies?: PolicyConfig;
  autoSave?: boolean;
  logger?: LoggerConfig;
}

export interface LoggerConfig {
  level: 'info' | 'debug' | 'error' | 'all' | 'none';
  prefix?: string;
  timestamp?: boolean;
  colors?: boolean;
}

export interface AgentResponse {
  content: string;
  filesChanged: string[];
  phase: Phase;
  success: boolean;
  query: string
}

export interface PolicyConfig {
  maxFileSize?: number;
  allowedFileTypes?: string[];
  maxConcurrentActions?: number;
  requireConfirmation?: boolean;
}

export type AgentEvent =
  | 'file:create'
  | 'file:update'
  | 'file:delete'
  | 'message:add'
  | 'error'
  // Intent phase events
  | 'intent:start'
  | 'intent:complete'
  // Plan phase events
  | 'plan:start'
  | 'plan:complete'
  // Execute phase events
  | 'execute:start'
  | 'execute:complete'
  // Validate phase events
  | 'validate:start'
  | 'validate:complete'
  // Action lifecycle events
  | 'action:start'
  | 'action:complete'
  | 'action:failed'
  // Non-streaming LLM events
  | 'llm:start'
  | 'llm:complete'
  // Streaming LLM events
  | 'stream:start'
  | 'stream:chunk'
  | 'stream:complete';

export type EventHandler<T = unknown> = (data: T) => void;

// Import types for re-export
import type { ILLMProvider } from './providers';
import type { VirtualFile, Phase } from './state';
import type { IStorageAdapter } from '../adapters/adapter.interface';
