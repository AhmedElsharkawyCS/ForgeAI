/**
 * Node.js file system adapter
 * Persists state to disk in Node.js environments
 */

import type { IStorageAdapter } from './adapter.interface';
import type { AgentState } from '../types/state';

export class NodeFSAdapter implements IStorageAdapter {
  private readonly filePath: string;
  private fs: typeof import('fs') | null = null;
  private path: typeof import('path') | null = null;

  constructor(filePath: string = './.ai-agent-state.json') {
    this.filePath = filePath;
  }

  private async ensureModules(): Promise<void> {
    if (!this.fs || !this.path) {
      try {
        // Dynamic import for Node.js modules
        this.fs = await import('fs');
        this.path = await import('path');
      } catch (error) {
        throw new Error('Node.js fs/path modules are not available. This adapter only works in Node.js environments.');
      }
    }
  }

  async load(): Promise<AgentState | null> {
    await this.ensureModules();
    
    try {
      const data = await this.fs!.promises.readFile(this.filePath, 'utf-8');
      return this.deserializeState(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null; // File doesn't exist yet
      }
      console.error('Failed to load state from file:', error);
      return null;
    }
  }

  async save(state: AgentState): Promise<void> {
    await this.ensureModules();

    try {
      const serialized = this.serializeState(state);
      const dir = this.path!.dirname(this.filePath);
      
      // Ensure directory exists
      await this.fs!.promises.mkdir(dir, { recursive: true });
      
      // Write with atomic rename
      const tempPath = `${this.filePath}.tmp`;
      await this.fs!.promises.writeFile(tempPath, serialized, 'utf-8');
      await this.fs!.promises.rename(tempPath, this.filePath);
    } catch (error) {
      console.error('Failed to save state to file:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    await this.ensureModules();

    try {
      await this.fs!.promises.unlink(this.filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error('Failed to clear state file:', error);
        throw error;
      }
    }
  }

  watch(callback: (state: AgentState) => void): () => void {
    this.ensureModules().then(() => {
      const watcher = this.fs!.watch(this.filePath, async () => {
        const state = await this.load();
        if (state) {
          callback(state);
        }
      });

      return () => {
        watcher.close();
      };
    });

    // Return immediate unsubscribe function
    return () => {};
  }

  private serializeState(state: AgentState): string {
    return JSON.stringify({
      ...state,
      files: {
        files: Array.from(state.files.files.entries())
      }
    }, null, 2);
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
