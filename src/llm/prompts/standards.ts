/**
 * Tier 3: Code Standards and Best Practices
 * Used ONLY by Execute phase
 */

const REACT_GUIDELINES = `## React 18+ Guidelines

**Component Architecture**
- Functional components ONLY - never use class components
- Single Responsibility Principle: Every component does ONE thing well
- NEVER build large, monolithic components that handle multiple concerns
- Break into small, focused, composable pieces
- Component size limit: If a component exceeds ~150 lines, it MUST be decomposed into smaller sub-components
- Extract logic into custom hooks - keep components focused on rendering
- Component composition over inheritance - compose behavior from smaller pieces
- Props interface: Explicit TypeScript interface for every component

**React Hooks**
- useState - Local component state
- useEffect - Side effects and lifecycle
- useCallback - Memoized callbacks passed to children
- useMemo - Expensive calculations
- useContext - Access context values
- useReducer - Complex state logic
- useRef - DOM references and mutable values
- useId - Stable unique IDs for accessibility
- Custom hooks for reusable logic (data fetching, form state, timers, etc.)

**Advanced Patterns**
- React.memo() - Prevent unnecessary re-renders for expensive components
- React.forwardRef() - Forward refs to DOM elements or child components
- Context API - Cross-cutting concerns (theme, auth, locale)
- Strict Mode enabled - Catch potential problems early`;

const TYPESCRIPT_GUIDELINES = `## TypeScript Guidelines (Strict Mode)

**Type System**
- Interface-first design - Define interfaces for all props, API responses, state shapes
- Proper type inference - Let TypeScript infer when obvious, explicit only when necessary
- Generic types - Reusable components and hooks with type parameters
- Discriminated unions - Type-safe state machines and variant handling
- Utility types - Leverage built-ins: Partial, Pick, Omit, Record, Required, Readonly, ReturnType, Parameters, Exclude, Extract

**Best Practices**
- NEVER use \`any\` - Use \`unknown\` with type guards, or define proper types
- Type-only imports - Use \`import type { }\` for types to optimize bundle
- Const assertions - \`as const\` for literal types and readonly arrays
- Module augmentation - Extend MUI theme types with custom properties
- Return type annotations - Explicit return types for public API functions
- Zod for runtime validation - Validate external data (API responses, user input)`;

const MUI_GUIDELINES = `## Material-UI (MUI v5+) Guidelines

**Theme System**
- createTheme() - Centralized theme configuration in /src/theme/
- Theme augmentation - Extend theme with custom properties via TypeScript module declaration
- CssBaseline - Normalize styles across browsers (include in App.tsx)
- useTheme() hook - Access theme in components
- useMediaQuery() hook - Responsive behavior beyond CSS breakpoints

**Design Tokens**
- Palette: primary, secondary, error, warning, info, success + custom colors
- Dark/light mode: Toggle via \`palette.mode\` (light or dark)
- Typography: h1-h6, body1, body2, caption, button, overline
- Spacing: theme.spacing() - 8px base unit
- Breakpoints: xs, sm, md, lg, xl
- Shadows: theme.shadows[0-24]
- Z-index: theme.zIndex
- Transitions: theme.transitions

**Common Components**
- Snackbar/Alert - User notifications and feedback messages
- Skeleton - Loading state placeholders
- Dialog - Modal dialogs for confirmations and forms
- DataGrid - Tables with sorting, filtering, pagination (from @mui/x-data-grid)

**Component Patterns**
- Component variants - Extend MUI components with custom variants
- Component props via theme - Define default props in theme
- Responsive design - Use breakpoint objects in styled() and sx`;

const STYLING_RULES = `## Styling Rules

**PRIMARY: MUI styled() API**

Use the \`styled()\` API for ALL component styling.

\`\`\`typescript
import { styled } from '@mui/material/styles';
import { Card } from '@mui/material';

const StyledCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius * 2,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[2],
  
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
  
  '&:hover': {
    boxShadow: theme.shadows[4],
  },
}));
\`\`\`

**SECONDARY: sx Prop**

Use \`sx\` prop ONLY for simple, one-off inline adjustments.

**FORBIDDEN Styling Approaches (NEVER USE)**
- Plain CSS files (.css, .scss, .sass, .less)
- CSS Modules (.module.css)
- Tailwind CSS or any utility-first CSS frameworks
- Other CSS-in-JS libraries (styled-components, emotion standalone)
- JavaScript files (.js, .jsx) - TypeScript only
- Class components - functional components only
- Inline style={{}} attribute - use styled() or sx instead
- className with string literals - use styled() or sx instead

**Naming Convention**
- Descriptive PascalCase: \`StyledCard\`, \`StyledFormWrapper\`, \`PageContainer\`
- Co-locate styled components with their parent component`;

