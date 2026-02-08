/**
 * Virtual file system operations
 */

import type { VirtualFile, FileState, FileChange } from '../types/state';

export class VirtualFileSystem {
  private files: Map<string, VirtualFile>;

  constructor(initialFiles: VirtualFile[] = []) {
    this.files = new Map();
    
    for (const file of initialFiles) {
      this.files.set(file.path, file);
    }
  }

  /**
   * Get a file by path
   */
  getFile(path: string): VirtualFile | undefined {
    return this.files.get(path);
  }

  /**
   * Get all files
   */
  getAllFiles(): VirtualFile[] {
    return Array.from(this.files.values());
  }

  /**
   * Check if file exists
   */
  exists(path: string): boolean {
    return this.files.has(path);
  }

  /**
   * Create or update a file
   */
  writeFile(path: string, content: string, language?: string): VirtualFile {
    const now = Date.now();
    const existing = this.files.get(path);

    const file: VirtualFile = {
      path,
      content,
      language: language || existing?.language || this.inferLanguage(path),
      metadata: existing?.metadata || {},
      version: (existing?.version || 0) + 1,
      lastModified: now
    };

    this.files.set(path, file);
    return file;
  }

  /**
   * Delete a file
   */
  deleteFile(path: string): boolean {
    return this.files.delete(path);
  }

  /**
   * Apply a batch of changes
   */
  applyChanges(changes: FileChange[]): VirtualFile[] {
    const modifiedFiles: VirtualFile[] = [];

    for (const change of changes) {
      switch (change.type) {
        case 'create':
        case 'update':
          if (change.content !== undefined) {
            const file = this.writeFile(
              change.path,
              change.content,
              change.language
            );
            modifiedFiles.push(file);
          }
          break;

        case 'delete':
          if (this.deleteFile(change.path)) {
            modifiedFiles.push({
              path: change.path,
              content: '',
              version: 0,
              lastModified: Date.now()
            });
          }
          break;
      }
    }

    return modifiedFiles;
  }

  /**
   * Get current state
   */
  getState(): FileState {
    return {
      files: new Map(this.files)
    };
  }

  /**
   * Restore state from snapshot
   */
  restoreState(state: FileState): void {
    this.files = new Map(state.files);
  }

  /**
   * Clear all files
   */
  clear(): void {
    this.files.clear();
  }

  /**
   * Get files matching a pattern
   */
  findFiles(pattern: RegExp | string): VirtualFile[] {
    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern.replace(/\*/g, '.*'))
      : pattern;

    return Array.from(this.files.values()).filter(file =>
      regex.test(file.path)
    );
  }

  /**
   * Infer language from file extension
   */
  private inferLanguage(path: string): string | undefined {
    const ext = path.split('.').pop()?.toLowerCase();
    
    // Only web development languages (Vite + React + TypeScript + MUI stack)
    // CSS/SCSS excluded - use MUI styled() API only
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'json': 'json',
      'html': 'html',
      'md': 'markdown'
    };

    return ext ? languageMap[ext] : undefined;
  }
}
