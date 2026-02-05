/**
 * State diffing and patching utilities
 */

import { createPatch, applyPatch as applyDiffPatch } from 'diff';
import type { VirtualFile, FileDiff, FileState } from '../types/state';

export class Differ {
  /**
   * Compute differences between two file states
   */
  static diffFileStates(oldState: FileState, newState: FileState): FileDiff[] {
    const diffs: FileDiff[] = [];
    const oldPaths = new Set(oldState.files.keys());
    const newPaths = new Set(newState.files.keys());

    // Detect updates and deletions
    for (const path of oldPaths) {
      if (!newPaths.has(path)) {
        // File was deleted
        const oldFile = oldState.files.get(path)!;
        diffs.push({
          type: 'delete',
          path,
          oldContent: oldFile.content
        });
      } else {
        // Check for updates
        const oldFile = oldState.files.get(path)!;
        const newFile = newState.files.get(path)!;
        
        if (oldFile.content !== newFile.content) {
          const patch = createPatch(path, oldFile.content, newFile.content);
          diffs.push({
            type: 'update',
            path,
            oldContent: oldFile.content,
            newContent: newFile.content,
            patch
          });
        }
      }
    }

    // Detect creations
    for (const path of newPaths) {
      if (!oldPaths.has(path)) {
        const newFile = newState.files.get(path)!;
        diffs.push({
          type: 'create',
          path,
          newContent: newFile.content
        });
      }
    }

    return diffs;
  }

  /**
   * Compute diff between two file contents
   */
  static diffFiles(oldFile: VirtualFile, newFile: VirtualFile): string {
    return createPatch(
      oldFile.path,
      oldFile.content,
      newFile.content
    );
  }

  /**
   * Apply a patch to file content
   */
  static applyPatch(content: string, patch: string): string {
    const result = applyDiffPatch(content, patch) as string | false | string[];
    if (typeof result === 'string') {
      return result;
    }
    // If result is false or unexpected, return original content
    if (result === false || !result) {
      return content;
    }
    // If patch array is returned, join it
    if (Array.isArray(result)) {
      return result.join('\n');
    }
    return content;
  }

  /**
   * Create a snapshot of current file state
   */
  static snapshot(fileState: FileState): FileState {
    const files = new Map<string, VirtualFile>();
    
    for (const [path, file] of fileState.files.entries()) {
      files.set(path, { ...file });
    }

    return { files };
  }
}
