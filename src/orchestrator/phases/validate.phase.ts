/**
 * Validation phase - Validate execution results
 */

import type { ILLMProvider } from '../../types/providers';
import type { ValidationResult, ExecutionResult, IntentResult } from '../../types/phases';
import type { EventEmitter } from '../../events/emitter';
import { ValidationResultSchema, validateSchema } from '../../validators/schemas';
import { VALIDATION_SYSTEM_PROMPT, buildValidationUserPrompt } from '../../llm/prompts';
import { Logger, createChildLogger } from '../../utils/logger';
import { BasePhase } from './base.phase';

export class ValidatePhase extends BasePhase {
  constructor(
    llmProvider: ILLMProvider,
    parentLogger: Logger,
    eventEmitter: EventEmitter
  ) {
    const logger = createChildLogger(parentLogger, 'ValidatePhase');
    super(llmProvider, logger, eventEmitter);
  }

  async validate(
    execution: ExecutionResult,
    intent: IntentResult
  ): Promise<ValidationResult> {
    // Emit validate start event
    this.eventEmitter.emit('validate:start', { execution });

    try {
      this.logger.debug('Validating execution results');

      // Prepare context for LLM
      const executionContext = this.buildExecutionContext(execution);
      const intentSummary = JSON.stringify(intent, null, 2);

      const userPrompt = buildValidationUserPrompt(
        executionContext,
        intentSummary,
      );

      this.logger.debug('Calling LLM for validation and summary generation');

      const responseContent = await this.callLLM({
        systemPrompt: VALIDATION_SYSTEM_PROMPT,
        messages: [{ role: 'user' as const, content: userPrompt }]
      }, 'validating');

      this.logger.debug('LLM validation response received', {
        contentLength: responseContent.length,
      });

      // Parse validation result (includes LLM-generated markdown summary)
      const validationResult = this.parseValidationResponse(responseContent);

      this.logger.info('Validation completed', {
        isValid: validationResult.isValid,
        errorsCount: validationResult.errors.length
      });

      // Add execution errors to validation errors
      if (execution.errors && execution.errors.length > 0) {
        this.logger.error('Execution errors found', { errors: execution.errors });

        for (const error of execution.errors) {
          validationResult.errors.push(`Execution error: ${error}`);
        }
        validationResult.isValid = false;

        // Prepend error notice to summary
        validationResult.summary = `## ⚠️ Execution Errors Detected\n\n${execution.errors.map(e => `- ❌ ${e}`).join('\n')}\n\n---\n\n${validationResult.summary}`;
      }

      // Emit validate complete event
      this.eventEmitter.emit('validate:complete', { validationResult });

      return validationResult;
    } catch (error: any) {
      this.logger.error('Validation failed', { error: error.message });

      // Return a failed validation on error
      return {
        isValid: false,
        summary: `## ❌ Validation Failed\n\nAn error occurred during validation: ${error.message}`,
        errors: [`Validation failed: ${error.message}`]
      };
    }
  }

  /**
   * Simple validation without LLM (for quick checks)
   */
  quickValidate(execution: ExecutionResult): ValidationResult {
    const errors: string[] = [];

    // Check if execution was successful
    if (!execution.success) {
      errors.push('Execution phase reported failure');
    }

    // Add execution errors
    if (execution.errors) {
      for (const error of execution.errors) {
        errors.push(`Execution error: ${error}`);
      }
    }

    // Generate a simple markdown summary
    const summary = this.generateQuickSummary(execution, errors);

    return {
      isValid: errors.length === 0,
      summary,
      errors
    };
  }

  private generateQuickSummary(
    execution: ExecutionResult,
    errors: string[]
  ): string {
    const statusText = errors.length === 0 ? 'Completed Successfully' : 'Completed with Errors';

    let summary = `## Changes Summary\n\n`;
    summary += `### 🎯 Overview\n${statusText}\n\n`;

    if (execution.filesChanged.length > 0) {
      summary += `### 📁 Files Modified\n`;
      summary += execution.filesChanged.map(f => `- ✅ \`${f}\``).join('\n');
      summary += '\n\n';
    }

    summary += `### 🔑 Key Changes\n`;
    summary += `- Modified ${execution.filesChanged.length} file(s)\n\n`;

    if (errors.length > 0) {
      summary += `### ❌ Errors Found\n`;
      summary += errors.map(e => `- ${e}`).join('\n');
      summary += '\n\n';
    } else {
      summary += `### ✅ What's Done Well\n`;
      summary += `- All changes applied successfully\n`;
      summary += `- Files updated without errors\n`;
    }

    return summary;
  }

  private buildExecutionContext(execution: ExecutionResult): string {
    const parts: string[] = [];

    parts.push(`Execution Status: ${execution.success ? 'Success' : 'Failed'}`);
    parts.push(`Files Changed: ${execution.filesChanged.length}`);

    if (execution.filesChanged.length > 0) {
      parts.push(`Changed Files:\n${execution.filesChanged.map(f => `- ${f}`).join('\n')}`);
    }

    if (execution.errors && execution.errors.length > 0) {
      parts.push(`Errors:\n${execution.errors.map(e => `- ${e}`).join('\n')}`);
    }

    if (execution.metadata) {
      parts.push(`Metadata: ${JSON.stringify(execution.metadata, null, 2)}`);
    }

    return parts.join('\n\n');
  }

  private parseValidationResponse(content: string): ValidationResult {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || '').trim() : content.trim();

      const parsed = JSON.parse(jsonStr);

      // Validate with schema
      const result = validateSchema(ValidationResultSchema, parsed);

      if (!result.success) {
        throw new Error(`Invalid validation format: ${result.error}`);
      }

      return result.data;
    } catch (error: any) {
      // Fallback validation result with basic summary
      return {
        isValid: false,
        summary: `## ⚠️ Validation Response Parsing Issue\n\nCould not parse the validation response properly.\n\n**Error**: ${error.message}`,
        errors: [`Could not parse validation response: ${error.message}`]
      };
    }
  }
}
