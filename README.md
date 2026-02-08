# ForgeAI SDK

A powerful, state-based AI agent SDK that works seamlessly in both Node.js and browser environments. The agent operates through phases (Intent → Plan → Execute → Validate) and manages virtual files as state, supporting multiple LLM providers and pluggable storage adapters.

## Features

- 🔄 **Phase-Based Orchestration**: Intent analysis → Planning → Execution → Validation
- 💾 **Pluggable Storage**: Memory, LocalStorage, or Node.js File System adapters
- 🤖 **Multi-Provider Support**: OpenAI and Anthropic (Claude) out of the box
- 🌐 **Cross-Platform**: Works in both Node.js and browser environments
- 📦 **Virtual File System**: All operations work on virtual state, not real files
- 🔒 **Policy Gates**: Built-in safety validation and restrictions
- 📡 **Event System**: React to phase transitions, file changes, and LLM streaming
- 🔄 **Transactional State**: Rollback support with snapshot history
- ✅ **Type-Safe**: Full TypeScript support with Zod runtime validation
- 🌊 **Streaming Support**: Real-time LLM response streaming
- 🧩 **Dependency Graph**: Automatic import/export parsing for context-aware code generation
- 📋 **Project Templates**: Pre-built React + Vite + MUI starter templates
- 🏗️ **Modular Prompt System**: Tiered, composable prompts for each agent phase

## Installation

```bash
npm install @ahmedelsharkawycs/forge-ai-sdk openai
# or
yarn add @ahmedelsharkawycs/forge-ai-sdk openai
# For Anthropic Claude:
npm install @ahmedelsharkawycs/forge-ai-sdk @anthropic-ai/sdk
```

## Quick Start

### Basic Usage

```typescript
import { 
  Agent, 
  InMemoryAdapter, 
  OpenAIProvider 
} from '@ahmedelsharkawycs/forge-ai-sdk';

// Create an agent
const agent = new Agent({
  adapter: new InMemoryAdapter(),
  provider: new OpenAIProvider({ 
    apiKey: process.env.OPENAI_API_KEY 
  }),
  initialFiles: [
    {
      path: '/src/index.ts',
      content: '// Entry point',
      version: 1,
      lastModified: Date.now()
    }
  ]
});

// Or use a pre-built template for quick bootstrapping
import { getReactMUIViteTemplate } from '@ahmedelsharkawycs/forge-ai-sdk';

const agentWithTemplate = new Agent({
  adapter: new InMemoryAdapter(),
  provider: new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
  initialFiles: getReactMUIViteTemplate() // React + Vite + MUI + TypeScript
});

// Initialize
await agent.initialize();

// Listen to events
agent.on('file:update', (file) => {
  console.log(`File updated: ${file.path}`);
});

agent.on('intent:start', () => {
  console.log('Analyzing intent...');
});

agent.on('stream:chunk', ({ content }) => {
  process.stdout.write(content); // Real-time streaming
});

// Send a message
const response = await agent.sendMessage(
  'Add a hello world function to /src/index.ts'
);

console.log(response.content);
console.log('Files changed:', response.filesChanged);

// Get current files
const files = agent.getFiles();
console.log(files);
```

### Using Different Storage Adapters

#### Browser (LocalStorage)

```typescript
import { Agent, LocalStorageAdapter, OpenAIProvider } from '@ahmedelsharkawycs/forge-ai-sdk';

const agent = new Agent({
  adapter: new LocalStorageAdapter('my-agent-state'), // Custom storage key
  provider: new OpenAIProvider({ apiKey: 'sk-...' })
});
```

#### Node.js (File System)

```typescript
import { Agent, NodeFSAdapter, AnthropicProvider } from '@ahmedelsharkawycs/forge-ai-sdk';

const agent = new Agent({
  adapter: new NodeFSAdapter('./.ai-agent-state.json'), // Atomic writes, file watching
  provider: new AnthropicProvider({ apiKey: 'sk-ant-...' })
});
```

### Using Anthropic (Claude)

```typescript
import { Agent, InMemoryAdapter, AnthropicProvider } from '@ahmedelsharkawycs/forge-ai-sdk';

const agent = new Agent({
  adapter: new InMemoryAdapter(),
  provider: new AnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-5' // Default model
  })
});
```

### Using Project Templates

The SDK ships with a pre-built React + Vite + MUI + TypeScript template that includes all essential project files (`App.tsx`, `main.tsx`, `theme.ts`, `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`):

```typescript
import { Agent, InMemoryAdapter, OpenAIProvider, getReactMUIViteTemplate } from '@ahmedelsharkawycs/forge-ai-sdk';

const agent = new Agent({
  adapter: new InMemoryAdapter(),
  provider: new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
  initialFiles: getReactMUIViteTemplate()
});

await agent.initialize();

// The agent now has full project context and can generate components,
// update the theme, add dependencies to package.json, etc.
await agent.sendMessage('Add a login page with email and password fields');
```

