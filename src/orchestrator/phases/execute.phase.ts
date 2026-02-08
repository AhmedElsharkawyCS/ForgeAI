/**
 * Execution phase - Execute action plan
 */

import type { ILLMProvider } from '../../types/providers';
import type { ActionPlan, ExecutionResult, PhaseContext, Action } from '../../types/phases';
import type { FileChange, VirtualFile } from '../../types/state';
import type { EventEmitter } from '../../events/emitter';
import { ContextBuilder } from '../context';
import { EXECUTION_SYSTEM_PROMPT, buildExecutionUserPrompt } from '../../llm/prompts';
import { PolicyGate } from '../../validators/policy-gate';
import { Logger, createChildLogger } from '../../utils/logger';
import { BasePhase } from './base.phase';

interface ExtractedCode {
  code: string;
  language?: string;
  actionType?: string;
  path?: string;
}

export class ExecutePhase extends BasePhase {
  constructor(
    llmProvider: ILLMProvider,
    private policyGate: PolicyGate,
    parentLogger: Logger,
    eventEmitter: EventEmitter
  ) {
    const logger = createChildLogger(parentLogger, 'ExecutePhase');
    super(llmProvider, logger, eventEmitter);
  }

  async execute(
    plan: ActionPlan,
    context: PhaseContext,
    onFileChange?: (changes: FileChange[]) => Promise<void>
  ): Promise<ExecutionResult> {
    const filesChanged: string[] = [];
    const errors: string[] = [];

    // Emit execute start event
    this.eventEmitter.emit('execute:start', { plan });

    try {
      this.logger.info('Executing action plan', { actionsCount: plan.actions.length });

      // Execute actions sequentially
      for (const action of plan.actions) {
        try {
          this.logger.info(`→ Executing action: ${action.id}`, {
            type: action.type,
            path: action.path,
            description: action.description,
          });

          // Emit action start event
          this.eventEmitter.emit('action:start', { action });

          const changes = await this.executeAction(action, context);

          this.logger.debug('Action generated changes', {
            actionId: action.id,
            changesCount: changes.length,
          });

          // Validate changes against policies
          const policyResult = this.policyGate.validateFileChanges(changes);
          if (!policyResult.allowed) {
            const errorMsg = `Policy violation for ${action.path}: ${policyResult.reason}`;
            this.logger.error(errorMsg);
            errors.push(errorMsg);

            // Emit action failed event for policy violation
            this.eventEmitter.emit('action:failed', { action, error: errorMsg });
            continue;
          }

          // Apply changes if callback provided
          if (onFileChange) {
            await onFileChange(changes);
          }

          // Track changed files
          for (const change of changes) {
            if (!filesChanged.includes(change.path)) {
              filesChanged.push(change.path);
            }
          }

          this.logger.info(`✓ Action completed: ${action.id}`, {
            changedFiles: changes.map(c => c.path),
          });

          // Emit action complete event
          this.eventEmitter.emit('action:complete', { action });
        } catch (error: any) {
          const errorMsg = `Action ${action.id} failed: ${error.message}`;
          this.logger.error(errorMsg, { error });
          errors.push(errorMsg);

          // Emit action failed event
          this.eventEmitter.emit('action:failed', { action, error: errorMsg });
        }
      }

      this.logger.info('Execution phase complete', {
        totalFiles: filesChanged.length,
        errors: errors.length,
      });

      const result = {
        success: errors.length === 0,
        filesChanged,
        errors: errors.length > 0 ? errors : undefined
      };

      // Emit execute complete event
      this.eventEmitter.emit('execute:complete', result);

      return result;
    } catch (error: any) {
      this.logger.error('Execution phase failed', { error: error.message });
      return {
        success: false,
        filesChanged,
        errors: [error.message]
      };
    }
  }

