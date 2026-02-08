# ForgeAI SDK - Architecture Documentation

## Overview

The ForgeAI SDK (`@ahmedelsharkawycs/forge-ai-sdk`) is a comprehensive, state-based AI agent system designed to work seamlessly across Node.js and browser environments. It manages virtual files as state and operates through a well-defined phase-based orchestration pattern.

## Core Design Principles

1. **State-First Architecture**: All operations work on virtual state, not real files
2. **Phase-Based Execution**: Clear separation of concerns through phases
3. **Cross-Platform Compatibility**: Works in Node.js and browser environments
4. **Pluggable Components**: Storage adapters and LLM providers are swappable
5. **Type Safety**: Full TypeScript support with runtime validation via Zod
6. **Event-Driven**: Rich event system for observability and reactivity
7. **Streaming Support**: Real-time LLM response streaming with automatic detection

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Agent API                               │
│   (sendMessage, getFiles, on/off events, initialize, etc.)      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    ┌───────────┐   ┌────────────┐   ┌─────────────┐
    │   State   │   │   Event    │   │   Policy    │
    │  Manager  │   │  Emitter   │   │    Gate     │
    └───────────┘   └────────────┘   └─────────────┘
          │
          ├─── Virtual File System
          ├─── Storage Adapter (pluggable)
          ├─── Transaction & Rollback
          └─── Snapshot History (last 10)
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    ┌───────────┐   ┌────────────┐   ┌─────────────┐
    │  Intent   │   │  Planning  │   │  Execution  │
    │   Phase   │──▶│   Phase    │──▶│    Phase    │
    └───────────┘   └────────────┘   └─────────────┘
          │                │                │
          │    ┌───────────┴────────┐       │
          │    │  Context Builder   │       │
          │    │  ├ Dependency Graph│       │
          │    │  ├ Package Parser  │       │
          │    │  └ File Context    │       │
          │    └───────────┬────────┘       │
          └────────────────┼────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │   Validation    │
                  │     Phase       │
                  └─────────────────┘
                           │
                           ▼
               ┌─────────────────────┐
               │   Tiered Prompts    │
               │  ┌ Core Identity    │
               │  ├ Stack Definition │
               │  ├ Code Standards   │
               │  └ Phase Roles      │
               └─────────┬───────────┘
                         │
                         ▼
                    LLM Provider
                 (OpenAI, Anthropic)
                         │
             ┌───────────┴───────────┐
             │                       │
        Non-Streaming            Streaming
        (llm:start/complete)  (stream:start/chunk/complete)
