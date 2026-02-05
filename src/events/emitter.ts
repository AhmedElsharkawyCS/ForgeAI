/**
 * Event emitter for agent events
 */

import type { AgentEvent, EventHandler } from '../types';

export class EventEmitter {
  private listeners: Map<AgentEvent, Set<EventHandler>> = new Map();

  /**
   * Register an event listener
   */
  on<T = unknown>(event: AgentEvent, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => {
      this.off(event, handler);
    };
  }

  /**
   * Register a one-time event listener
   */
  once<T = unknown>(event: AgentEvent, handler: EventHandler<T>): () => void {
    const wrappedHandler = (data: T) => {
      handler(data);
      this.off(event, wrappedHandler as EventHandler);
    };

    return this.on(event, wrappedHandler as EventHandler);
  }

  /**
   * Remove an event listener
   */
  off<T = unknown>(event: AgentEvent, handler: EventHandler<T>): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler);
    }
  }

  /**
   * Emit an event to all registered listeners
   */
  emit<T = unknown>(event: AgentEvent, data?: T): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event, or all events if no event specified
   */
  removeAllListeners(event?: AgentEvent): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

}
