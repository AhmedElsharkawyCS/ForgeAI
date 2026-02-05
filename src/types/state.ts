/**
 * Core state management types for the AI Agent
 */

export interface VirtualFile {
  path: string;
  content: string;
  language?: string;
  metadata?: Record<string, unknown>;
  version: number;
  lastModified: number;
}

export interface FileDiff {
  type: 'create' | 'update' | 'delete';
  path: string;
  oldContent?: string;
  newContent?: string;
  patch?: string;
}

export interface FileChange {
  type: 'create' | 'update' | 'delete';
  path: string;
  content?: string;
  language?: string;
}

export interface FileState {
  files: Map<string, VirtualFile>;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export type Phase = 'idle' | 'intent' | 'planning' | 'executing' | 'validating' | 'completed' | 'error'

export interface PhaseResult {
  phase: Phase;
  success: boolean;
  timestamp: number;
  data?: unknown;
  error?: string;
}

export interface AgentState {
  files: FileState;
  messages: Message[];
  currentPhase: Phase;
  history: PhaseResult[];
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface StateSnapshot {
  state: AgentState;
  version: number;
  timestamp: number;
}