```

## Component Breakdown

### 1. Agent Class (`orchestrator/agent.ts`)

**Responsibility**: Main entry point and orchestration coordinator

**Key Methods**:

- `initialize()`: Load state from storage, set up phases
- `sendMessage(content)`: Process user request through all phases
- `getFiles()`: Access virtual files
- `getFile(path)`: Get specific file
- `getMessages()`: Get conversation history
- `getState()`: Get full agent state
- `on/once/off()`: Event management
- `clear()`: Reset state
- `destroy()`: Cleanup resources

**Initialization Flow**:

1. Creates StateManager with adapter
2. Creates PolicyGate with config
3. Creates EventEmitter
4. Initializes all phases with shared dependencies
5. Loads state from adapter

**Message Processing Flow**:

1. Receives user message
2. Adds message to state history
3. Builds PhaseContext (files, messages, previous results)
4. Executes phases sequentially: Intent → Plan → Execute → Validate
5. Builds response with markdown summary
6. Adds assistant message to history
7. Persists state to adapter
8. Returns AgentResponse

### 2. State Management Layer

#### StateManager (`state/state-manager.ts`)

**Responsibility**: Central state coordination with transactional support

**Features**:

- Version tracking (increments on each update)
- Snapshot system (keeps last 10 snapshots for rollback)
- Message history management
- Phase result tracking
- Auto-save to adapter (configurable)

**Key Methods**:

- `initialize()`: Load from adapter or use initialFiles
- `updateFiles(changes)`: Apply file changes via VFS, increment version
- `addMessage(message)`: Add to conversation history
- `setPhase(phase)`: Update current phase
- `addPhaseResult(phase, result)`: Store phase output
- `transaction(callback)`: Atomic operations with auto-rollback on error
- `rollback(version)`: Restore from snapshot
- `persist()`: Save to storage adapter
- `createSnapshot()`: Manual snapshot creation

**State Structure**:

```typescript
interface AgentState {
  files: FileState // Map<path, VirtualFile>
  messages: Message[] // Conversation history
  currentPhase: Phase // Current execution phase
  history: PhaseHistory[] // Phase execution history
  version: number // State version (increments)
  timestamps: {
    created: number
    lastModified: number
  }
}
```

#### VirtualFileSystem (`state/virtual-fs.ts`)

**Responsibility**: Virtual file operations with language inference

**Features**:

- File CRUD operations
- Version tracking per file
- Automatic language inference from extensions (web-only stack)
- Pattern-based file searching
- Batch operations via `applyChanges()`

**Key Methods**:

- `writeFile(path, content, language?)`: Create or update file
- `getFile(path)`: Read file by path
- `deleteFile(path)`: Remove file
- `exists(path)`: Check if file exists
- `applyChanges(changes)`: Batch create/update/delete
- `findFiles(pattern)`: Find files matching regex
- `getAllFiles()`: Get all files as array
- `getFileState()`: Get raw FileState map

**Language Detection**:
Automatically detects language from file extension (focused on web development stack):

- TypeScript: `.ts`, `.tsx`
- JavaScript: `.js`, `.jsx`
- JSON: `.json`
- HTML: `.html`
- Markdown: `.md`

#### Differ (`state/differ.ts`)

**Responsibility**: State diffing and patching using `diff` library

**Methods**:

- `diffFileStates(oldState, newState)`: Compute diffs between two FileStates
- `diffFiles(oldContent, newContent)`: Create patch between two file contents
- `applyPatch(content, patch)`: Apply patch to content
- `snapshot(state)`: Create deep copy of FileState

### 3. Storage Adapters

All adapters implement `IStorageAdapter`:

```typescript
interface IStorageAdapter {
  load(): Promise<AgentState | null>
  save(state: AgentState): Promise<void>
  clear(): Promise<void>
  watch?(callback: (state: AgentState) => void): () => void
}
```

#### InMemoryAdapter (`adapters/memory.adapter.ts`)

- **Use Case**: Testing, ephemeral sessions
- **Storage**: JavaScript memory
- **Persistence**: None (data lost on page refresh)
- **Features**: Deep clones state to prevent external mutations

#### LocalStorageAdapter (`adapters/localstorage.adapter.ts`)

- **Use Case**: Browser persistence
- **Storage**: Browser localStorage
- **Persistence**: Survives page refresh, cleared with browser data
- **Features**:
  - Cross-tab sync via `storage` events
  - Custom storage key (default: `'ai-agent-state'`)
  - Handles Map serialization/deserialization
  - Watch callbacks for external changes

#### NodeFSAdapter (`adapters/node-fs.adapter.ts`)

- **Use Case**: Server-side persistence
- **Storage**: JSON file on disk
- **Persistence**: Permanent until deleted
- **Features**:
  - Atomic writes (temp file + rename) for crash safety
  - Auto-creates directories
  - File watching support
  - Dynamic import of `fs`/`path` modules
  - Pretty-printed JSON (2-space indent)

### 4. Phase System

All phases extend `BasePhase` (`orchestrator/phases/base.phase.ts`):

**BasePhase Features**:

- Unified LLM calling with automatic streaming detection
- Checks if `llmProvider.stream` method exists
- Streaming mode: emits `stream:start`, `stream:chunk`, `stream:complete` events
- Non-streaming mode: emits `llm:start`, `llm:complete` events
- Both modes accumulate full content for response
- Shared access to LLM provider, event emitter, policy gate

#### Intent Phase (`orchestrator/phases/intent.phase.ts`)

**Purpose**: Classify user intent and identify target files

**Input**: PhaseContext with user message, file context, message history

**Output**: IntentResult

```typescript
interface IntentResult {
  type: "create" | "edit" | "delete" | "query" | "refactor" | "analyze"
  confidence: number // 0-1 confidence score
  targetFiles: string[] // Files to operate on
  reasoning: string // Explanation of classification
  metadata?: Record<string, unknown>
}
```

**Process**:

1. Build context from files (max 10, sorted by lastModified)
2. Build messages context (max 10 messages, truncated to 1000 chars)
3. Build package dependencies context from `package.json`
4. Build dependency graph context from file imports
5. Send to LLM with `INTENT_SYSTEM_PROMPT`
6. Parse JSON response
7. Fallback to default query intent on parse failure
8. Emit `intent:complete` event

**Prompt**: Uses `buildIntentUserPrompt()` with user message, files context, messages context, package dependencies, and dependency graph

#### Planning Phase (`orchestrator/phases/plan.phase.ts`)

**Purpose**: Create actionable plan from intent

**Input**: PhaseContext with IntentResult, file context

**Output**: ActionPlan

```typescript
interface ActionPlan {
  actions: Action[]
  estimatedChanges: number
  requiresConfirmation: boolean
  reasoning: string
  dependencies?: string[]
}

