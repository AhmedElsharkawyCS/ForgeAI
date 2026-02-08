/**
 * Package.json parser for extracting project dependencies
 */

export interface PackageDependencies {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  scripts: Record<string, string>;
}

/**
 * Parse package.json content and extract dependencies
 * 
 * @param content - The raw package.json file content
 * @returns Parsed dependencies object or null if parsing fails
 */
export function parsePackageJson(content: string): PackageDependencies | null {
  try {
    const pkg = JSON.parse(content);
    
    return {
      dependencies: pkg.dependencies || {},
      devDependencies: pkg.devDependencies || {},
      peerDependencies: pkg.peerDependencies || {},
      scripts: pkg.scripts || {}
    };
  } catch (error) {
    // Invalid JSON
    return null;
  }
}

/**
 * Format package dependencies as a readable string for LLM prompts
 * 
 * @param deps - Parsed package dependencies
 * @returns Formatted string representation
 */
export function formatPackageDependencies(deps: PackageDependencies): string {
  const lines: string[] = [];
  
  const hasAny = 
    Object.keys(deps.dependencies).length > 0 ||
    Object.keys(deps.devDependencies).length > 0 ||
    Object.keys(deps.peerDependencies).length > 0 ||
    Object.keys(deps.scripts).length > 0;
  
  if (!hasAny) {
    return '(No dependencies or scripts defined in package.json)';
  }
  
  // Production dependencies
  if (Object.keys(deps.dependencies).length > 0) {
    lines.push('Dependencies (production):');
    for (const [name, version] of Object.entries(deps.dependencies)) {
      lines.push(`  - ${name}: ${version}`);
    }
  }
  
  // Development dependencies
  if (Object.keys(deps.devDependencies).length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('Dev Dependencies:');
    for (const [name, version] of Object.entries(deps.devDependencies)) {
      lines.push(`  - ${name}: ${version}`);
    }
  }
  
  // Peer dependencies
  if (Object.keys(deps.peerDependencies).length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('Peer Dependencies:');
    for (const [name, version] of Object.entries(deps.peerDependencies)) {
      lines.push(`  - ${name}: ${version}`);
    }
  }
  
  // Available scripts
  if (Object.keys(deps.scripts).length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('Available Scripts:');
    for (const [name, command] of Object.entries(deps.scripts)) {
      lines.push(`  - ${name}: ${command}`);
    }
  }
  
  return lines.join('\n');
}
