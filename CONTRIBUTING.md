# Contributing to AI Agent SDK

Thank you for your interest in contributing to the AI Agent SDK! This SDK provides a powerful multi-phase orchestration system for building AI-powered code generation agents.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [SDK Architecture](#sdk-architecture)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Adding New Features](#adding-new-features)
- [Testing Your Changes](#testing-your-changes)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Questions and Support](#questions-and-support)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please:

- Be respectful and considerate in your communication
- Welcome newcomers and help them get started
- Accept constructive criticism gracefully
- Focus on what is best for the community and project
- Show empathy towards other community members

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm/yarn
- **Git** for version control
- **TypeScript** knowledge (the SDK is written in TypeScript)
- API keys for LLM providers (OpenAI, Anthropic, etc.)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/web-ai-agant-sdk.git
cd web-ai-agant-sdk
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/web-ai-agant-sdk.git
```

### Environment Setup

1. Install dependencies:

```bash
yarn install
# or
npm install
```

2. Set up your environment variables (for testing):

```bash
cp .env.example .env
```

3. Edit `.env` and add your API keys:

```env
VITE_OPENAI_API_KEY=your-openai-api-key-here
VITE_ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

4. The SDK is located in `src/ai-agant-v2/` - this is where you'll make your contributions

## SDK Architecture

The SDK is organized into several key modules:

### Core Modules

```
src/ai-agant-v2/
├── adapters/              # Storage adapters for state persistence
│   ├── adapter.interface.ts
│   ├── localstorage.adapter.ts
│   ├── memory.adapter.ts
│   └── node-fs.adapter.ts
│
├── llm/                   # LLM provider integrations
│   ├── provider.interface.ts
│   ├── openai.provider.ts
│   ├── anthropic.provider.ts
│   └── prompts.ts
│
├── orchestrator/          # Multi-phase orchestration system
│   ├── agent.ts           # Main agent orchestrator
│   ├── context.ts         # Agent execution context
│   └── phases/            # Execution phases
│       ├── base.phase.ts
│       ├── intent.phase.ts
│       ├── plan.phase.ts
│       ├── execute.phase.ts
│       └── validate.phase.ts
│
├── state/                 # State management and virtual filesystem
│   ├── state-manager.ts   # Core state management
│   ├── virtual-fs.ts      # Virtual filesystem
│   └── differ.ts          # State diffing utilities
│
├── validators/            # Validation and policy enforcement
│   ├── policy-gate.ts     # Policy validation
│   └── schemas.ts         # Zod schemas
│
├── events/                # Event system
│   └── emitter.ts         # Event emitter
│
└── types/                 # TypeScript type definitions
    ├── state.ts
    ├── phases.ts
    └── providers.ts
```

### Key Concepts

1. **Phase-Based Orchestration**: The agent operates through 4 sequential phases:
   - **Intent Phase**: Classifies the user's request
   - **Plan Phase**: Creates an action plan
   - **Execute Phase**: Performs the actual operations
   - **Validate Phase**: Verifies the results

2. **Adapter Pattern**: Storage adapters allow different persistence strategies (LocalStorage, Memory, Filesystem)

3. **Provider Pattern**: LLM providers abstract different AI services (OpenAI, Anthropic, etc.)

4. **Virtual Filesystem**: All files are stored in memory with a tree structure

5. **Event-Driven**: Uses an event emitter for real-time updates

For detailed architecture documentation, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Development Workflow

### Branch Naming Convention

Use descriptive branch names with these prefixes:

- `feature/` - New SDK features (e.g., `feature/add-gemini-provider`)
- `fix/` - Bug fixes (e.g., `fix/state-manager-race-condition`)
- `docs/` - Documentation updates (e.g., `docs/update-architecture`)
- `refactor/` - Code refactoring (e.g., `refactor/simplify-phase-execution`)
- `test/` - Test additions (e.g., `test/add-adapter-tests`)
- `perf/` - Performance improvements (e.g., `perf/optimize-virtual-fs`)

### Creating a Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create and switch to a new branch
git checkout -b feature/your-feature-name
```

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - A new feature
- `fix` - A bug fix
- `docs` - Documentation changes
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `perf` - Performance improvements
- `chore` - Maintenance tasks

**Scopes** (SDK-specific):
- `llm` - LLM provider changes
- `adapters` - Storage adapter changes
- `orchestrator` - Orchestrator/phase changes
- `state` - State management changes
- `events` - Event system changes
- `validators` - Validation changes
- `types` - Type definition changes

**Examples:**

```bash
git commit -m "feat(llm): add Google Gemini provider with streaming support"
git commit -m "fix(state): resolve race condition in virtual filesystem"
git commit -m "docs(adapters): add IndexedDB adapter example"
git commit -m "refactor(orchestrator): simplify phase transition logic"
git commit -m "perf(state): optimize file tree traversal algorithm"
```

### Keep Your Branch Updated

```bash
git fetch upstream
git rebase upstream/main
```

## Code Style Guidelines

### TypeScript Standards

- **Strict mode is enabled** - All TypeScript strict checks are active
- **No unused variables** - `noUnusedLocals` and `noUnusedParameters` enforced
- **Safe array access** - `noUncheckedIndexedAccess` requires null checks
- **Explicit types** - Prefer explicit type annotations for public APIs

### Naming Conventions

- **Interfaces/Types**: PascalCase (e.g., `LLMProvider`, `AgentState`, `PhaseResult`)
- **Classes**: PascalCase (e.g., `StateManager`, `OpenAIProvider`, `IntentPhase`)
- **Functions/Methods**: camelCase (e.g., `generateCode()`, `saveState()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`, `DEFAULT_MODEL`)
- **Private members**: Prefix with underscore (e.g., `_internalState`)
- **Files**: kebab-case (e.g., `state-manager.ts`, `openai.provider.ts`)

### Code Organization

```typescript
// 1. External imports
import { EventEmitter } from 'events';

// 2. Internal imports (relative paths within SDK)
import { LLMProvider, LLMResponse } from './provider.interface';
import { AgentState } from '../types/state';

// 3. Type definitions
interface ProviderConfig {
  apiKey: string;
  model?: string;
}

// 4. Constants
const DEFAULT_MODEL = 'gpt-4-turbo-preview';
const MAX_RETRIES = 3;

// 5. Class/function implementation
export class YourProvider implements LLMProvider {
  private _client: any;

  constructor(private config: ProviderConfig) {
    this._client = this._initializeClient();
  }

  async generate(prompt: string): Promise<LLMResponse> {
    // Implementation
  }

  private _initializeClient(): any {
    // Private helper
  }
}
```

### Documentation

- Add JSDoc comments for all public APIs
- Include `@param`, `@returns`, `@throws` tags
- Provide usage examples for complex features

```typescript
/**
 * Generates code based on a natural language prompt using the LLM.
 * 
 * @param prompt - The user's natural language request
 * @param context - Optional context from previous interactions
 * @returns A promise resolving to the LLM response with generated code
 * @throws {Error} If the API key is invalid or rate limit is exceeded
 * 
 * @example
 * ```typescript
 * const provider = new OpenAIProvider({ apiKey: 'sk-...' });
 * const response = await provider.generate('Create a button component');
 * console.log(response.content);
 * ```
 */
async generate(prompt: string, context?: string): Promise<LLMResponse> {
  // Implementation
}
```

### Linting

Before committing:

```bash
yarn lint
# or
npm run lint
```

## Adding New Features

### Adding a New LLM Provider

To add support for a new LLM service (Google Gemini, Cohere, Mistral, etc.):

1. **Create the provider file**: `llm/your-provider.provider.ts`

```typescript
import { LLMProvider, LLMProviderConfig, LLMResponse } from './provider.interface';

export interface YourProviderConfig extends LLMProviderConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
}

/**
 * LLM provider implementation for YourService.
 * Supports both standard and structured output generation.
 */
export class YourProvider implements LLMProvider {
  private _client: any;

  constructor(private config: YourProviderConfig) {
    this._client = this._initializeClient();
  }

  /**
   * Generate a response from the LLM
   */
  async generate(prompt: string, context?: string): Promise<LLMResponse> {
    try {
      // Call the LLM API
      const response = await this._client.complete({
        prompt: context ? `${context}\n\n${prompt}` : prompt,
        model: this.config.model || 'default-model',
      });

      return {
        content: response.text,
        usage: {
          promptTokens: response.usage?.promptTokens || 0,
          completionTokens: response.usage?.completionTokens || 0,
          totalTokens: response.usage?.totalTokens || 0,
        },
      };
    } catch (error) {
      throw new Error(`YourProvider generation failed: ${error.message}`);
    }
  }

  /**
   * Generate structured output conforming to a schema
   */
  async generateStructured<T>(
    prompt: string,
    schema: any,
    context?: string
  ): Promise<T> {
    try {
      // Implement structured output (JSON mode, function calling, etc.)
      const response = await this._client.completeStructured({
        prompt,
        schema,
        context,
      });

      return response.parsed as T;
    } catch (error) {
      throw new Error(`YourProvider structured generation failed: ${error.message}`);
    }
  }

  private _initializeClient(): any {
    // Initialize the provider's SDK client
    // Example: return new YourServiceSDK({ apiKey: this.config.apiKey });
  }
}
```

2. **Export from index**: Add to `llm/index.ts`

```typescript
export * from './your-provider.provider';
```

3. **Update types**: If needed, extend types in `types/providers.ts`

4. **Test the provider**: Create a test scenario in the demo app

5. **Document usage**: Add example to the SDK README

### Adding a New Storage Adapter

To add a new storage adapter (IndexedDB, REST API, Database, etc.):

1. **Create the adapter file**: `adapters/your-adapter.adapter.ts`

```typescript
import { StorageAdapter } from './adapter.interface';
import { AgentState } from '../types/state';

/**
 * Storage adapter for [Your Storage Solution].
 * Provides persistent state storage with [specific benefits].
 */
export class YourAdapter implements StorageAdapter {
  private _connection: any;

  constructor(config: { /* your config */ }) {
    this._connection = this._initializeConnection(config);
  }

  /**
   * Save agent state to storage
   */
  async save(key: string, state: AgentState): Promise<void> {
    try {
      const serialized = JSON.stringify(state);
      await this._connection.set(key, serialized);
    } catch (error) {
      throw new Error(`Failed to save state: ${error.message}`);
    }
  }

  /**
   * Load agent state from storage
   */
  async load(key: string): Promise<AgentState | null> {
    try {
      const serialized = await this._connection.get(key);
      if (!serialized) return null;
      return JSON.parse(serialized) as AgentState;
    } catch (error) {
      throw new Error(`Failed to load state: ${error.message}`);
    }
  }

  /**
   * Delete agent state from storage
   */
  async delete(key: string): Promise<void> {
    try {
      await this._connection.delete(key);
    } catch (error) {
      throw new Error(`Failed to delete state: ${error.message}`);
    }
  }

  /**
   * List all stored state keys
   */
  async list(): Promise<string[]> {
    try {
      return await this._connection.keys();
    } catch (error) {
      throw new Error(`Failed to list states: ${error.message}`);
    }
  }

  private _initializeConnection(config: any): any {
    // Initialize your storage connection
  }
}
```

2. **Export from index**: Add to `adapters/index.ts`

```typescript
export * from './your-adapter.adapter';
```

3. **Test the adapter**: Verify save/load/delete operations

4. **Document limitations**: Note any size limits, browser compatibility, etc.

### Adding a New Orchestrator Phase

To add a new phase to the execution pipeline:

1. **Create the phase file**: `orchestrator/phases/your-phase.phase.ts`

```typescript
import { BasePhase } from './base.phase';
import { PhaseResult } from '../../types/phases';
import { AgentContext } from '../context';

/**
 * [Your Phase Name] Phase
 * 
 * Purpose: [What this phase does]
 * Input: [What it receives]
 * Output: [What it produces]
 */
export class YourPhase extends BasePhase {
  constructor(context: AgentContext) {
    super('your-phase', context);
  }

  async execute(): Promise<PhaseResult> {
    this.emit('phase:start', { 
      phase: this.name,
      timestamp: Date.now() 
    });

    try {
      // Get context data
      const { prompt, state, llmProvider } = this.context;

      // Use LLM if needed
      const response = await llmProvider.generate(
        `Your phase-specific prompt: ${prompt}`
      );

      // Process the response
      const result = this._processResponse(response);

      // Update context for next phase
      this.context.data.yourPhaseData = result;

      this.emit('phase:complete', { 
        phase: this.name,
        result: 'success',
        data: result
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.emit('phase:error', { 
        phase: this.name, 
        error: error.message 
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  private _processResponse(response: any): any {
    // Your processing logic
    return response;
  }
}
```

2. **Export from index**: Add to `orchestrator/phases/index.ts`

```typescript
export * from './your-phase.phase';
```

3. **Update the agent**: Register the phase in `orchestrator/agent.ts`

```typescript
import { YourPhase } from './phases/your-phase.phase';

// In the agent's execution flow:
const phases = [
  new IntentPhase(context),
  new PlanPhase(context),
  new YourPhase(context), // Add your phase
  new ExecutePhase(context),
  new ValidatePhase(context),
];
```

4. **Document the phase**: Update ARCHITECTURE.md with phase details

### Extending the Event System

To add new events:

1. **Define event types**: Add to `types/index.ts` or create new type file

```typescript
export interface YourEventData {
  eventType: string;
  payload: any;
  timestamp: number;
}
```

2. **Emit events**: In your phase or module

```typescript
this.emit('your:event', {
  eventType: 'custom-action',
  payload: { /* data */ },
  timestamp: Date.now()
});
```

3. **Document events**: List all events in ARCHITECTURE.md

### Adding Validators

To add new validation logic:

1. **Define schema**: In `validators/schemas.ts`

```typescript
import { z } from 'zod';

export const YourSchema = z.object({
  field1: z.string(),
  field2: z.number().min(0),
  field3: z.array(z.string()).optional(),
});

export type YourType = z.infer<typeof YourSchema>;
```

2. **Add policy validation**: In `validators/policy-gate.ts`

```typescript
export class PolicyGate {
  validateYourPolicy(data: unknown): YourType {
    return YourSchema.parse(data);
  }
}
```

## Testing Your Changes

### Manual Testing

1. Start the development server:

```bash
yarn dev
```

2. Test your SDK changes through the demo UI:
   - Try various prompts that exercise your feature
   - Monitor the Agent Monitor panel for phase execution
   - Check browser console for errors or warnings
   - Verify state persistence (refresh the page)

### Testing Specific Features

**Testing LLM Providers:**
```typescript
// In the demo app or a test file
const provider = new YourProvider({ 
  apiKey: 'your-key',
  model: 'model-name' 
});

const response = await provider.generate('Create a React component');
console.log('Response:', response);
```

**Testing Storage Adapters:**
```typescript
const adapter = new YourAdapter({ /* config */ });

// Test save
await adapter.save('test-key', mockState);

// Test load
const loaded = await adapter.load('test-key');
console.assert(loaded !== null, 'State should be loaded');

// Test delete
await adapter.delete('test-key');
const deleted = await adapter.load('test-key');
console.assert(deleted === null, 'State should be deleted');
```

**Testing Phases:**
```typescript
// Create a test context
const context = new AgentContext({
  prompt: 'Test prompt',
  state: mockState,
  llmProvider: mockProvider,
});

// Execute your phase
const phase = new YourPhase(context);
const result = await phase.execute();

console.log('Phase result:', result);
```

### Edge Cases to Test

- Empty or null inputs
- Very long prompts (>10k characters)
- API failures and rate limits
- Concurrent operations
- State corruption scenarios
- Browser compatibility (Chrome, Firefox, Safari)

## Pull Request Process

### Before Submitting

1. ✅ Test your changes thoroughly
2. ✅ Run `yarn lint` and fix all issues
3. ✅ Update documentation (README, ARCHITECTURE, JSDoc comments)
4. ✅ Follow commit message conventions
5. ✅ Rebase on latest main branch

### Submitting a PR

1. Push your branch:

```bash
git push origin feature/your-feature-name
```

2. Create a Pull Request on GitHub against `main`

3. Fill out the PR description:

```markdown
## Description
[Clear explanation of what changed and why]

## Type of Change
- [ ] New LLM provider
- [ ] New storage adapter
- [ ] New orchestrator phase
- [ ] Bug fix
- [ ] Performance improvement
- [ ] Documentation update
- [ ] Other (specify)

## Related Issue
Closes #123

## Testing
[Describe how you tested this change]

## Screenshots (if applicable)
[Add screenshots for UI-visible changes]

## Breaking Changes
[List any breaking changes and migration steps]
```

### PR Checklist

- [ ] My code follows the SDK code style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have added JSDoc comments for public APIs
- [ ] I have updated the relevant documentation (README, ARCHITECTURE)
- [ ] I have tested my changes with multiple LLM providers (if applicable)
- [ ] My changes generate no new linter warnings or errors
- [ ] I have checked browser compatibility (if applicable)
- [ ] My commits follow the Conventional Commits format

### Review Process

- Maintainers will review within 2-3 business days
- Address feedback by pushing new commits
- Once approved, a maintainer will merge your PR
- Your contribution will be included in the next release

## Issue Reporting

### Before Creating an Issue

1. Search existing issues
2. Review SDK documentation (README, ARCHITECTURE)
3. Verify the issue is reproducible

### Bug Reports

Include:

- **Description**: Clear bug description
- **Steps to Reproduce**: Detailed steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**:
  - SDK version
  - LLM provider used
  - Storage adapter used
  - Browser (if applicable)
  - Node.js version

**Example:**

```markdown
**Description**
StateManager loses file tree structure after reload

**Steps to Reproduce**
1. Create a deep file tree (3+ levels)
2. Save state using LocalStorageAdapter
3. Reload the page
4. File tree is flattened

**Expected Behavior**
File tree structure should be preserved

**Environment**
- SDK version: 0.1.0
- LLM Provider: OpenAI (GPT-4)
- Storage Adapter: LocalStorage
- Browser: Chrome 120
- Node.js: 18.17.0
```

### Feature Requests

Include:

- **Problem Statement**: What problem does this solve?
- **Proposed Solution**: Your suggested implementation
- **Alternatives**: Other approaches considered
- **Use Case**: Real-world scenario
- **SDK Module**: Which module would this affect?

## Questions and Support

### Where to Get Help

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and general discussions
- **Documentation**: 
  - [SDK README](./README.md)
  - [Architecture Guide](./ARCHITECTURE.md)

### Response Times

- Issues/PRs: 2-3 business days
- Complex architectural discussions: May take longer
- Be patient and respectful

## SDK Development Roadmap

Potential areas for contribution:

- [ ] Additional LLM providers (Gemini, Mistral, Cohere, Local models)
- [ ] Database storage adapters (MongoDB, PostgreSQL, Redis)
- [ ] Advanced phases (optimization, testing, deployment)
- [ ] Streaming support for real-time code generation
- [ ] Multi-agent orchestration
- [ ] Plugin system for custom extensions
- [ ] Performance benchmarking tools
- [ ] Unit tests and integration tests
- [ ] CLI tool for SDK usage
- [ ] Language-specific code generation (Python, Java, etc.)

## Thank You!

Your contributions make the AI Agent SDK more powerful and accessible. We appreciate your time and effort in improving this project.

Happy coding! 🚀