interface Action {
  id: string
  type: "create_file" | "update_file" | "delete_file" | "read_file"
  path: string
  description: string
  relatedFiles?: string[] // Files related through imports/dependencies (populated using dependency graph)
}
```

**Process**:

1. Build context with intent result
2. Build package dependencies context
3. Build dependency graph context
4. Request plan from LLM with `PLANNING_SYSTEM_PROMPT`
5. Parse action list from response
6. Validate plan against PolicyGate
7. Throw error if policy violation
8. Emit `plan:complete` event

**Key Design**: The planning phase populates `relatedFiles` on each action using the dependency graph. This tells the execution phase which files to include as context when generating code, ensuring correct import statements and consistent patterns.

**Prompt**: Uses `buildPlanningUserPrompt()` with intent result, file context, package dependencies, and dependency graph

#### Execution Phase (`orchestrator/phases/execute.phase.ts`)

**Purpose**: Execute planned actions and generate/modify file content

**Input**: PhaseContext with ActionPlan

**Output**: ExecutionResult

```typescript
interface ExecutionResult {
  success: boolean
  filesChanged: string[]
  errors: Array<{ action: string; error: string }>
  metadata?: Record<string, unknown>
}
```

**Process**:

1. Execute actions sequentially
2. For each action:
   - Emit `action:start` event
   - Generate content via LLM (separate methods for create vs update)
   - Extract relevant files based on `action.relatedFiles` (populated by plan phase)
   - Build file context (full content for related files)
   - Pass package dependencies and dependency graph as context
   - Validate against policies
   - Apply changes via `StateManager.updateFiles()`
   - Emit `action:complete` or `action:failed` event
3. Emit `execute:complete` event

**Content Generation**:

- Uses `EXECUTION_SYSTEM_PROMPT` for code implementation (composed from tiered prompt modules)
- Two separate methods: `generateCreateFileContent()` and `generateUpdateFileContent()`
- Includes conversation history, package dependencies, and dependency graph
- Extracts code from structured `<code_snippet>` tags (not markdown code fences)
- Code snippets include metadata: `language`, `action_type`, and `path` attributes

**Code Extraction Format**:

The LLM is instructed to wrap output in structured tags:

```xml
<code_snippet language="typescript" action_type="create_file" path="/src/components/Button.tsx">
// file content here
</code_snippet>
```

**Prompt**: Uses `buildExecutionUserPrompt()` with action details, existing content, conversation, related files, package dependencies, and dependency graph

#### Validation Phase (`orchestrator/phases/validate.phase.ts`)

**Purpose**: Validate execution results align with original intent and generate markdown summary

**Input**: PhaseContext with ExecutionResult, IntentResult

**Output**: ValidationResult

```typescript
interface ValidationResult {
  isValid: boolean
  summary: string // Markdown-formatted summary (4 sections: Overview, Files Modified, Key Changes, What's Done Well)
  errors: string[] // Simple error messages (only for intent mismatches or incomplete execution)
}
```

**Process**:

1. Build changes summary for LLM
2. Request validation with `VALIDATION_SYSTEM_PROMPT`
3. Parse validation report with markdown summary
4. Add execution errors to validation errors
5. Emit `validate:complete` event

**Features**:

- Focused on intent alignment verification (not code quality checking)
- Simplified error model: plain string array instead of structured `ValidationError` objects
- No more `warnings` or `suggestions` fields
- `quickValidate()` method for fast checks without LLM call
- Summary follows a fixed 4-section format: Overview, Files Modified, Key Changes, What's Done Well

**Prompt**: Uses `buildValidationUserPrompt()` with execution results and original intent

### 5. Context Builder (`orchestrator/context.ts`)

**Purpose**: Build context objects for phases

**Methods**:

- `buildFilesContext(files, maxFiles)`: Summarize files (default: 10, supports `"all"`, sorted by lastModified)
- `buildMessagesContext(messages, maxMessages, maxLength)`: Build conversation history (max 10 messages, truncated to 1000 chars)
- `buildFileContent(file, maxLines)`: Truncate large files (supports `"all"` for full content, shows first/last halves with note)
- `extractRelevantFiles(files, paths)`: Filter files by paths (case-insensitive, supports directories)
- `buildDependencyGraphContext(files, maxFiles)`: Build dependency graph from file imports/exports (default: 50, supports `"all"`)
- `buildPackageDependenciesContext(files)`: Extract and format dependencies from `package.json`

**Path Convention**:

- All paths must start with `/` (e.g., `/src/components/Button.tsx`)
- Case-insensitive matching
- Directory paths end with `/` (e.g., `/src/components/`)
- Paths are normalized on input

### 6. LLM Providers

All providers implement `ILLMProvider`:

```typescript
interface ILLMProvider {
  name: string
  streamingEnabled: boolean // Whether streaming is enabled via config
  complete(request: LLMRequest): Promise<LLMResponse>
  stream?(request: LLMRequest): AsyncIterable<LLMChunk>
}
```

#### OpenAIProvider (`llm/openai.provider.ts`)

- **SDK**: Uses `openai` package
- **Default Model**: `gpt-5.2`
- **Default Streaming**: `false`
- **Features**:
  - Tool calling support
  - Streaming support (configurable via `streaming` option)
  - Usage tracking (prompt/completion tokens)
  - Finish reason mapping
- **Message Handling**: Converts to OpenAI format, handles system prompts

#### AnthropicProvider (`llm/anthropic.provider.ts`)

- **SDK**: Uses `@anthropic-ai/sdk` package
- **Default Model**: `claude-sonnet-4-5`
- **Default Max Tokens**: `8192`
- **Default Streaming**: `false`
- **Features**:
  - Tool calling support (converts to Anthropic format)
  - Streaming support (configurable via `streaming` option)
  - System prompt handling (separate from messages per Anthropic API)
  - Stop reason mapping (`end_turn` → `stop`, etc.)

### 7. Prompts (`llm/prompts/`)

The prompt system uses a **tiered, composable architecture** split across multiple files. Each phase's system prompt is composed by joining the relevant tiers.

**Tier 1 - Core Identity** (`core.ts`):
- `AGENT_IDENTITY`: Senior software engineer persona, React/TypeScript/MUI/Vite focus, used by ALL phases

**Tier 2 - Stack & Structure** (`stack.ts`):
- `STACK_DEFINITION`: Allowed technologies (React 18+, TypeScript strict, MUI v5+, Vite, styled() API)
- `PROJECT_STRUCTURE`: Feature-based project layout, file extension rules, organizational principles

**Tier 3 - Code Standards** (`standards.ts`):
- `CODE_STANDARDS`: Comprehensive coding guidelines, used ONLY by Execute phase. Includes:
  - React guidelines (component architecture, hooks, patterns)
  - TypeScript guidelines (type system, best practices)
  - MUI guidelines (theme system, design tokens, components)
  - Styling rules (styled() API primary, sx secondary, forbidden approaches)
  - Vite, routing, state management, API patterns
  - Code quality, naming conventions, import order, accessibility, security

**Phase-Specific Prompts** (composed from tiers):

| Prompt File | Tiers Used | Role |
|---|---|---|
| `intent.ts` | Identity + Stack | Intent classification specialist |
| `plan.ts` | Identity + Stack + Structure | Technical architect for action planning |
| `execute.ts` | Identity + Stack + Structure + Standards | Code implementation specialist |
| `validate.ts` | Identity only | Change validator & summary generator |

**User Prompt Builders** (`builders.ts`):

- `buildIntentUserPrompt(message, filesContext, messagesContext, packageDependencies, dependencyGraph)`: Intent classification request
- `buildPlanningUserPrompt(intentResult, fileContext, packageDependencies, dependencyGraph)`: Plan generation request
- `buildExecutionUserPrompt(action, options)`: Code generation request (options include `existingContent`, `conversationSummary`, `fileContext`, `packageDependencies`, `dependencyGraph`)
- `buildValidationUserPrompt(changes, originalIntent)`: Validation request

**Barrel Export** (`index.ts`): Re-exports all prompts and builders for clean imports

### 8. Validation & Safety

#### PolicyGate (`validators/policy-gate.ts`)

**Purpose**: Enforce safety policies and restrictions

**Configuration**:

```typescript
interface PolicyConfig {
  maxFileSize?: number // Default: 1MB
  allowedFileTypes?: string[] // Whitelist of extensions
  maxConcurrentActions?: number // Default: 20
  requireConfirmation?: boolean // Require user confirmation
}
```

**Validation Methods**:

- `validatePlan(plan)`: Validate entire action plan
- `validateAction(action)`: Validate single action
- `validateFileChanges(changes)`: Validate file changes
- `validateFile(file)`: Validate existing file

**Path Safety Checks**:

- Prevents directory traversal (`..`, `//`)
- Blocks system paths
- Detects null bytes
- Validates characters