const VITE_GUIDELINES = `## Vite Guidelines

**Environment Variables**
- Prefix: All env vars MUST start with \`VITE_\` to be exposed to client
- Access: \`import.meta.env.VITE_API_URL\`
- Files: .env (shared), .env.local (local overrides), .env.production (production)
- TypeScript: Define types in \`vite-env.d.ts\`

**Code Splitting**
- Dynamic imports for routes: \`const Home = lazy(() => import('./pages/Home'))\`
- Use React.lazy() + Suspense for routes and heavy components
- Manual chunks in vite.config.ts for vendor splitting

**Asset Handling**
- Images: \`import logo from './logo.png'\` - returns URL
- SVGs as React components: \`import { ReactComponent as Icon } from './icon.svg?react'\`
- Fonts: Place in \`/public\` or import directly

**Development**
- HMR: Built-in Hot Module Replacement
- Proxy: Configure proxy in vite.config.ts for API development`;

const ROUTING_GUIDELINES = `## React Router v6+ Guidelines

**IMPORTANT:** Routing is OPTIONAL. Only add routing when:
- The user explicitly requests routing, navigation, or multiple pages
- \`react-router-dom\` is already listed in package.json dependencies

**Router Setup (when needed)**
- Use \`createBrowserRouter\` + \`RouterProvider\` (data router)
- Define routes in \`/src/routes\` directory
- Route-based code splitting with React.lazy()

**Routing Patterns**
- Nested routes - Use \`<Outlet />\` for layout composition
- Protected routes - Wrapper components or loader functions for auth guards
- Error boundaries - \`errorElement\` for route-level error handling
- Loading states - Suspense fallbacks for lazy-loaded routes

**Key Hooks**
- useNavigate() - Programmatic navigation
- useParams() - Access URL parameters
- useSearchParams() - Read/write query strings
- useLocation() - Current location object`;

const STATE_MANAGEMENT = `## State Management Patterns

**Local State (Component-Level)**
- useState - Simple state (strings, numbers, booleans, simple objects)
- useReducer - Complex state with multiple sub-values or interdependent updates

**Shared State (Application-Level)**
- Context API - Cross-cutting concerns (theme, authentication, user preferences, locale)
- Create context + provider + custom hook pattern
- Separate contexts by concern (don't create one giant context)

**Server State (API Data)**
- TanStack Query (React Query) - Cache, synchronization, and lifecycle management
- Automatic background refetching
- Optimistic updates
- Request deduplication

**Form State**
- react-hook-form + zod - Recommended pattern for form validation and state
- Type-safe validation schemas
- Minimal re-renders

**URL State**
- React Router search params - Filters, pagination, search queries
- Shareable state via URL
- useSearchParams() for read/write

**Principles**
- Keep state as local as possible
- Lift state up only when necessary
- Avoid prop drilling beyond 2 levels - use Context or composition
- Immutable updates - never mutate state directly`;

const API_PATTERNS = `## API Integration Patterns

**Centralized Axios Instance**
- Create a configured axios instance in /src/services/api.ts
- Set baseURL from environment variables
- Configure request/response interceptors for auth tokens and error handling

**Type-Safe API Functions**
- Define interfaces for all API responses
- Use generics for reusable request patterns
- Return typed promises

**Best Practices**
- Loading/error/success states for every API call
- Request cancellation with AbortController for cleanup
- Optimistic updates where appropriate (TanStack Query)
- Error boundaries for unhandled API errors
- Centralized error handling via interceptors`;

const CODE_QUALITY = `## Code Quality Standards

**Component Design**
- Single Responsibility - One component, one purpose
- Named exports - Better tree-shaking than default exports
- Container/Presentational pattern - Separate logic from UI

**File Size Guidelines**
- Components: ~150 lines max - decompose if larger
- General files: 300 lines max - split if larger
- One component per file (styled components can be co-located)

**Performance Optimization**
- React.memo - Wrap expensive components
- useMemo - Cache expensive calculations
- useCallback - Memoize callbacks passed to children
- Lazy loading - Code-split routes and heavy components
- Virtualization - Large lists (react-window, @tanstack/react-virtual)
- Debounce/Throttle - High-frequency events (search, resize, scroll)
- Proper dependency arrays - Avoid unnecessary re-renders

**Error Handling**
- Error Boundaries - Component-level error catching with fallback UI
- Try-catch - Async operations
- MUI Alert component - Display user-facing error messages
- User-friendly messages - Never expose technical errors to users
- Centralized logging - Log errors to monitoring service
- Fallback UI - Graceful degradation`;