  private async executeAction(action: Action, context: PhaseContext): Promise<FileChange[]> {
    this.logger.debug(`Executing ${action.type} for ${action.path}`);

    switch (action.type) {
      case 'create_file':
        return await this.executeCreateFile(action, context);

      case 'update_file':
        return await this.executeUpdateFile(action, context);

      case 'delete_file':
        return this.executeDeleteFile(action);

      case 'read_file':
        // Read is a no-op for state changes
        this.logger.debug(`Read file operation (no-op): ${action.path}`);
        return [];

      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }

  private async executeCreateFile(action: Action, context: PhaseContext): Promise<FileChange[]> {
    // Check if file already exists
    const exists = context.files.some(f => f.path === action.path);
    if (exists) {
      throw new Error(`File already exists: ${action.path}`);
    }

    // Generate file content using LLM
    const content = await this.generateCreateFileContent(action, context);

    return [{
      type: 'create',
      path: action.path,
      content,
      language: this.inferLanguage(action.path)
    }];
  }

  private async executeUpdateFile(action: Action, context: PhaseContext): Promise<FileChange[]> {
    // Find existing file
    const existingFile = context.files.find(f => f.path === action.path);
    if (!existingFile) {
      throw new Error(`File not found: ${action.path}`);
    }

    // Generate updated content using LLM
    const content = await this.generateUpdateFileContent(action, context, existingFile.content);

    return [{
      type: 'update',
      path: action.path,
      content,
      language: existingFile.language
    }];
  }

  private executeDeleteFile(action: Action): FileChange[] {
    return [{
      type: 'delete',
      path: action.path
    }];
  }

  /**
   * Generate content for creating a new file
   */
  private async generateCreateFileContent(
    action: Action,
    context: PhaseContext
  ): Promise<string> {
    this.logger.debug('Generating new file content with LLM', {
      path: action.path,
      messageCount: context.messages.length,
    });

    // Get relevant files for context based on action type
    const relevantFiles = this.getRelevantFiles(action, context.files);

    // Build conversation summary
    const conversationSummary = ContextBuilder.buildMessagesContext(context.messages);

    // Build file context
    const fileContext = this.buildFileContext(relevantFiles, "all");

    // Build package dependencies and dependency graph
    const packageDependencies = ContextBuilder.buildPackageDependenciesContext(context.files);
    const dependencyGraph = ContextBuilder.buildDependencyGraphContext(context.files);

    // Build user prompt for creating new file (no existing content)
    const userPrompt = buildExecutionUserPrompt(action, {
      conversationSummary,
      fileContext,
      packageDependencies,
      dependencyGraph,
    });

    this.logger.debug('Calling LLM for new file content generation', {
      hasConversationSummary: !!conversationSummary,
      hasFileContext: !!fileContext,
      relevantFilesCount: relevantFiles.length,
    });

    const responseContent = await this.callLLM({
      systemPrompt: EXECUTION_SYSTEM_PROMPT,
      messages: [{ role: 'user' as const, content: userPrompt }]
    }, 'executing');

    this.logger.debug('LLM generated new file content', {
      contentLength: responseContent.length,
    });

    // Extract code from response
    const extracted = this.extractCode(responseContent);

    this.logger.debug('Extracted code metadata', {
      language: extracted.language,
      actionType: extracted.actionType,
      path: extracted.path,
    });

    return extracted.code;
  }

  /**
   * Generate content for updating an existing file
   */
  private async generateUpdateFileContent(
    action: Action,
    context: PhaseContext,
    existingContent: string
  ): Promise<string> {
    this.logger.debug('Generating updated file content with LLM', {
      path: action.path,
      existingContentLength: existingContent.length,
      messageCount: context.messages.length,
    });

    // Get relevant files for context based on action type
    const relevantFiles = this.getRelevantFiles(action, context.files);

    // Build conversation summary
    const conversationSummary = ContextBuilder.buildMessagesContext(context.messages);

    // Build file context
    const fileContext = this.buildFileContext(relevantFiles, "all");

    // Build package dependencies and dependency graph
    const packageDependencies = ContextBuilder.buildPackageDependenciesContext(context.files);
    const dependencyGraph = ContextBuilder.buildDependencyGraphContext(context.files);

    // Build user prompt for updating file (includes existing content)
    const userPrompt = buildExecutionUserPrompt(action, {
      existingContent,
      conversationSummary,
      fileContext,
      packageDependencies,
      dependencyGraph,
    });

    this.logger.debug('Calling LLM for file update content generation', {
      hasConversationSummary: !!conversationSummary,
      hasFileContext: !!fileContext,
      relevantFilesCount: relevantFiles.length,
      existingContentLength: existingContent.length,
    });

    const responseContent = await this.callLLM({
      systemPrompt: EXECUTION_SYSTEM_PROMPT,
      messages: [{ role: 'user' as const, content: userPrompt }]
    }, 'executing');

    this.logger.debug('LLM generated updated file content', {
      contentLength: responseContent.length,
      contentChanged: responseContent.length !== existingContent.length,
    });

    // Extract code from response
    const extracted = this.extractCode(responseContent);

    this.logger.debug('Extracted code metadata', {
      language: extracted.language,
      actionType: extracted.actionType,
      path: extracted.path,
    });

    return extracted.code;
  }

  /**
   * Extract code from LLM response
   * Only accepts structured code_snippet tags with metadata
   * Returns an object with all metadata plus the code
   */
  private extractCode(content: string): ExtractedCode {
    // Extract code from structured code_snippet tag
    const snippetMatch = content.match(
      /<code_snippet\s+language="([^"]+)"\s+action_type="([^"]+)"\s+path="([^"]+)"\s*>([\s\S]*?)<\/code_snippet>/
    );

