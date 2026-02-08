/**
 * Main Agent class - Orchestrates all phases
 */

import type {
  AgentOptions,
  AgentResponse,
  AgentEvent,
  EventHandler
} from '../types';
import type {
  VirtualFile,
  Message,
  FileChange,
  Phase
} from '../types/state';
import type {
  IntentResult,
  ActionPlan,
  ExecutionResult,
  ValidationResult,
  PhaseContext
} from '../types/phases';

import { StateManager } from '../state/state-manager';
import { PolicyGate } from '../validators/policy-gate';
import { EventEmitter } from '../events/emitter';
import { IntentPhase } from './phases/intent.phase';
import { PlanPhase } from './phases/plan.phase';
import { ExecutePhase } from './phases/execute.phase';
import { ValidatePhase } from './phases/validate.phase';
import { Logger } from '../utils/logger';

export class Agent {
  private stateManager: StateManager;
  private policyGate: PolicyGate;
  private eventEmitter: EventEmitter;
  private logger: Logger;

  private intentPhase: IntentPhase;
  private planPhase: PlanPhase;
  private executePhase: ExecutePhase;
  private validatePhase: ValidatePhase;

  private initialized: boolean = false;

  constructor(private options: AgentOptions) {
    // Initialize logger
    this.logger = new Logger(options.logger || { level: 'info' });
    this.logger.info('Initializing AI Agent SDK');

    this.stateManager = new StateManager(
      options.adapter,
      options.autoSave ?? true,
      this.logger
    );

    this.policyGate = new PolicyGate(options.policies);
    this.eventEmitter = new EventEmitter();

    // Initialize phases with logger and event emitter
    this.intentPhase = new IntentPhase(options.provider, this.logger, this.eventEmitter);
    this.planPhase = new PlanPhase(options.provider, this.policyGate, this.logger, this.eventEmitter);
    this.executePhase = new ExecutePhase(options.provider, this.policyGate, this.logger, this.eventEmitter);
    this.validatePhase = new ValidatePhase(options.provider, this.logger, this.eventEmitter);

    this.logger.debug('Agent initialized with configuration', {
      adapter: options.adapter.constructor.name,
      provider: options.provider.name,
      autoSave: options.autoSave ?? true,
      policies: options.policies,
    });
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.debug('Agent already initialized, skipping');
      return;
    }

