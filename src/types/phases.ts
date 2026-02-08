/**
 * Phase-specific types for agent orchestration
 */

import type { VirtualFile, Message } from './state';

export type IntentType = 'create' | 'edit' | 'delete' | 'query' | 'refactor' | 'analyze';

export interface IntentResult {
  type: IntentType;
  confidence: number;
  targetFiles: string[];
  reasoning: string;
  metadata?: Record<string, unknown>;
}

export interface Action {
  id: string;
  type: 'create_file' | 'update_file' | 'delete_file' | 'read_file';
  path: string;
  description: string;
  relatedFiles?: string[]; // Files related through imports/dependencies (populated by plan phase using dependency graph)
}

export interface ActionPlan {
  actions: Action[];
  estimatedChanges: number;
  requiresConfirmation: boolean;
  reasoning: string;
  dependencies?: Record<string, string[]>;
}

export interface ExecutionResult {
  success: boolean;
  filesChanged: string[];
  errors?: string[];
  metadata?: Record<string, unknown>;
}

export interface ValidationResult {
  isValid: boolean;
  summary: string; // Markdown-formatted summary of changes (4 sections: Overview, Files Modified, Key Changes, What's Done Well)
  errors: string[]; // Simple error messages (only for intent mismatches or incomplete execution)
}

export interface PhaseContext {
  files: VirtualFile[];
  messages: Message[];
  intent?: IntentResult;
  plan?: ActionPlan;
  execution?: ExecutionResult;
}
