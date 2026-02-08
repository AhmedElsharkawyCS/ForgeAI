/**
 * Dependency graph builder for virtual filesystem
 * Parses import/export statements and resolves file dependencies
 */

import type { VirtualFile } from '../types/state';

export interface DependencyGraph {
  dependencies: Map<string, string[]>; // file -> files it imports
  dependents: Map<string, string[]>;   // file -> files that import it
}

/**
 * Regex patterns for extracting import specifiers
 */
const IMPORT_PATTERNS = [
  // ES6 imports: import ... from '...'
  /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g,
  // ES6 re-exports: export ... from '...'
  /export\s+(?:\{[^}]*\}|\*)\s+from\s+['"]([^'"]+)['"]/g,
  // Dynamic imports: import('...')
  /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  // CommonJS require: require('...')
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

/**
 * Check if an import specifier is a bare module (third-party)
 * Returns true for 'react', '@mui/material', 'axios', etc.
 * Returns false for './Button', '../utils', '/src/components'
 */
function isBareModule(specifier: string): boolean {
  // Starts with . or / = relative/absolute path
  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    return false;
  }

  // Everything else is a bare module (third-party)
  // This includes: 'react', 'axios', '@mui/material', etc.
  return true;
}

/**
 * Extract all import specifiers from file content
 */
function extractImports(content: string): string[] {
  const imports = new Set<string>();

  for (const pattern of IMPORT_PATTERNS) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const specifier = match[1];
      if (specifier && !isBareModule(specifier)) {
        imports.add(specifier);
      }
    }
  }

  return Array.from(imports);
}

/**
 * Resolve a relative path to absolute path
 * Example: './Button' from '/src/components/App.tsx' -> '/src/components/Button'
 */
function resolveRelativePath(specifier: string, importerPath: string): string {
  // Get the directory of the importer
  const importerDir = importerPath.substring(0, importerPath.lastIndexOf('/'));

  // Handle ./ and ../
  const parts = specifier.split('/');
  const dirParts = importerDir.split('/').filter(p => p);

  for (const part of parts) {
    if (part === '.') {
      continue;
    } else if (part === '..') {
      dirParts.pop();
    } else {
      dirParts.push(part);
    }
  }

  return '/' + dirParts.join('/');
}

/**
 * Try to resolve a path with various extensions
 * Tries: exact match, .ts, .tsx, .js, .jsx, /index.ts, /index.tsx, /index.js, /index.jsx
 */
function resolveWithExtensions(basePath: string, existingPaths: Set<string>): string | null {
  // Try exact match first
  if (existingPaths.has(basePath)) {
    return basePath;
  }

  // Try with common extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  for (const ext of extensions) {
    const pathWithExt = basePath + ext;
    if (existingPaths.has(pathWithExt)) {
      return pathWithExt;
    }
  }

  // Try index files
  const indexFiles = ['/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
  for (const indexFile of indexFiles) {
    const indexPath = basePath + indexFile;
    if (existingPaths.has(indexPath)) {
      return indexPath;
    }
  }

  return null;
}

/**
 * Resolve an import specifier to an absolute file path
 * 
 * @param specifier - The import specifier (e.g., './Button', '../hooks/useAuth')
 * @param importerPath - The absolute path of the file containing the import
 * @param existingPaths - Set of all known file paths in the virtual filesystem
 * @returns The resolved absolute path, or null if not found
 */
export function resolveImportPath(
  specifier: string,
  importerPath: string,
  existingPaths: Set<string>
): string | null {
  // Skip bare modules (third-party)
  if (isBareModule(specifier)) {
    return null;
  }

  let resolvedPath: string;

  if (specifier.startsWith('.')) {
    // Relative path resolution
    resolvedPath = resolveRelativePath(specifier, importerPath);
  } else if (specifier.startsWith('/')) {
    // Already absolute
    resolvedPath = specifier;
  } else {
    // Unknown format
    return null;
  }

  // Try to resolve with extensions
  return resolveWithExtensions(resolvedPath, existingPaths);
}

/**
 * Build a dependency graph from virtual files
 * 
 * @param files - Array of virtual files
 * @returns A dependency graph with both forward and reverse dependencies
 */
export function buildDependencyGraph(files: VirtualFile[]): DependencyGraph {
  const dependencies = new Map<string, string[]>();
  const dependents = new Map<string, string[]>();

  // Build set of all file paths for quick lookup
  const existingPaths = new Set(files.map(f => f.path));

  // Initialize maps with empty arrays for all files
  for (const file of files) {
    dependencies.set(file.path, []);
    dependents.set(file.path, []);
  }

  // Parse imports for each file
  for (const file of files) {
    const imports = extractImports(file.content);
    const resolvedDeps: string[] = [];

    for (const importSpecifier of imports) {
      const resolvedPath = resolveImportPath(
        importSpecifier,
        file.path,
        existingPaths
      );

      if (resolvedPath && resolvedPath !== file.path) {
        resolvedDeps.push(resolvedPath);

        // Add to reverse dependencies
        const deps = dependents.get(resolvedPath) || [];
        if (!deps.includes(file.path)) {
          deps.push(file.path);
        }
        dependents.set(resolvedPath, deps);
      }
    }

    // Remove duplicates and sort
    dependencies.set(file.path, [...new Set(resolvedDeps)].sort());
  }

  return { dependencies, dependents };
}

/**
 * Format dependency graph as a readable string for LLM prompts
 * Shows file paths and their import relationships
 * 
 * @param graph - The dependency graph to format
 * @param maxFiles - Maximum number of files to include (default: 50)
 * @returns Formatted string representation of the graph
 */
export function formatDependencyGraph(
  graph: DependencyGraph,
  maxFiles: number | 'all' = 50
): string {
  const lines: string[] = [];

  // Get all files with any dependencies or dependents
  const filesWithRelations = Array.from(graph.dependencies.keys()).filter(
    path => {
      const deps = graph.dependencies.get(path) || [];
      const dependents = graph.dependents.get(path) || [];
      return deps.length > 0 || dependents.length > 0;
    }
  );

  if (filesWithRelations.length === 0) {
    return '(No dependencies found - project has no imports/exports yet)';
  }

  // Sort by path for consistent output
  filesWithRelations.sort();

  // Limit to maxFiles
  const filesToShow = filesWithRelations.slice(0, maxFiles === "all" ? undefined : maxFiles);
  const remaining = filesWithRelations.length - filesToShow.length;

  for (const filePath of filesToShow) {
    const deps = graph.dependencies.get(filePath) || [];
    const dependents = graph.dependents.get(filePath) || [];

    lines.push(`\n${filePath}`);

    if (deps.length > 0) {
      lines.push(`  imports: ${deps.join(', ')}`);
    }

    if (dependents.length > 0) {
      lines.push(`  imported by: ${dependents.join(', ')}`);
    }
  }

  if (remaining > 0) {
    lines.push(`\n... and ${remaining} more files`);
  }

  return lines.join('\n');
}