## Architecture

The agent follows a phase-based orchestration pattern:

```
User Message
    ↓
Intent Phase (Classify intent, identify target files)
    ↓
Planning Phase (Create action plan, validate against policies)
    ↓
Execution Phase (Execute actions, generate content, update virtual files)
    ↓
Validation Phase (Verify changes, generate markdown summary)
    ↓
Response
```

### Intent Types

The agent classifies user requests into these intent types:
- `create` - Create new files
- `edit` - Modify existing files
- `delete` - Remove files
- `query` - Answer questions about code
- `refactor` - Restructure code
- `analyze` - Analyze code patterns

### Action Types

The planning phase generates these action types:
- `create_file` - Create a new file
- `update_file` - Update existing file content
- `delete_file` - Delete a file
- `read_file` - Read file for context

Each action can include a `relatedFiles` array populated by the planning phase using the dependency graph, which provides the execution phase with the right context for code generation.

### Core Components

#### 1. State Manager

Manages the agent's state with transactional updates, version tracking, and rollback support:

```typescript
import { StateManager, InMemoryAdapter } from '@ahmedelsharkawycs/forge-ai-sdk';

const stateManager = new StateManager(new InMemoryAdapter());
await stateManager.initialize();

// Transactional update with automatic rollback on error
await stateManager.transaction(async (state) => {
  await stateManager.updateFiles([
    { type: 'update', path: '/file.ts', content: 'new content' }
  ]);
});

// Rollback to previous version (keeps last 10 snapshots)
await stateManager.rollback(previousVersion);
```

#### 2. Virtual File System

Operates on virtual files without touching the real filesystem:

```typescript
import { VirtualFileSystem } from '@ahmedelsharkawycs/forge-ai-sdk';

const vfs = new VirtualFileSystem([
  { path: '/src/app.ts', content: 'code', version: 1, lastModified: Date.now() }
]);

// Write file (auto-detects language from extension)
vfs.writeFile('/src/utils.ts', 'export const add = (a, b) => a + b;');

// Read file
const file = vfs.getFile('/src/utils.ts');

// Find files by pattern
const tsFiles = vfs.findFiles(/\.ts$/);

// Apply batch changes
vfs.applyChanges([
  { type: 'create', path: '/new.ts', content: 'content' },
  { type: 'update', path: '/src/app.ts', content: 'updated' },
  { type: 'delete', path: '/old.ts' }
]);
```

**Supported Languages** (auto-detected from file extension):
- TypeScript (`.ts`, `.tsx`)
- JavaScript (`.js`, `.jsx`)
- JSON (`.json`)
- HTML (`.html`)
- Markdown (`.md`)

#### 3. Policy Gate

Enforce safety policies and restrictions:

```typescript
import { PolicyGate } from '@ahmedelsharkawycs/forge-ai-sdk';

const policyGate = new PolicyGate({
  maxFileSize: 1024 * 1024, // 1MB (default)
  allowedFileTypes: ['ts', 'tsx', 'js', 'jsx', 'json'],
  maxConcurrentActions: 20, // default
  requireConfirmation: true
});

// Validate a plan
const result = policyGate.validatePlan(plan);
if (!result.allowed) {
  console.error(`Policy violation: ${result.reason}`);
}

// Validate path safety (prevents directory traversal, unsafe patterns)
const pathResult = policyGate.validateAction(action);
```

## API Reference

### Agent

Main agent class for orchestrating AI operations.

#### Constructor

```typescript
new Agent(options: AgentOptions)
```

**Options:**
- `adapter`: Storage adapter (InMemoryAdapter, LocalStorageAdapter, NodeFSAdapter)
- `provider`: LLM provider (OpenAIProvider, AnthropicProvider)
- `initialFiles?`: Array of initial virtual files
- `policies?`: Policy configuration
- `autoSave?`: Auto-save state after changes (default: true)

#### Methods

- `initialize()`: Initialize the agent and load state
- `sendMessage(content: string)`: Send a message and get a response
- `getFiles()`: Get all virtual files
- `getFile(path: string)`: Get a specific file
- `getMessages()`: Get message history
- `getState()`: Get current agent state
- `on(event, handler)`: Register event listener
- `once(event, handler)`: Register one-time event listener
- `off(event, handler)`: Remove event listener
- `clear()`: Clear all state
- `destroy()`: Cleanup resources

#### Events

**Phase Events:**
- `intent:start` - Intent phase starting
- `intent:complete` - Intent phase completed
- `plan:start` - Planning phase starting
- `plan:complete` - Planning phase completed
- `execute:start` - Execution phase starting
- `execute:complete` - Execution phase completed
- `validate:start` - Validation phase starting
- `validate:complete` - Validation phase completed

