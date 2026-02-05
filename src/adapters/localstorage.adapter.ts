/**
 * Browser localStorage adapter
 * Persists state across browser sessions
 */

import type { IStorageAdapter } from './adapter.interface';
import type { AgentState } from '../types/state';

export class LocalStorageAdapter implements IStorageAdapter {
  private readonly storageKey: string;
  private watchCallbacks: Set<(state: AgentState) => void> = new Set();

  constructor(storageKey: string = 'ai-agent-state') {
    this.storageKey = storageKey;

    // Set up storage event listener for cross-tab sync
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent.bind(this));
    }
  }

  private handleStorageEvent(event: StorageEvent): void {
    if (event.key === this.storageKey && event.newValue) {
      try {
        const state = this.deserializeState(event.newValue);
        this.watchCallbacks.forEach(callback => callback(state));
      } catch (error) {
        console.error('Failed to parse storage event:', error);
      }
    }
  }

  async load(): Promise<AgentState | null> {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage is not available in this environment');
    }

    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return null;

      return this.deserializeState(data);
    } catch (error) {
      console.error('Failed to load state from localStorage:', error);
      return null;
    }
  }

  async save(state: AgentState): Promise<void> {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage is not available in this environment');
    }

    try {
      const serialized = this.serializeState(state);
      localStorage.setItem(this.storageKey, serialized);
    } catch (error) {
      console.error('Failed to save state to localStorage:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage is not available in this environment');
    }

    localStorage.removeItem(this.storageKey);
  }

  watch(callback: (state: AgentState) => void): () => void {
    this.watchCallbacks.add(callback);
    return () => {
      this.watchCallbacks.delete(callback);
    };
  }

  private serializeState(state: AgentState): string {
    return JSON.stringify({
      ...state,
      files: {
        files: Array.from(state.files.files.entries())
      }
    });
  }

  private deserializeState(data: string): AgentState {
    const parsed = JSON.parse(data);
    return {
      ...parsed,
      files: {
        files: new Map(parsed.files.files)
      }
    };
  }
}
