/**
 * Planning phase - Create action plan
 */

import type { ILLMProvider } from '../../types/providers';
import type { ActionPlan, IntentResult, PhaseContext } from '../../types/phases';
import type { EventEmitter } from '../../events/emitter';
import { ActionPlanSchema, validateSchema } from '../../validators/schemas';
import { PolicyGate } from '../../validators/policy-gate';
import { ContextBuilder } from '../context';
import { PLANNING_SYSTEM_PROMPT, buildPlanningUserPrompt } from '../../llm/prompts';
import { Logger, createChildLogger } from '../../utils/logger';
import { BasePhase } from './base.phase';

export class PlanPhase extends BasePhase {
  constructor(
    llmProvider: ILLMProvider,
    private policyGate: PolicyGate,
    parentLogger: Logger,
    eventEmitter: EventEmitter
  ) {
    const logger = createChildLogger(parentLogger, 'PlanPhase');
    super(llmProvider, logger, eventEmitter);
  }

  async createPlan(intent: IntentResult, context: PhaseContext): Promise<ActionPlan> {
    try {
      // Emit plan start event
      this.eventEmitter.emit('plan:start', { intent });

      this.logger.debug('Creating action plan', { intentType: intent.type });

      // Build context for LLM
      const filesContext = ContextBuilder.buildFilesContext(context.files);
      const packageDependencies = ContextBuilder.buildPackageDependenciesContext(context.files);
      const dependencyGraph = ContextBuilder.buildDependencyGraphContext(context.files);
      const userPrompt = buildPlanningUserPrompt(intent, filesContext, packageDependencies, dependencyGraph);

      this.logger.debug('Calling LLM for plan generation');

      const responseContent = await this.callLLM({
        systemPrompt: PLANNING_SYSTEM_PROMPT,
        messages: [{ role: 'user' as const, content: userPrompt }]
      }, 'planning');

      this.logger.debug('LLM response received', { contentLength: responseContent.length });

      // Parse and validate response
      const plan = this.parsePlanResponse(responseContent);

      this.logger.info('Plan created', {
        actionsCount: plan.actions.length,
        estimatedChanges: plan.estimatedChanges,
        requiresConfirmation: plan.requiresConfirmation,
      });
      this.logger.debug('Plan actions', {
        actions: plan.actions.map(a => ({ id: a.id, type: a.type, path: a.path })),
      });

      // Validate against policies
      this.logger.debug('Validating plan against policies');
      const policyResult = this.policyGate.validatePlan(plan);
      if (!policyResult.allowed) {
        this.logger.error('Policy violation detected', { reason: policyResult.reason });
        throw new Error(`Policy violation: ${policyResult.reason}`);
      }

      this.logger.info('Plan validated successfully');

      // Emit plan complete event
      this.eventEmitter.emit('plan:complete', { plan });

      return plan;
    } catch (error: any) {
      this.logger.error('Planning failed', { error: error.message });
      throw new Error(`Planning failed: ${error.message}`);
    }
  }

  private parsePlanResponse(content: string): ActionPlan {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || '').trim() : content.trim();

      const parsed = JSON.parse(jsonStr);

      // Validate with schema
      const result = validateSchema(ActionPlanSchema, parsed);

      if (!result.success) {
        throw new Error(`Invalid plan format: ${result.error}`);
      }

      return result.data;
    } catch (error: any) {
      throw new Error(`Failed to parse plan: ${error.message}`);
    }
  }
}
