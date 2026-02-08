/**
 * Zod schemas for type validation
 */

import { z } from 'zod';

// Virtual File Schema
export const VirtualFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  language: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  version: z.number().int().positive(),
  lastModified: z.number().positive()
});

// Message Schema
export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.number().positive(),
  metadata: z.record(z.unknown()).optional()
});

// Phase Schema
export const PhaseSchema = z.enum([
  'idle',
  'intent',
  'planning',
  'executing',
  'validating',
  'completed',
  'error'
]);

// Intent Result Schema
export const IntentResultSchema = z.object({
  type: z.enum(['create', 'edit', 'delete', 'query', 'refactor', 'analyze']),
  confidence: z.number().min(0).max(1),
  targetFiles: z.array(z.string()),
  reasoning: z.string(),
  metadata: z.record(z.unknown()).optional()
});

// Action Schema
export const ActionSchema = z.object({
  id: z.string(),
  type: z.enum(['create_file', 'update_file', 'delete_file', 'read_file']),
  path: z.string().min(1),
  description: z.string(),
  relatedFiles: z.array(z.string()).optional(), // Files related through imports/dependencies
});

// Action Plan Schema
export const ActionPlanSchema = z.object({
  actions: z.array(ActionSchema).min(1),
  estimatedChanges: z.number().int().nonnegative(),
  requiresConfirmation: z.boolean(),
  reasoning: z.string(),
  dependencies: z.record(z.array(z.string())).optional()
});

// Execution Result Schema
export const ExecutionResultSchema = z.object({
  success: z.boolean(),
  filesChanged: z.array(z.string()),
  errors: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional()
});

// Validation Result Schema
export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  summary: z.string(), // Markdown-formatted summary of changes (4 sections only)
  errors: z.array(z.string()) // Simple error messages
});

// File Change Schema
export const FileChangeSchema = z.object({
  type: z.enum(['create', 'update', 'delete']),
  path: z.string().min(1),
  content: z.string().optional(),
  language: z.string().optional()
});

// Phase Result Schema
export const PhaseResultSchema = z.object({
  phase: PhaseSchema,
  success: z.boolean(),
  timestamp: z.number().positive(),
  data: z.unknown().optional(),
  error: z.string().optional()
});

// Agent State Schema
export const AgentStateSchema = z.object({
  files: z.object({
    files: z.instanceof(Map)
  }),
  messages: z.array(MessageSchema),
  currentPhase: PhaseSchema,
  history: z.array(PhaseResultSchema),
  version: z.number().int().positive(),
  createdAt: z.number().positive(),
  updatedAt: z.number().positive()
});

// LLM Request Schema
export const LLMRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })),
  systemPrompt: z.string().optional(),
  tools: z.array(z.any()).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  stream: z.boolean().optional()
});

// LLM Response Schema
export const LLMResponseSchema = z.object({
  content: z.string(),
  toolCalls: z.array(z.object({
    id: z.string(),
    name: z.string(),
    arguments: z.record(z.unknown())
  })).optional(),
  finishReason: z.enum(['stop', 'length', 'tool_calls', 'content_filter']).optional(),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number()
  }).optional()
});

// Policy Config Schema
export const PolicyConfigSchema = z.object({
  maxFileSize: z.number().positive().optional(),
  allowedFileTypes: z.array(z.string()).optional(),
  maxConcurrentActions: z.number().int().positive().optional(),
  requireConfirmation: z.boolean().optional()
});

// Helper function to safely parse and validate
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
      };
    }
    return {
      success: false,
      error: String(error)
    };
  }
}

// Helper for safe parsing with defaults
export function parseOrDefault<T>(schema: z.ZodSchema<T>, data: unknown, defaultValue: T): T {
  const result = validateSchema(schema, data);
  return result.success ? result.data : defaultValue;
}
