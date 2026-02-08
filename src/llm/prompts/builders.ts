/**
 * User Prompt Builders for Each Phase
 * These functions construct dynamic user prompts with context-specific information
 */

import type { Action, IntentResult } from '../../types';

/**
 * Build user prompt for intent analysis phase
 */
export function buildIntentUserPrompt(
  userMessage: string,
  filesContext: string,
  messagesContext: string,
  packageDependencies: string,
  dependencyGraph: string
): string {
  return `## User Request
The current message from the user that needs intent classification:
"${userMessage}"

## Project Files
Current files in the project (use for determining target paths and detecting existing files):
${filesContext.trim() || '(empty project)'}

## Package Dependencies
${packageDependencies.trim()}

## Dependency Graph
${dependencyGraph.trim()}

## Conversation History
Previous messages for context (helps resolve references like "make it bigger" or "add that feature"):
${messagesContext.trim() || '(no previous messages)'}

Analyze this request and respond with your intent classification in JSON format.`;
}

/**
 * Build user prompt for planning phase
 */
export function buildPlanningUserPrompt(
  intent: IntentResult,
  fileContext: string,
  packageDependencies: string,
  dependencyGraph: string
): string {
  return `## User Intent Analysis
Classified intent from the previous analysis phase:

**Type**: ${intent.type}

**Target Files**: ${intent.targetFiles.length > 0 ? intent.targetFiles.join(', ') : '(none specified)'}

**Confidence**: ${intent.confidence}

**Reasoning**: ${intent.reasoning}

## Project Files
Current files in the project (use for planning file paths and dependencies):
${fileContext.trim() || '(empty project)'}

## Package Dependencies
${packageDependencies.trim()}

## Dependency Graph
${dependencyGraph.trim()}

Create a detailed action plan to fulfill this intent in JSON format.`;
}

/**
 * Build user prompt for execution phase
 */
export function buildExecutionUserPrompt(
  action: Action,
  options: {
    existingContent?: string;
    conversationSummary?: string;
    fileContext?: string;
    packageDependencies: string;
    dependencyGraph: string;
  }
): string {
  const parts: string[] = [];

  // Section 1: Action Details
  parts.push('# Action to Execute\n');
  parts.push(`**Action ID**: ${action.id}`);
  parts.push(`**Type**: ${action.type}`);
  parts.push(`**File Path**: ${action.path}`);
  parts.push(`**Description**: ${action.description}`);

  // Section 2: Existing File Content (if updating)
  if (options.existingContent) {
    parts.push('\n---\n');
    parts.push('# Existing File Content\n');
    parts.push('Update the following file according to the action description:\n');
    parts.push('```');
    parts.push(options.existingContent);
    parts.push('```');
  } else {
    parts.push('\n---\n');
    parts.push('# Task\n');
    parts.push('Create a new file according to the action description.');
  }

  // Section 3: Conversation Context (if provided)
  if (options.conversationSummary) {
    parts.push('\n---\n');
    parts.push('# Conversation History\n');
    parts.push(options.conversationSummary);
  }

  // Section 4: Related Files (if provided)
  if (options.fileContext) {
    parts.push('\n---\n');
    parts.push('# Related Files for Context\n');
    parts.push(options.fileContext);
  }

  // Section 5: Package Dependencies
  parts.push('\n---\n');
  parts.push('# Package Dependencies\n');
  parts.push(options.packageDependencies);

  // Section 6: Dependency Graph
  parts.push('\n---\n');
  parts.push('# Dependency Graph\n');
  parts.push(options.dependencyGraph);

  // Section 7: Output Instructions
  parts.push('\n---\n');
  parts.push('# Instructions\n');
  parts.push('1. Generate the complete file content based on the action description');
  parts.push('2. Follow the tech stack best practices (React, TypeScript, MUI)');
  parts.push('3. Use the conversation history to understand user intent and preferences');
  parts.push('4. Reference related files for consistency in patterns and style');
  parts.push('5. Use the dependency graph to generate correct import statements');
  parts.push('6. Wrap your output in a <code_snippet> tag with language, action_type, and path attributes');
  parts.push('7. Do NOT use markdown code fences (```). ONLY use <code_snippet> tags');
  parts.push('8. Do NOT include explanations or additional text outside the <code_snippet> tag');

  return parts.join('\n');
}

/**
 * Build user prompt for validation phase
 */
export function buildValidationUserPrompt(
  changes: string,
  originalIntent: string,
): string {
  return `Original Intent:
${originalIntent}

Execution Results:
${changes}

Respond in JSON format with the structure specified in your system prompt.`;
}