#### Zod Schemas (`validators/schemas.ts`)

**Purpose**: Runtime type validation for all core types

**Schemas**:

- `VirtualFileSchema`
- `MessageSchema`
- `IntentResultSchema`
- `ActionSchema` (uses `relatedFiles: z.array(z.string()).optional()` instead of `params`)
- `ActionPlanSchema`
- `ExecutionResultSchema`
- `ValidationResultSchema` (simplified: `errors: z.array(z.string())`, no warnings/suggestions)
- `AgentStateSchema`

**Helper Functions**:

- `validateSchema(schema, data)`: Validates and returns typed result or error
- `parseOrDefault(schema, data, fallback)`: Safe parsing with fallback value

### 9. Event System (`events/emitter.ts`)

**Purpose**: Observable agent behavior with simple event emitter

**Methods**:

- `on(event, handler)`: Register listener, returns unsubscribe function
- `once(event, handler)`: Register one-time listener
- `off(event, handler)`: Remove specific listener
- `emit(event, data)`: Emit event to all listeners
- `removeAllListeners(event?)`: Clear listeners

**Event Types** (`types/index.ts`):

| Event               | Description                           | Payload                            |
| ------------------- | ------------------------------------- | ---------------------------------- |
| `file:create`       | File created                          | `VirtualFile`                      |
| `file:update`       | File updated                          | `VirtualFile`                      |
| `file:delete`       | File deleted                          | `string` (path)                    |
| `message:add`       | Message added                         | `Message`                          |
| `intent:start`      | Intent phase starting                 | -                                  |
| `intent:complete`   | Intent phase completed                | `IntentResult`                     |
| `plan:start`        | Planning phase starting               | -                                  |
| `plan:complete`     | Planning phase completed              | `ActionPlan`                       |
| `execute:start`     | Execution phase starting              | -                                  |
| `execute:complete`  | Execution phase completed             | `ExecutionResult`                  |
| `validate:start`    | Validation phase starting             | -                                  |
| `validate:complete` | Validation phase completed            | `ValidationResult`                 |
| `action:start`      | Individual action starting            | `Action`                           |
| `action:complete`   | Individual action completed           | `Action`                           |
| `action:failed`     | Individual action failed              | `{ action: Action, error: Error }` |
| `llm:start`         | LLM request starting (non-streaming)  | -                                  |
| `llm:complete`      | LLM request completed (non-streaming) | `LLMResponse`                      |
| `stream:start`      | Streaming started                     | -                                  |
| `stream:chunk`      | Received stream chunk                 | `{ content: string }`              |
| `stream:complete`   | Streaming completed                   | -                                  |
| `error`             | Error occurred                        | `Error`                            |