    this.logger.info('Initializing agent state');
    await this.stateManager.initialize(this.options.initialFiles);
    this.initialized = true;
    this.logger.info('Agent initialization complete', {
      files: this.stateManager.getAllFiles().length,
    });
  }

  /**
   * Send a message to the agent and get a response
   */
  async sendMessage(query: string): Promise<AgentResponse> {
    if (!this.initialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    try {
      // Add user message
      await this.stateManager.addMessage({
        role: 'user',
        content: query
      });

      this.eventEmitter.emit('message:add', { role: 'user', content: query });

      // Execute phases in sequence
      const intent = await this.runIntentPhase(query);
      const plan = await this.runPlanningPhase(intent);
      const execution = await this.runExecutionPhase(plan);
      const validation = await this.runValidationPhase(execution, intent);
      // Generate response
      const responseContent = validation.summary;

      // Add assistant message
      await this.stateManager.addMessage({
        role: 'assistant',
        content: responseContent
      });

      this.eventEmitter.emit('message:add', {
        role: 'assistant',
        content: responseContent
      });

      // Set to completed phase
      await this.setPhase('completed');


      return {
        query,
        content: responseContent,
        filesChanged: execution.filesChanged,
        phase: 'completed',
        success: validation.isValid
      };
    } catch (error: any) {
      await this.setPhase('error');

      this.eventEmitter.emit('error', {
        message: error.message,
        stack: error.stack
      });

      return {
        query,
        content: `Error: ${error.message}`,
        filesChanged: [],
        phase: 'error',
        success: false
      };
    }
  }

  /**
   * Get all files from state
   */
  getFiles(): VirtualFile[] {
    return this.stateManager.getAllFiles();
  }

  /**
   * Get a specific file
   */
  getFile(path: string): VirtualFile | undefined {
    return this.stateManager.getFile(path);
  }

  /**
   * Get all messages
   */
  getMessages(): Message[] {
    return this.stateManager.getMessages();
  }

  /**
   * Get current agent state
   */
  getState() {
    return this.stateManager.getState();
  }

  /**
   * Register an event listener
   */
  on<T = unknown>(event: AgentEvent, handler: EventHandler<T>): () => void {
    return this.eventEmitter.on(event, handler);
  }

  /**
   * Register a one-time event listener
   */
  once<T = unknown>(event: AgentEvent, handler: EventHandler<T>): () => void {
    return this.eventEmitter.once(event, handler);
  }

  /**
   * Remove an event listener
   */
  off<T = unknown>(event: AgentEvent, handler: EventHandler<T>): void {
    this.eventEmitter.off(event, handler);
  }

  /**
   * Clear all state
   */
  async clear(): Promise<void> {
    await this.stateManager.clear();
  }

  /**
   * Destroy the agent and cleanup resources
   */
  async destroy(): Promise<void> {
    this.eventEmitter.removeAllListeners();
    this.initialized = false;
  }

  // Private phase execution methods

  private async runIntentPhase(query: string): Promise<IntentResult> {
    this.logger.info('→ Starting Intent Phase');
    await this.setPhase('intent');

    const context = this.buildPhaseContext();
    const intent = await this.intentPhase.analyze(query, context);

    this.logger.info('✓ Intent Phase completed', {
      type: intent.type,
      confidence: intent.confidence,
      targetFiles: intent.targetFiles.length,
    });

    await this.stateManager.addPhaseResult({
      phase: 'intent',
      success: true,
      timestamp: Date.now(),
      data: intent
    });

    return intent;
  }

  private async runPlanningPhase(intent: IntentResult): Promise<ActionPlan> {
    this.logger.info('→ Starting Planning Phase');
    await this.setPhase('planning');

    const context = this.buildPhaseContext(intent);
    const plan = await this.planPhase.createPlan(intent, context);

    this.logger.info('✓ Planning Phase completed', {
      actions: plan.actions.length,
      estimatedChanges: plan.estimatedChanges,
      requiresConfirmation: plan.requiresConfirmation,
    });
    this.logger.debug('Action plan', { plan });

    await this.stateManager.addPhaseResult({
      phase: 'planning',
      success: true,
      timestamp: Date.now(),
      data: plan
    });

    return plan;
  }

  private async runExecutionPhase(plan: ActionPlan): Promise<ExecutionResult> {
    this.logger.info('→ Starting Execution Phase');
    await this.setPhase('executing');

    const context = this.buildPhaseContext(undefined, plan);

    const execution = await this.executePhase.execute(
      plan,
      context,
      async (changes: FileChange[]) => {
        await this.stateManager.updateFiles(changes);

        // Emit file change events
        for (const change of changes) {
          const eventType = `file:${change.type}` as AgentEvent;
          this.eventEmitter.emit(eventType, change);
        }
      }
    );

    this.logger.info('✓ Execution Phase completed', {
      success: execution.success,
      filesChanged: execution.filesChanged.length,
      errors: execution.errors?.length || 0,
    });

    await this.stateManager.addPhaseResult({
      phase: 'executing',
      success: execution.success,
      timestamp: Date.now(),
      data: execution
    });

    return execution;
  }

  private async runValidationPhase(
    execution: ExecutionResult,
    intent: IntentResult
  ): Promise<ValidationResult> {
    this.logger.info('→ Starting Validation Phase');
    await this.setPhase('validating');

    const validation = await this.validatePhase.validate(execution, intent);

    this.logger.info('✓ Validation Phase completed', {
      isValid: validation.isValid,
      errors: validation.errors.length
    });

    if (validation.errors.length > 0) {
      this.logger.error('Validation errors found', { errors: validation.errors });
    }

    await this.stateManager.addPhaseResult({
      phase: 'validating',
      success: validation.isValid,
      timestamp: Date.now(),
      data: validation
    });

    return validation;
  }

  private async setPhase(phase: Phase): Promise<void> {
    this.logger.debug(`Phase transition: ${phase}`);
    await this.stateManager.setPhase(phase);
  }

  private buildPhaseContext(
    intent?: IntentResult,
    plan?: ActionPlan,
    execution?: ExecutionResult
  ): PhaseContext {
    return {
      files: this.stateManager.getAllFiles(),
      messages: this.stateManager.getMessages(),
      intent,
      plan,
      execution
    };
  }


}
