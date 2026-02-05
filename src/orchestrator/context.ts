/**
 * Context builder for LLM prompts
 */

import type { VirtualFile, Message } from '../types/state';

export class ContextBuilder {
  /**
   * Build file context summary for LLM
   */
  static buildFilesContext(files: VirtualFile[], maxFiles: number = 10): string {
    if (files.length === 0) {
      return 'No files in the current state.';
    }

    const sortedFiles = files
      .sort((a, b) => b.lastModified - a.lastModified)
      .slice(0, maxFiles);

    const fileList = sortedFiles.map(f => {
      const size = f.content.length;
      const lines = f.content.split('\n').length;
      return `- ${f.path} (${lines} lines, ${size} bytes, v${f.version}) [${f.language || 'unknown'}]`;
    }).join('\n');

    const total = files.length;
    const showing = sortedFiles.length;
    const header = showing < total
      ? `Files in current state (showing ${showing} of ${total}):`
      : `Files in current state (${total} total):`;

    return `${header}\n${fileList}`;
  }

  /**
   * Build message history context
   * Includes full conversation context (user + assistant) for better understanding
   */
  static buildMessagesContext(messages: Message[], maxMessages: number = 10, maxLength: number = 200): string {
    if (messages.length === 0) {
      return 'No previous messages.';
    }

    const recentMessages = messages.slice(-maxMessages);

    // Build full conversation context
    const parts: string[] = ['Recent Conversation Context:'];

    recentMessages.forEach((msg, idx) => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      const content = msg.content.length > maxLength
        ? `${msg.content.slice(0, maxLength)}...`
        : msg.content;

      parts.push(`\n${idx + 1}. [${role}]: ${content}`);
    });

    return parts.join('\n');
  }

  /**
   * Build file content with truncation for large files
   */
  static buildFileContent(file: VirtualFile, maxLines: number = 100): string {
    const lines = file.content.split('\n');

    if (lines.length <= maxLines) {
      return file.content;
    }

    const half = Math.floor(maxLines / 2);
    const start = lines.slice(0, half).join('\n');
    const end = lines.slice(-half).join('\n');
    const omitted = lines.length - maxLines;

    return `${start}\n\n... (${omitted} lines omitted) ...\n\n${end}`;
  }

  /**
   * Extract relevant files based on paths
   * 
   * Path Convention (enforced across prompts and templates):
   * - All paths MUST start with "/" (e.g., "/src/components/Button.tsx")
   * - Paths are case-insensitive for matching
   * - Directory paths end with "/" (e.g., "/src/components/")
   */
  static extractRelevantFiles(files: VirtualFile[], paths: string[]): VirtualFile[] {
    if (paths.length === 0) return [];
    
    // Normalize to lowercase for comparison
    const normalizedPaths = paths.map(p => p.toLowerCase());

    return files.filter(f => {
      const filePath = f.path.toLowerCase();
      
      return normalizedPaths.some(requestedPath => {
        // Exact path match
        if (filePath === requestedPath) return true;
        
        // Directory match (if requestedPath ends with /)
        if (requestedPath.endsWith('/') && filePath.startsWith(requestedPath)) return true;
        
        return false;
      });
    });
  }

}
