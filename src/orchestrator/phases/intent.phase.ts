/**
 * Intent phase - Classify user intent
 */

import type { ILLMProvider } from '../../types/providers';
import type { IntentResult, PhaseContext } from '../../types/phases';
import type { EventEmitter } from '../../events/emitter';
import { IntentResultSchema, validateSchema } from '../../validators/schemas';
import { ContextBuilder } from '../context';
import { INTENT_SYSTEM_PROMPT, buildIntentUserPrompt } from '../../llm/prompts';
import { Logger, createChildLogger } from '../../utils/logger';
import { BasePhase } from './base.phase';

export class IntentPhase extends BasePhase {
  constructor(
    llmProvider: ILLMProvider,
    parentLogger: Logger,
    eventEmitter: EventEmitter
  ) {
    const logger = createChildLogger(parentLogger, 'IntentPhase');
    super(llmProvider, logger, eventEmitter);
  }

  async analyze(userMessage: string, context: PhaseContext): Promise<IntentResult> {
    try {
      // Emit intent start event
      this.eventEmitter.emit('intent:start', { query: userMessage });

      this.logger.debug('Analyzing user intent', { messageLength: userMessage.length });

      // Build context for LLM
      const filesContext = ContextBuilder.buildFilesContext(context.files);
      const messagesContext = ContextBuilder.buildMessagesContext(context.messages);
      const packageDependencies = ContextBuilder.buildPackageDependenciesContext(context.files);
      const dependencyGraph = ContextBuilder.buildDependencyGraphContext(context.files);

      const userPrompt = buildIntentUserPrompt(
        userMessage,
        filesContext,
        messagesContext,
        packageDependencies,
        dependencyGraph
      );

      this.logger.debug('Calling LLM for intent analysis', {
        filesCount: context.files.length,
        messagesCount: context.messages.length,
      });
      const responseContent = await this.callLLM({
        systemPrompt: INTENT_SYSTEM_PROMPT,
        messages: [{ role: 'user' as const, content: userPrompt }]
      }, 'intent');

      this.logger.debug('LLM response received', {
        contentLength: responseContent.length,
      });

      // Parse and validate response
      const intent = this.parseIntentResponse(responseContent);

      this.logger.info('Intent analyzed', {
        type: intent.type,
        confidence: intent.confidence,
        targetFiles: intent.targetFiles,
      });

      // Emit intent complete event
      this.eventEmitter.emit('intent:complete', intent);
      return intent;
    } catch (error: unknown) {
      this.logger.error('Intent analysis failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw new Error(`Intent analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseIntentResponse(content: string): IntentResult {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || '').trim() : content.trim();

      const parsed = JSON.parse(jsonStr);

      // Validate with schema
      const result = validateSchema(IntentResultSchema, parsed);

      if (!result.success) {
        throw new Error(`Invalid intent format: ${result.error}`);
      }

      return result.data;
    } catch (error: unknown) {
      // Fallback: try to parse without code blocks
      try {
        const parsed = JSON.parse(content);
        const result = validateSchema(IntentResultSchema, parsed);

        if (result.success) {
          return result.data;
        }
      } catch { }

      // If all parsing fails, return a default query intent
      return {
        type: 'query',
        confidence: 0.5,
        targetFiles: [],
        reasoning: `Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
