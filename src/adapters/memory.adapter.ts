/**
 * In-memory storage adapter
 * Useful for testing and ephemeral sessions
 */

import type { IStorageAdapter } from './adapter.interface';
import type { AgentState } from '../types/state';

export class InMemoryAdapter implements IStorageAdapter {
  private state: AgentState | null = null;

  async load(): Promise<AgentState | null> {
    return this.state;
  }

  async save(state: AgentState): Promise<void> {
    // Deep clone to prevent external mutations
    this.state = JSON.parse(JSON.stringify({
      ...state,
      files: {
        files: Array.from(state.files.files.entries())
      }
    }));
  }

  async clear(): Promise<void> {
    this.state = null;
  }
}