**File Events:**
- `file:create` - File created
- `file:update` - File updated
- `file:delete` - File deleted

**Action Events:**
- `action:start` - Individual action starting
- `action:complete` - Individual action completed
- `action:failed` - Individual action failed

**LLM Events (Non-Streaming):**
- `llm:start` - LLM request starting
- `llm:complete` - LLM request completed

**Streaming Events:**
- `stream:start` - Streaming started
- `stream:chunk` - Received chunk `{ content: string }`
- `stream:complete` - Streaming completed

**Other Events:**
- `message:add` - Message added to history
- `error` - Error occurred

### Storage Adapters

#### InMemoryAdapter

Ephemeral in-memory storage (useful for testing).

```typescript
const adapter = new InMemoryAdapter();
// Deep clones state to prevent external mutations
```

#### LocalStorageAdapter

Browser localStorage persistence with cross-tab sync.

```typescript
const adapter = new LocalStorageAdapter('storage-key'); // default: 'ai-agent-state'

// Watch for external changes (cross-tab sync)
const unsubscribe = adapter.watch((state) => {
  console.log('State changed in another tab');
});
```

#### NodeFSAdapter

Node.js filesystem persistence with atomic writes.

```typescript
const adapter = new NodeFSAdapter('./path/to/state.json');

// Atomic writes (temp file + rename)
// Auto-creates directories
// Optional file watching
const unsubscribe = adapter.watch((state) => {
  console.log('State file changed');
});
```

### LLM Providers

#### OpenAIProvider

```typescript
const provider = new OpenAIProvider({
  apiKey: 'sk-...',
  model: 'gpt-5.2', // default
  organization: 'org-...', // optional
  baseURL: 'https://api.openai.com/v1', // optional
  streaming: true // Enable/disable streaming (default: true)
});

// Supports tool calling and streaming
```

#### AnthropicProvider

```typescript
const provider = new AnthropicProvider({
  apiKey: 'sk-ant-...',
  model: 'claude-sonnet-4-5', // default
  baseURL: 'https://api.anthropic.com', // optional
  streaming: true // Enable/disable streaming (default: true)
});

// Supports tool calling and streaming
```

### Provider Interface

Create custom providers by implementing:

```typescript
interface ILLMProvider {
  name: string;
  complete(request: LLMRequest): Promise<LLMResponse>;
  stream?(request: LLMRequest): AsyncIterable<LLMChunk>;
}
```

## Advanced Usage

### Custom Policy Configuration

```typescript
const agent = new Agent({
  adapter: new InMemoryAdapter(),
  provider: new OpenAIProvider({ apiKey: 'sk-...' }),
  policies: {
    maxFileSize: 500 * 1024, // 500KB
    allowedFileTypes: ['ts', 'tsx'],
    maxConcurrentActions: 20, // default is 20
    requireConfirmation: false
  }
});
```

### State Snapshots and Rollback

```typescript
// State manager keeps last 10 snapshots automatically
const state = agent.getState();
console.log('Current version:', state.version);

// Make changes
await agent.sendMessage('Refactor the code');

// Access the state manager for rollback
// Note: StateManager is internal, access via agent internals if needed
```

### Real-Time Streaming

```typescript
// Listen for streaming chunks
agent.on('stream:start', () => {
  console.log('LLM started generating...');
});

agent.on('stream:chunk', ({ content }) => {
  process.stdout.write(content); // Real-time output
});

agent.on('stream:complete', () => {
  console.log('\nGeneration complete');
});

// Send message - streaming happens automatically if provider supports it
await agent.sendMessage('Generate a complex component');
```

### Event-Driven Workflows

```typescript
// Track all phases
agent.on('intent:start', () => console.log('Analyzing intent...'));
agent.on('intent:complete', (result) => console.log('Intent:', result.type));

agent.on('plan:start', () => console.log('Creating plan...'));
agent.on('plan:complete', (plan) => console.log('Actions:', plan.actions.length));

agent.on('execute:start', () => console.log('Executing...'));
agent.on('action:start', (action) => console.log('Action:', action.type, action.path));
agent.on('action:complete', (action) => console.log('Completed:', action.path));
agent.on('execute:complete', (result) => console.log('Success:', result.success));

agent.on('validate:start', () => console.log('Validating...'));
agent.on('validate:complete', (result) => console.log('Valid:', result.isValid));

agent.on('file:create', (file) => console.log('Created:', file.path));
agent.on('file:update', (file) => console.log('Updated:', file.path));
agent.on('file:delete', (path) => console.log('Deleted:', path));

agent.on('error', (error) => console.error('Error:', error));
```

### Working with Virtual Files