### 10. Logger (`utils/logger.ts`)

**Purpose**: Configurable logging with levels and history

**Log Levels**: `'info'`, `'debug'`, `'error'`, `'all'`, `'none'`

**Features**:

- Timestamp formatting (HH:mm:ss.SSS)
- Color coding (cyan for info, magenta for debug, red for error)
- Log history tracking
- Child logger creation with prefixes

**Methods**:

- `info(message, ...args)`: Information level
- `debug(message, ...args)`: Debug level
- `error(message, ...args)`: Error level
- `createChildLogger(prefix)`: Create prefixed child logger
- `getHistory()`: Get log history array

### 11. Dependency Graph (`utils/dependency-graph.ts`)

**Purpose**: Parse import/export statements from virtual files and build a dependency graph

**Types**:

```typescript
interface DependencyGraph {
  dependencies: Map<string, string[]> // file -> files it imports
  dependents: Map<string, string[]> // file -> files that import it
}
```

**Key Functions**:

- `buildDependencyGraph(files)`: Parse all files and build forward/reverse dependency maps
- `formatDependencyGraph(graph, maxFiles)`: Format as readable string for LLM prompts
- `resolveImportPath(specifier, importerPath, existingPaths)`: Resolve import specifiers to absolute paths

**Import Resolution**:

- Handles relative paths (`./Button`, `../hooks/useAuth`)
- Handles absolute paths (`/src/components/Button`)
- Tries extensions: `.ts`, `.tsx`, `.js`, `.jsx`
- Tries index files: `/index.ts`, `/index.tsx`, `/index.js`, `/index.jsx`
- Skips bare modules (third-party: `react`, `@mui/material`, etc.)

**Supported Import Patterns**:

- ES6 imports: `import ... from '...'`
- ES6 re-exports: `export ... from '...'`
- Dynamic imports: `import('...')`
- CommonJS require: `require('...')`

### 12. Package Parser (`utils/package-parser.ts`)

**Purpose**: Parse `package.json` content and format dependency information for LLM prompts

**Types**:

```typescript
interface PackageDependencies {
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  peerDependencies: Record<string, string>
  scripts: Record<string, string>
}
```

**Key Functions**:

- `parsePackageJson(content)`: Parse raw JSON string into `PackageDependencies` (returns null on failure)
- `formatPackageDependencies(deps)`: Format as readable string showing production deps, dev deps, peer deps, and scripts

### 13. Project Templates (`templates/`)

**Purpose**: Pre-built project templates for quickly bootstrapping new projects with the correct structure

**Available Templates**:

- `getReactMUIViteTemplate()`: Returns an array of `VirtualFile[]` with a complete React + Vite + TypeScript + MUI project

**Template Files Included**:

| File | Description |
|---|---|
| `/src/App.tsx` | Welcome page component with MUI components |
| `/src/main.tsx` | Entry point with ThemeProvider and CssBaseline |
| `/src/theme/theme.ts` | Full MUI theme configuration (palette, typography, spacing, component overrides) |
| `/src/vite-env.d.ts` | Vite environment type reference |
| `/index.html` | HTML entry point |
| `/package.json` | Dependencies (React 18, MUI 5, Emotion, Vite 5, TypeScript 5.6) |
| `/vite.config.ts` | Vite configuration with React plugin |
| `/tsconfig.json` | Strict TypeScript configuration |
| `/tsconfig.node.json` | Node-specific TypeScript configuration |

**Usage**: Pass as `initialFiles` to `Agent` constructor for a ready-to-use project scaffold.

## Data Flow

### Request Processing Flow

```
User Message
    ↓
[Agent.sendMessage()]
    ↓
Add to messages → StateManager.addMessage()
    ↓
Emit 'message:add' event
    ↓
Build PhaseContext (files, messages)
    ↓
[Intent Phase]
    ├─ Emit 'intent:start'
    ├─ Build context → ContextBuilder (files, messages, package deps, dependency graph)
    ├─ Call LLM → LLMProvider.complete() or stream()
    ├─ Parse & validate → IntentResultSchema
    ├─ Store result → StateManager.addPhaseResult()
    └─ Emit 'intent:complete'
    ↓
[Planning Phase]
    ├─ Emit 'plan:start'
    ├─ Build context with intent, package deps, dependency graph
    ├─ Call LLM → LLMProvider.complete() or stream()
    ├─ Parse & validate → ActionPlanSchema (actions include relatedFiles)
    ├─ Check policies → PolicyGate.validatePlan()
    ├─ Store result → StateManager.addPhaseResult()
    └─ Emit 'plan:complete'
    ↓
[Execution Phase]
    ├─ Emit 'execute:start'
    ├─ For each action:
    │   ├─ Emit 'action:start'
    │   ├─ Get relevant files from action.relatedFiles (populated by plan phase)
    │   ├─ Generate content → LLM (with package deps + dependency graph)
    │   ├─ Extract code from <code_snippet> tags
    │   ├─ Validate → PolicyGate.validateFileChanges()
    │   ├─ Apply changes → StateManager.updateFiles()
    │   ├─ Emit file events (file:create/update/delete)
    │   └─ Emit 'action:complete' or 'action:failed'
    ├─ Store result → StateManager.addPhaseResult()
    └─ Emit 'execute:complete'
    ↓
[Validation Phase]
    ├─ Emit 'validate:start'
    ├─ Build changes summary
    ├─ Call LLM → LLMProvider.complete() or stream()
    ├─ Parse & validate → ValidationResultSchema
    ├─ Store result → StateManager.addPhaseResult()
    └─ Emit 'validate:complete'
    ↓
Build response message (markdown summary)
    ↓
Add assistant message → StateManager.addMessage()
    ↓
Persist state → StorageAdapter.save()
    ↓
Return AgentResponse
```

### State Update Flow

```
File Changes Request
    ↓
StateManager.updateFiles(changes)
    ↓
Create snapshot (for rollback)
    ↓
VirtualFileSystem.applyChanges(changes)
    ↓
For each change:
    ├─ create: VFS.writeFile() → Emit 'file:create'
    ├─ update: VFS.writeFile() → Emit 'file:update'
    └─ delete: VFS.deleteFile() → Emit 'file:delete'
    ↓
Update AgentState
    ├─ Increment version
    ├─ Update lastModified timestamp
    └─ Update files state
    ↓
Auto-save (if enabled)
    ↓
StorageAdapter.save(state)
```

### Streaming Flow

