/**
 * Central state management with transactional updates
 */

import type { IStorageAdapter } from '../adapters/adapter.interface';
import type {
  AgentState,
  Message,
  Phase,
  PhaseResult,
  FileChange,
  StateSnapshot,
  VirtualFile
} from '../types/state';
import { VirtualFileSystem } from './virtual-fs';
import { Differ } from './differ';
import { Logger, createChildLogger } from '../utils/logger';

export class StateManager {
  private state: AgentState;
  private vfs: VirtualFileSystem;
  private adapter: IStorageAdapter;
  private snapshots: StateSnapshot[] = [];
  private maxSnapshots: number = 10;
  private autoSave: boolean;
  private logger: Logger;

  constructor(adapter: IStorageAdapter, autoSave: boolean = true, parentLogger: Logger) {
    this.logger = createChildLogger(parentLogger, 'StateManager');
    this.adapter = adapter;
    this.autoSave = autoSave;

    this.logger.debug('StateManager initialized', { autoSave });

    // Initialize with empty state
    this.state = this.createEmptyState();
    this.vfs = new VirtualFileSystem();
  }

  /**
   * Initialize state from storage
   */
  async initialize(initialFiles?: VirtualFile[]): Promise<void> {
    this.logger.info('Initializing state');

    const stored = await this.adapter.load();

    if (stored) {
      this.logger.info('Loaded state from storage', {
        version: stored.version,
        files: stored.files.files.size,
        messages: stored.messages.length,
      });
      this.state = stored;
      this.vfs = new VirtualFileSystem(this.getAllFiles());
    } else if (initialFiles) {
      this.logger.info('Initializing with initial files', { count: initialFiles.length });
      this.vfs = new VirtualFileSystem(initialFiles);
      this.state = {
        ...this.state,
        files: this.vfs.getState()
      };

      if (this.autoSave) {
        await this.persist();
      }
    } else {
      this.logger.info('Initialized with empty state');
    }

    // Create initial snapshot
    this.createSnapshot();
    this.logger.debug('Initial snapshot created');
  }

  /**
   * Get current state (read-only)
   */
  getState(): Readonly<AgentState> {
    return this.state;
  }

  /**
   * Get all files
   */
  getAllFiles(): VirtualFile[] {
    return Array.from(this.state.files.files.values());
  }

  /**
   * Get file by path
   */
  getFile(path: string): VirtualFile | undefined {
    return this.vfs.getFile(path);
  }

  /**
   * Update files with changes
   */
  async updateFiles(changes: FileChange[]): Promise<VirtualFile[]> {
    this.logger.info('Updating files', { changesCount: changes.length });
    this.logger.debug('File changes', {
      changes: changes.map(c => ({ type: c.type, path: c.path })),
    });

    const modifiedFiles = this.vfs.applyChanges(changes);

    this.state = {
      ...this.state,
      files: this.vfs.getState(),
      updatedAt: Date.now(),
      version: this.state.version + 1
    };

    this.logger.info('Files updated', { modifiedCount: modifiedFiles.length });

    if (this.autoSave) {
      await this.persist();
    }

    return modifiedFiles;
  }

  /**
   * Add a message to history
   */
  async addMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    const fullMessage: Message = {
      ...message,
      id: this.generateId(),
      timestamp: Date.now()
    };

    this.state = {
      ...this.state,
      messages: [...this.state.messages, fullMessage],
      updatedAt: Date.now()
    };

    if (this.autoSave) {
      await this.persist();
    }

    return fullMessage;
  }

  /**
   * Get all messages
   */
  getMessages(): Message[] {
    return this.state.messages;
  }

  /**
   * Update current phase
   */
  async setPhase(phase: Phase): Promise<void> {
    this.logger.debug('Setting phase', { phase });
    this.state = {
      ...this.state,
      currentPhase: phase,
      updatedAt: Date.now()
    };

    if (this.autoSave) {
      await this.persist();
    }
  }

  /**
   * Add phase result to history
   */
  async addPhaseResult(result: PhaseResult): Promise<void> {
    this.state = {
      ...this.state,
      history: [...this.state.history, result],
      updatedAt: Date.now()
    };

    if (this.autoSave) {
      await this.persist();
    }
  }

  /**
   * Execute a transaction with automatic rollback on error
   */
  async transaction<T>(fn: (state: AgentState) => Promise<T> | T): Promise<T> {
    const snapshot = this.createSnapshot();

    try {
      const result = await fn(this.state);

      if (this.autoSave) {
        await this.persist();
      }

      return result;
    } catch (error) {
      // Rollback to snapshot
      this.restoreSnapshot(snapshot);
      throw error;
    }
  }

  /**
   * Create a snapshot of current state
   */
  createSnapshot(): StateSnapshot {
    const snapshot: StateSnapshot = {
      state: JSON.parse(JSON.stringify({
        ...this.state,
        files: {
          files: Array.from(this.state.files.files.entries())
        }
      })),
      version: this.state.version,
      timestamp: Date.now()
    };

    // Restore Map for files
    snapshot.state.files.files = new Map(
      (snapshot.state.files as any).files
    );

    this.snapshots.push(snapshot);

    // Keep only last N snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Restore state from a snapshot
   */
  restoreSnapshot(snapshot: StateSnapshot): void {
    this.state = snapshot.state;
    this.vfs.restoreState(snapshot.state.files);
  }

  /**
   * Rollback to a specific version
   */
  async rollback(version: number): Promise<boolean> {
    const snapshot = this.snapshots.find(s => s.version === version);

    if (snapshot) {
      this.restoreSnapshot(snapshot);

      if (this.autoSave) {
        await this.persist();
      }

      return true;
    }

    return false;
  }

  /**
   * Persist current state to storage
   */
  async persist(): Promise<void> {
    await this.adapter.save(this.state);
  }

  /**
   * Clear all state
   */
  async clear(): Promise<void> {
    this.state = this.createEmptyState();
    this.vfs.clear();
    this.snapshots = [];
    await this.adapter.clear();
  }

  /**
   * Get state diff between versions
   */
  getStateDiff(fromVersion: number, toVersion: number) {
    const fromSnapshot = this.snapshots.find(s => s.version === fromVersion);
    const toSnapshot = this.snapshots.find(s => s.version === toVersion);

    if (!fromSnapshot || !toSnapshot) {
      return null;
    }

    return Differ.diffFileStates(
      fromSnapshot.state.files,
      toSnapshot.state.files
    );
  }

  /**
   * Create empty initial state
   */
  private createEmptyState(): AgentState {
    const now = Date.now();

    return {
      files: { files: new Map() },
      messages: [],
      currentPhase: 'idle',
      history: [],
      version: 1,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