const NAMING_CONVENTIONS = `## Naming Conventions

**Files**
- Components: \`PascalCase\` (e.g., \`UserProfile.tsx\`)
- Hooks: \`camelCase\` with \`use\` prefix (e.g., \`useAuth.ts\`)
- Utils: \`camelCase\` (e.g., \`formatDate.ts\`)
- Types: \`camelCase\` (e.g., \`user.ts\`) - types inside are PascalCase

**Code Elements**
- Types/Interfaces: \`PascalCase\` (e.g., \`User\`, \`ApiResponse\`)
- Components: \`PascalCase\` (e.g., \`UserProfile\`, \`LoginForm\`)
- Styled components: \`PascalCase\` (e.g., \`StyledCard\`, \`PageWrapper\`)
- Functions: \`camelCase\` (e.g., \`formatDate\`, \`fetchUserData\`)
- Variables: \`camelCase\` (e.g., \`userData\`, \`isLoading\`)
- Constants: \`UPPER_SNAKE_CASE\` (e.g., \`API_BASE_URL\`, \`MAX_RETRIES\`)
- Boolean variables: \`is/has/should\` prefix (e.g., \`isLoading\`, \`hasError\`)
- Event handlers: \`handle\` prefix (e.g., \`handleSubmit\`, \`handleClick\`)`;

const IMPORT_ORDER = `## Import Order Convention

Organize imports into groups with blank lines between:
1. React and React ecosystem (react, react-dom, react-router-dom)
2. Third-party libraries (MUI, axios, zod, etc.)
3. Internal relative imports (./Component, ../utils)
4. Type-only imports
5. Asset imports (images, SVGs, fonts)`;

const ACCESSIBILITY = `## Accessibility (A11y) Standards

**Semantic HTML**
- Use semantic elements: \`<nav>\`, \`<main>\`, \`<section>\`, \`<article>\`, \`<header>\`, \`<footer>\`
- Proper heading hierarchy: h1 → h2 → h3 (no skipping levels)
- Use \`<button>\` for actions, \`<a>\` for navigation

**ARIA Attributes**
- Use ARIA only when semantic HTML is insufficient
- Common attributes: \`aria-label\`, \`aria-describedby\`, \`aria-labelledby\`, \`aria-live\`, \`role\`
- \`aria-hidden="true"\` for decorative elements

**Keyboard Navigation**
- All interactive elements must be keyboard accessible
- Logical tab order (\`tabIndex\` when needed)
- Focus management: modals should trap focus
- Visible focus indicators (don't remove outline without replacement)

**Color Contrast**
- WCAG AA compliance: 4.5:1 for normal text, 3:1 for large text
- Don't rely solely on color to convey information

**Screen Readers**
- Provide text alternatives for images (\`alt\` attribute)
- Announce dynamic content with \`aria-live\` regions
- Label form inputs properly

**MUI Accessibility**
- MUI components have good accessibility defaults
- Use MUI's built-in ARIA props
- FormLabel + FormControl provide proper associations`;

const SECURITY_ESSENTIALS = `## Security Best Practices

**XSS Prevention**
- NEVER use \`dangerouslySetInnerHTML\` without sanitization
- Use DOMPurify to sanitize any user-generated HTML
- MUI components handle escaping automatically

**Data Validation**
- Use Zod for runtime validation of API responses and form data
- Validate at application boundaries

**Environment Variables**
- Prefix with \`VITE_\` for client-side exposure
- NEVER expose API keys, secrets, or credentials client-side
- Use server-side proxy for sensitive API calls
- Keep .env files out of version control

**Authentication**
- httpOnly cookies preferred over localStorage when possible
- Clear tokens on logout
- Check auth state on route change for protected routes`;

export const CODE_STANDARDS = [
  REACT_GUIDELINES,
  TYPESCRIPT_GUIDELINES,
  MUI_GUIDELINES,
  STYLING_RULES,
  VITE_GUIDELINES,
  ROUTING_GUIDELINES,
  STATE_MANAGEMENT,
  API_PATTERNS,
  CODE_QUALITY,
  NAMING_CONVENTIONS,
  IMPORT_ORDER,
  ACCESSIBILITY,
  SECURITY_ESSENTIALS,
].join('\n\n');