    if (snippetMatch) {
      const [, language, actionType, path, code] = snippetMatch;

      this.logger.debug('Extracted code from structured tag', {
        language,
        actionType,
        path,
        codeLength: code?.trim().length || 0,
      });

      return {
        code: code?.trim() || '',
        language,
        actionType,
        path,
      };
    }

    // No structured format found - return raw content with error
    this.logger.error('No structured code_snippet tag found in LLM response');
    return {
      code: content.trim(),
    };
  }

  /**
   * Build formatted file context from relevant files
   * @param relevantFiles - Array of files to include in context
   * @param maxLines - Maximum lines per file (default: 50)
   * @returns Formatted markdown string with file contents, or undefined if no files
   */
  private buildFileContext(relevantFiles: VirtualFile[], maxLines: number | 'all' = 50): string | undefined {
    if (relevantFiles.length === 0) {
      return undefined;
    }

    return relevantFiles.map(file => {
      const content = ContextBuilder.buildFileContent(file, maxLines);
      return `**${file.path}** (${file.language || 'unknown'})\n\`\`\`${file.language || ''}\n${content}\n\`\`\``;
    }).join('\n\n');
  }

  private inferLanguage(path: string): string | undefined {
    const ext = path.split('.').pop()?.toLowerCase();
    // Only web development languages (Vite + React + TypeScript stack)
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'json': 'json',
      'html': 'html',
      'md': 'markdown'
    };
    return ext ? languageMap[ext] : undefined;
  }

  /**
   * Get relevant files for context based on action.relatedFiles
   * The plan phase populates relatedFiles using the dependency graph
   */
  private getRelevantFiles(action: Action, files: VirtualFile[]): VirtualFile[] {
    // Use relatedFiles from action (populated by plan phase using dependency graph)
    if (action.relatedFiles && action.relatedFiles.length > 0) {
      this.logger.debug('Using relatedFiles from action', {
        actionId: action.id,
        relatedFilesCount: action.relatedFiles.length,
      });
      return ContextBuilder.extractRelevantFiles(files, action.relatedFiles);
    }

    // No related files specified - return empty array
    // The plan phase should have populated relatedFiles using the dependency graph
    this.logger.debug('No relatedFiles in action, returning empty context', {
      actionId: action.id,
      actionType: action.type,
    });
    return [];
  }
}
