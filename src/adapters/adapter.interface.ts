/**
 * Storage adapter interface for state persistence
 */

import type { AgentState } from '../types/state';

export interface IStorageAdapter {
  /**
   * Load the agent state from storage
   * @returns The stored state or null if none exists
   */
  load(): Promise<AgentState | null>;

  /**
   * Save the agent state to storage
   * @param state The state to persist
   */
  save(state: AgentState): Promise<void>;

  /**
   * Clear all stored state
   */
  clear(): Promise<void>;

  /**
   * Optional watch for state changes (useful for syncing)
   * @param callback Function to call when state changes externally
   * @returns Unsubscribe function
   */
  watch?(callback: (state: AgentState) => void): () => void;
}