```
LLM Request
    ↓
Check provider.streamingEnabled config
    ↓
┌─────────────────────────────────────┐
│ Streaming Mode (streamingEnabled)   │
├─────────────────────────────────────┤
│ Emit 'stream:start'                 │
│    ↓                                │
│ For each chunk:                     │
│    ├─ Emit 'stream:chunk'           │
│    └─ Accumulate content            │
│    ↓                                │
│ Emit 'stream:complete'              │
│    ↓                                │
│ Return full accumulated content     │
└─────────────────────────────────────┘
    OR
┌─────────────────────────────────────┐
│ Non-Streaming Mode (!streamingEnabled)│
├─────────────────────────────────────┤
│ Emit 'llm:start'                    │
│    ↓                                │
│ Await provider.complete()           │
│    ↓                                │
│ Emit 'llm:complete'                 │
│    ↓                                │
│ Return response content             │
└─────────────────────────────────────┘
```

## Type System

### Core State Types (`types/state.ts`)

```typescript
interface VirtualFile {
  path: string
  content: string
  language?: string
  metadata?: Record<string, unknown>
  version: number
  lastModified: number
}

type FileState = Map<string, VirtualFile>

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: number
  metadata?: Record<string, unknown>
}

type Phase = "idle" | "intent" | "planning" | "executing" | "validating" | "completed" | "error"

interface StateSnapshot {
  state: AgentState
  version: number
  timestamp: number
}
```

### Phase Types (`types/phases.ts`)

```typescript
interface Action {
  id: string
  type: "create_file" | "update_file" | "delete_file" | "read_file"
  path: string
  description: string
  relatedFiles?: string[] // Files related through imports/dependencies (populated by plan phase using dependency graph)
}

interface ValidationResult {
  isValid: boolean
  summary: string // Markdown-formatted summary (4 sections: Overview, Files Modified, Key Changes, What's Done Well)
  errors: string[] // Simple error messages (only for intent mismatches or incomplete execution)
}

interface PhaseContext {
  files: VirtualFile[]
  messages: Message[]
  intent?: IntentResult
  plan?: ActionPlan
  execution?: ExecutionResult
}
```

### Provider Types (`types/providers.ts`)

```typescript
interface LLMRequest {
  messages: LLMMessage[]
  systemPrompt?: string
  tools?: LLMTool[]
  stream?: boolean
}

interface LLMResponse {
  content: string
  toolCalls?: ToolCall[]
  finishReason?: string
  usage?: { promptTokens: number; completionTokens: number }
}

interface LLMChunk {
  delta: string
  isComplete: boolean
}

interface LLMProviderConfig {
  apiKey: string
  model?: string
  baseURL?: string
  organization?: string // OpenAI only
  temperature?: number
  maxTokens?: number
  streaming?: boolean // Enable/disable streaming (default: false)
}
```

## Extension Points

### Creating Custom Storage Adapter

```typescript
import { IStorageAdapter, AgentState } from "@ahmedelsharkawycs/forge-ai-sdk"

class RedisAdapter implements IStorageAdapter {
  constructor(
    private client: RedisClient,
    private key: string
  ) {}

  async load(): Promise<AgentState | null> {
    const data = await this.client.get(this.key)
    return data ? JSON.parse(data) : null
  }

  async save(state: AgentState): Promise<void> {
    await this.client.set(this.key, JSON.stringify(state))
  }

  async clear(): Promise<void> {
    await this.client.del(this.key)
  }

  watch(callback: (state: AgentState) => void): () => void {
    // Implement pub/sub for real-time sync
    const subscription = this.client.subscribe(this.key, (data) => {
      callback(JSON.parse(data))
    })
    return () => subscription.unsubscribe()
  }
}
```

### Creating Custom LLM Provider

```typescript
import { ILLMProvider, LLMRequest, LLMResponse, LLMChunk } from "@ahmedelsharkawycs/forge-ai-sdk"

class OllamaProvider implements ILLMProvider {
  name = "ollama"

  constructor(private config: { model: string; baseURL: string }) {}

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const response = await fetch(`${this.config.baseURL}/api/generate`, {
      method: "POST",
      body: JSON.stringify({
        model: this.config.model,
        prompt: this.buildPrompt(request),
        stream: false
      })
    })
    const data = await response.json()
    return { content: data.response }
  }

  async *stream(request: LLMRequest): AsyncIterable<LLMChunk> {
    const response = await fetch(`${this.config.baseURL}/api/generate`, {
      method: "POST",
      body: JSON.stringify({
        model: this.config.model,
        prompt: this.buildPrompt(request),
        stream: true
      })
    })

    const reader = response.body?.getReader()
    if (!reader) throw new Error("No response body")

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = JSON.parse(new TextDecoder().decode(value))
      yield { delta: chunk.response, isComplete: chunk.done }
    }
  }

  private buildPrompt(request: LLMRequest): string {
    // Convert messages to prompt format
  }
}
```

### Custom Policy Rules

