/**
 * Policy gate for safety validation and restrictions
 */

import type { PolicyConfig } from '../types';
import type { Action, ActionPlan } from '../types/phases';
import type { VirtualFile, FileChange } from '../types/state';

export class PolicyGate {
  private config: PolicyConfig;

  constructor(config: PolicyConfig = {}) {
    this.config = {
      maxFileSize: config.maxFileSize || 1024 * 1024, // 1MB default
      allowedFileTypes: config.allowedFileTypes || [],
      maxConcurrentActions: config.maxConcurrentActions || 10,
      requireConfirmation: config.requireConfirmation ?? false
    };
  }

  /**
   * Validate an action plan against policies
   */
  validatePlan(plan: ActionPlan): { allowed: boolean; reason?: string } {
    // Check action count
    if (plan.actions.length > this.config.maxConcurrentActions!) {
      return {
        allowed: false,
        reason: `Plan exceeds maximum concurrent actions (${this.config.maxConcurrentActions})`
      };
    }

    // Validate each action
    for (const action of plan.actions) {
      const result = this.validateAction(action);
      if (!result.allowed) {
        return result;
      }
    }

    // Check if confirmation is required
    if (this.config.requireConfirmation && plan.requiresConfirmation) {
      return {
        allowed: false,
        reason: 'Plan requires user confirmation'
      };
    }

    return { allowed: true };
  }

  /**
   * Validate a single action
   */
  validateAction(action: Action): { allowed: boolean; reason?: string } {
    // Validate file type if restrictions exist
    if (this.config.allowedFileTypes && this.config.allowedFileTypes.length > 0) {
      const ext = this.getFileExtension(action.path);
      if (ext && !this.config.allowedFileTypes.includes(ext)) {
        return {
          allowed: false,
          reason: `File type '.${ext}' is not allowed`
        };
      }
    }

    // Validate file path (basic security checks)
    if (this.isUnsafePath(action.path)) {
      return {
        allowed: false,
        reason: 'Unsafe file path detected'
      };
    }

    return { allowed: true };
  }

  /**
   * Validate file changes
   */
  validateFileChanges(changes: FileChange[]): { allowed: boolean; reason?: string } {
    for (const change of changes) {
      // Check file size
      if (change.content && change.content.length > this.config.maxFileSize!) {
        return {
          allowed: false,
          reason: `File '${change.path}' exceeds maximum size (${this.config.maxFileSize} bytes)`
        };
      }

      // Check file type
      if (this.config.allowedFileTypes && this.config.allowedFileTypes.length > 0) {
        const ext = this.getFileExtension(change.path);
        if (ext && !this.config.allowedFileTypes.includes(ext)) {
          return {
            allowed: false,
            reason: `File type '.${ext}' is not allowed for '${change.path}'`
          };
        }
      }

      // Validate path safety
      if (this.isUnsafePath(change.path)) {
        return {
          allowed: false,
          reason: `Unsafe path detected: '${change.path}'`
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Validate existing file
   */
  validateFile(file: VirtualFile): { allowed: boolean; reason?: string } {
    // Check file size
    if (file.content.length > this.config.maxFileSize!) {
      return {
        allowed: false,
        reason: `File exceeds maximum size (${this.config.maxFileSize} bytes)`
      };
    }

    return { allowed: true };
  }

  /**
   * Check if a path is potentially unsafe
   */
  private isUnsafePath(path: string): boolean {
    // Check for directory traversal attempts
    if (path.includes('..') || path.includes('//')) {
      return true;
    }

    // Check for absolute paths (we want relative paths only)
    if (path.startsWith('/') && !path.startsWith('./')) {
      // Allow /filename but not absolute system paths
      const hasSystemPath = path.includes('etc') ||
        path.includes('usr') ||
        path.includes('var') ||
        path.includes('System') ||
        path.includes('Windows');
      if (hasSystemPath) {
        return true;
      }
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /\0/,  // Null bytes
      /[<>:"|?*]/,  // Invalid filename characters
    ];

    return suspiciousPatterns.some(pattern => pattern.test(path));
  }

  /**
   * Get file extension from path
   */
  private getFileExtension(path: string): string | null {
    const parts = path.split('.');
    const lastPart = parts[parts.length - 1];
    return parts.length > 1 && lastPart ? lastPart.toLowerCase() : null;
  }

  /**
   * Update policy configuration
   */
  updateConfig(config: Partial<PolicyConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }

  /**
   * Get current policy configuration
   */
  getConfig(): Readonly<PolicyConfig> {
    return this.config;
  }
}