```typescript
// Get all files
const files = agent.getFiles();

// Filter files by pattern
const tsFiles = files.filter(f => f.path.endsWith('.ts'));

// Get file content
const file = agent.getFile('/src/index.ts');
console.log(file?.content);

// Access file metadata
console.log({
  path: file?.path,
  version: file?.version,
  language: file?.language, // Auto-detected
  lastModified: new Date(file?.lastModified)
});
```

### Path Convention

All file paths must start with `/`:

```typescript
// Correct
'/src/components/Button.tsx'
'/utils/helpers.ts'
'/package.json'

// Incorrect (will be normalized)
'src/components/Button.tsx'
'./utils/helpers.ts'
```

## Examples

### Example 1: Code Generation

```typescript
const agent = new Agent({
  adapter: new InMemoryAdapter(),
  provider: new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
  initialFiles: []
});

await agent.initialize();

await agent.sendMessage(
  'Create a TypeScript utility file with functions for string manipulation'
);

const utils = agent.getFile('/src/utils.ts');
console.log(utils?.content);
```

### Example 2: Code Refactoring

```typescript
const agent = new Agent({
  adapter: new LocalStorageAdapter('refactor-session'),
  provider: new AnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY }),
  initialFiles: [
    {
      path: '/src/legacy.js',
      content: oldCode,
      version: 1,
      lastModified: Date.now()
    }
  ]
});

await agent.initialize();
await agent.sendMessage('Convert /src/legacy.js to TypeScript with proper types');

const modernCode = agent.getFile('/src/legacy.ts');
```

### Example 3: Multi-File Project Setup

```typescript
const agent = new Agent({
  adapter: new NodeFSAdapter('./project-state.json'),
  provider: new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY })
});

await agent.initialize();

await agent.sendMessage(`
  Create a React component library with:
  - Button component
  - Input component
  - Card component
  - TypeScript types
  - Index file exporting all components
`);

const files = agent.getFiles();
files.forEach(f => console.log(f.path));
```

### Example 4: Streaming Response

```typescript
const agent = new Agent({
  adapter: new InMemoryAdapter(),
  provider: new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY })
});

await agent.initialize();

// Set up streaming before sending message
let fullContent = '';
agent.on('stream:chunk', ({ content }) => {
  fullContent += content;
  process.stdout.write(content);
});

agent.on('stream:complete', () => {
  console.log('\n--- Streaming complete ---');
  console.log('Total length:', fullContent.length);
});

await agent.sendMessage('Explain this codebase structure');
```

## Type Safety

The SDK is fully typed with TypeScript and uses Zod for runtime validation:

```typescript
import { 
  validateSchema, 
  IntentResultSchema,
  ActionPlanSchema,
  type IntentResult,
  type ActionPlan,
  type ValidationResult
} from '@ahmedelsharkawycs/forge-ai-sdk';

// Validate unknown data
const data: unknown = getLLMResponse();
const result = validateSchema(IntentResultSchema, data);

if (result.success) {
  const intent: IntentResult = result.data;
  console.log(intent.type, intent.confidence);
} else {
  console.error('Validation error:', result.error);
}

// Safe parsing with fallback
import { parseOrDefault } from '@ahmedelsharkawycs/forge-ai-sdk';
const plan = parseOrDefault(ActionPlanSchema, data, defaultPlan);

// ValidationResult uses simple string errors
const validation: ValidationResult = {
  isValid: true,
  summary: '## Changes Summary\n...',
  errors: [] // Simple string array (no more ValidationError objects)
};
```

## Logging

The SDK includes a configurable logger:

```typescript
import { Logger } from '@ahmedelsharkawycs/forge-ai-sdk';

// Create logger with log level
const logger = new Logger('info'); // 'info' | 'debug' | 'error' | 'all' | 'none'

logger.info('Information message');
logger.debug('Debug details');
logger.error('Error occurred', error);

// Create child logger with prefix
const childLogger = logger.createChildLogger('[MyComponent]');
childLogger.info('Prefixed message');

// Access log history
const history = logger.getHistory();
```

## Best Practices

1. **Initialize Before Use**: Always call `agent.initialize()` before sending messages
2. **Use Policies**: Configure appropriate policies for your use case
3. **Handle Events**: Listen to events for better observability
4. **Error Handling**: Wrap agent calls in try-catch blocks
5. **State Persistence**: Choose the right adapter for your environment
6. **Clean Up**: Call `agent.destroy()` when done to free resources
7. **Path Convention**: Always use paths starting with `/`
8. **Streaming**: Use streaming events for better UX in interactive applications

## Security

The SDK includes multiple security features:

- **Path Validation**: Prevents directory traversal attacks (`..`, `//`)
- **File Size Limits**: Prevents memory exhaustion (default 1MB)
- **Type Validation**: Runtime checks with Zod schemas
- **Policy Gates**: Configurable restrictions on actions
- **Virtual State**: No direct filesystem access
- **Unsafe Path Detection**: Blocks system paths, null bytes, invalid characters

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