```typescript
import { PolicyGate } from "@ahmedelsharkawycs/forge-ai-sdk"

// Extend PolicyGate for custom rules
class StrictPolicyGate extends PolicyGate {
  constructor() {
    super({
      maxFileSize: 100 * 1024, // 100KB
      allowedFileTypes: ["ts", "tsx"],
      maxConcurrentActions: 3,
      requireConfirmation: true
    })
  }

  validateAction(action: Action): PolicyResult {
    // Add custom validation
    if (action.path.includes("node_modules")) {
      return { allowed: false, reason: "Cannot modify node_modules" }
    }
    return super.validateAction(action)
  }
}
```

## Performance Considerations

1. **State Snapshots**: Limited to last 10 versions by default (configurable)
2. **File Context**: Supports configurable truncation (`maxLines` parameter, supports `"all"` for full content)
3. **Message History**: Limits to 10 recent messages sent to LLM (truncated to 1000 chars each)
4. **Files Context**: Limits to 10 files sorted by lastModified (supports `"all"`)
5. **Atomic Operations**: Uses transactions for state consistency
6. **Event Emission**: Synchronous handlers, avoid blocking operations
7. **Streaming**: Reduces perceived latency for long responses
8. **Dependency Graph**: Efficiently parsed from file content, cached per request
9. **Tiered Prompts**: Validation phase uses minimal prompt (Identity only), reducing token usage

## Security Considerations

1. **Path Validation**: Prevents directory traversal attacks (`..`, `//`)
2. **File Size Limits**: Prevents memory exhaustion (default 1MB)
3. **Type Validation**: Runtime checks with Zod schemas
4. **Policy Gates**: Configurable restrictions on actions
5. **Virtual State**: No direct file system access
6. **Unsafe Path Detection**: Blocks system paths, null bytes, invalid characters
7. **Action Limits**: Prevents runaway action execution

## Design Patterns

1. **Phase-based Orchestration**: Clear separation of concerns
2. **Strategy Pattern**: Pluggable adapters and providers
3. **Observer Pattern**: Event-driven architecture
4. **State Pattern**: Phase transitions managed by StateManager
5. **Template Method**: BasePhase provides unified LLM calling
6. **Factory Pattern**: ContextBuilder creates context objects
7. **Memento Pattern**: Snapshots for state rollback
8. **Composition Pattern**: Tiered prompts composed from reusable modules
9. **Graph Pattern**: Dependency graph for import/export relationship tracking

## Testing Strategy

1. **Unit Tests**: Test individual components (phases, adapters, etc.)
2. **Integration Tests**: Test phase orchestration
3. **E2E Tests**: Test full agent workflow
4. **Mock LLM**: Use controlled responses for deterministic testing
5. **Mock Storage**: Use InMemoryAdapter for isolated tests
6. **Event Testing**: Verify event emission order and payloads

## Future Enhancements

1. **Parallel Actions**: Execute independent actions concurrently
2. **Plugin System**: Third-party phase implementations
3. **Conflict Resolution**: Handle concurrent state modifications
4. **Undo/Redo**: User-facing state navigation
5. **Rate Limiting**: LLM API throttling
6. **Caching**: Cache LLM responses for similar requests
7. **Multi-Agent**: Coordinate multiple agents
8. **Middleware**: Pre/post processing hooks for phases
9. **Metrics**: Performance and usage tracking
10. **WebSocket Support**: Real-time state sync across clients

## Debugging

Enable detailed logging:

```typescript
import { Logger } from "@ahmedelsharkawycs/forge-ai-sdk"

const logger = new Logger("all")

// Track all events
agent.on("intent:start", () => logger.info("Intent phase starting"))
agent.on("intent:complete", (r) => logger.debug("Intent:", r))
agent.on("plan:complete", (p) => logger.debug("Plan:", p.actions))
agent.on("action:start", (a) => logger.info("Action:", a.type, a.path))
agent.on("stream:chunk", ({ content }) => process.stdout.write(content))
agent.on("error", (e) => logger.error("Error:", e))
```

Access internals:

```typescript
const state = agent.getState()
console.log("Version:", state.version)
console.log("Phase:", state.currentPhase)
console.log(
  "Files:",
  agent.getFiles().map((f) => f.path)
)
console.log("Messages:", agent.getMessages().length)
```

## Conclusion

The ForgeAI SDK provides a robust, extensible foundation for building AI-powered applications that manipulate code and files. Its phase-based architecture ensures clear separation of concerns, while its pluggable components enable customization for specific use cases. The tiered prompt system, dependency graph, and package-aware context provide the LLM with rich, accurate information for high-quality code generation. The event-driven design with streaming support enables rich, real-time user experiences.
