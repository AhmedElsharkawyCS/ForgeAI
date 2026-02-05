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
    const content = await this.generateFileContent(action, context);

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
    const content = await this.generateFileContent(action, context, existingFile.content);

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

  private async generateFileContent(
    action: Action,
    context: PhaseContext,
    existingContent?: string // only used for update actions
  ): Promise<string> {
    this.logger.debug('Generating file content with LLM', {
      path: action.path,
      hasExistingContent: !!existingContent,
      messageCount: context.messages.length,
    });

    // Get relevant files for context based on action type
    const relevantFiles = this.getRelevantFiles(action, context.files);

    // Build conversation summary
    const conversationSummary = ContextBuilder.buildMessagesContext(context.messages);

    // Build file context
    const fileContext = this.buildFileContext(relevantFiles);

    // Build user prompt with pre-built contexts
    const userPrompt = buildExecutionUserPrompt(action, {
      existingContent,
      conversationSummary,
      fileContext,
    });

    this.logger.debug('Calling LLM for content generation', {
      hasConversationSummary: !!conversationSummary,
      hasFileContext: !!fileContext,
      relevantFilesCount: relevantFiles.length,
    });

    const responseContent = await this.callLLM({
      systemPrompt: EXECUTION_SYSTEM_PROMPT,
      messages: [{ role: 'user' as const, content: userPrompt }]
    }, 'executing');

    this.logger.debug('LLM generated content', {
      contentLength: responseContent.length,
    });

    // Extract code from response
    return this.extractCode(responseContent, action.path);
  }

  private extractCode(content: string, _filename: string): string {
    // Try to extract code from markdown code blocks
    const codeBlockMatch = content.match(/```[\w]*\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1]?.trim() || content.trim();
    }

    // If no code block, return the whole content trimmed
    return content.trim();
  }

  /**
   * Build formatted file context from relevant files
   * @param relevantFiles - Array of files to include in context
   * @param maxLines - Maximum lines per file (default: 50)
   * @returns Formatted markdown string with file contents, or undefined if no files
   */
  private buildFileContext(relevantFiles: VirtualFile[], maxLines: number = 50): string | undefined {
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
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'java': 'java',
      'rs': 'rust',
      'go': 'go'
    };
    return ext ? languageMap[ext] : undefined;
  }

  /**
   * Get relevant files for context based on action type
   */
  private getRelevantFiles(action: Action, files: VirtualFile[]): VirtualFile[] {
    const relatedFiles = action.params?.relatedFiles as string[] || [];

    if (relatedFiles.length > 0) {
      return ContextBuilder.extractRelevantFiles(files, relatedFiles);
    }

    switch (action.type) {
      case 'create_file':
      case 'update_file':
        return files.slice(0, 5);
      case 'delete_file':
      case 'read_file':
        return [];
      default:
        return files.slice(0, 5);
    }
  }
}
