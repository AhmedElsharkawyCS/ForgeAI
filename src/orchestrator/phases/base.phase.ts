/**
 * Base phase class with unified LLM calling logic
 */

import type { ILLMProvider, LLMRequest } from '../../types/providers';
import type { Phase } from '../../types/state';
import type { EventEmitter } from '../../events/emitter';
import { Logger } from '../../utils/logger';

/**
 * Abstract base class for all phases
 * Provides unified streaming/non-streaming LLM calling logic
 */
export abstract class BasePhase {
  constructor(
    protected llmProvider: ILLMProvider,
    protected logger: Logger,
    protected eventEmitter: EventEmitter
  ) { }

  /**
   * Unified method to call LLM with automatic streaming/non-streaming handling
   * Uses the provider's streamingEnabled config to determine mode
   * Always emits events regardless of streaming mode for consistent UI updates
   * @param request - The LLM request
   * @param phase - The current phase name (for event emission)
   * @returns The complete response content as a string
   */
  protected async callLLM(
    request: LLMRequest,
    phase: Phase
  ): Promise<string> {
    // Check if streaming is enabled via provider config and stream method exists
    if (this.llmProvider.streamingEnabled && this.llmProvider.stream) {
      return await this.callLLMWithStreaming(request, phase);
    } else {
      return await this.callLLMWithoutStreaming(request, phase);
    }
  }

  /**
   * Call LLM with streaming enabled
   * Emits events for each chunk and accumulates the full response
   */
  private async callLLMWithStreaming(
    request: LLMRequest,
    phase: Phase
  ): Promise<string> {
    this.logger.debug(`Using streaming mode for ${phase}`);
    this.eventEmitter.emit('stream:start', { phase });

    let fullContent = '';
    const stream = this.llmProvider.stream!(request);

    for await (const chunk of stream) {
      fullContent += chunk.delta;
      this.eventEmitter.emit('stream:chunk', {
        phase,
        delta: chunk.delta,
        accumulated: fullContent
      });
    }

    this.eventEmitter.emit('stream:complete', { phase });
    return fullContent;
  }

  /**
   * Call LLM without streaming (standard async completion)
   * Emits llm:start and llm:complete events
   */
  private async callLLMWithoutStreaming(
    request: LLMRequest,
    phase: Phase
  ): Promise<string> {
    this.logger.debug(`Using non-streaming mode for ${phase}`);
    this.eventEmitter.emit('llm:start', { phase });

    const response = await this.llmProvider.complete(request);
    const content = response.content;

    this.eventEmitter.emit('llm:complete', {
      phase,
      content,
      usage: response.usage
    });

    return content;
  }
}
