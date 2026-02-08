/**
 * AI Agent SDK - Main exports
 * 
 * A state-based AI agent that works in both Node.js and browser environments
 * with support for multiple LLM providers and pluggable storage adapters.
 */

// Main Agent class
export { Agent } from './orchestrator/agent';

// Storage Adapters
export {
  InMemoryAdapter,
  LocalStorageAdapter,
  NodeFSAdapter,
  type IStorageAdapter
} from './adapters';

// LLM Providers
export {
  OpenAIProvider,
  AnthropicProvider,
  type ILLMProvider,
  type LLMProviderConfig
} from './llm';

// State Management
export {
  StateManager,
  VirtualFileSystem,
  Differ
} from './state';

// Validators
export {
  PolicyGate,
  validateSchema,
  parseOrDefault,
  // Schemas
  VirtualFileSchema,
  MessageSchema,
  IntentResultSchema,
  ActionPlanSchema,
  ExecutionResultSchema,
  ValidationResultSchema,
  FileChangeSchema,
  AgentStateSchema
} from './validators';

// Event System
export { EventEmitter } from './events';

// Logger
export { Logger, createChildLogger, type LogLevel } from './utils/logger';

// Templates
export { getReactMUIViteTemplate } from './templates';

// Types
export type {
  // Core State Types
  VirtualFile,
  FileState,
  FileDiff,
  FileChange,
  Message,
  Phase,
  PhaseResult,
  AgentState,
  StateSnapshot,

  // Phase Types
  IntentType,
  IntentResult,
  Action,
  ActionPlan,
  ExecutionResult,
  ValidationResult,
  PhaseContext,

  // Provider Types
  LLMMessage,
  ToolDefinition,
  ToolCall,
  LLMRequest,
  LLMResponse,
  LLMChunk,

  // Agent Types
  AgentOptions,
  AgentResponse,
  PolicyConfig,
  LoggerConfig,
  AgentEvent,
  EventHandler
} from './types';

// Version
export const VERSION = '2.0.0';
