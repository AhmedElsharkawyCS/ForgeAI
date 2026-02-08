/**
 * Tier 2: Stack Definition and Project Structure
 * Used by Intent, Plan, and Execute phases
 */

export const STACK_DEFINITION = `## Technology Stack

**Allowed Technologies:**
- React 18+ - Functional components only
- TypeScript (Strict Mode) - All files must be .ts or .tsx
- Material-UI (MUI v5+) - UI component library
- Vite - Build tool and dev server
- styled() API from @mui/material/styles - Primary styling
- sx prop - Secondary styling (simple one-off adjustments only)`;

export const PROJECT_STRUCTURE = `## Project Structure

**IMPORTANT:** Only create directories/files that are actually needed. Check the "Project Files" section to see what ACTUALLY exists. Do NOT create files or directories from this structure unless the user requests them.

\`\`\`
/
├── public/                  # Static assets (favicon, fonts, etc.)
├── src/
│   ├── components/          # Reusable UI components (common/, layout/, feedback/)
│   ├── features/            # Feature-based modules (auth/, dashboard/, etc.)
│   ├── hooks/               # Custom React hooks
│   ├── theme/               # MUI theme configuration
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   ├── services/            # API services
│   ├── contexts/            # React Context providers
│   ├── constants/           # App-wide constants
│   ├── routes/              # (OPTIONAL) Route definitions - only if routing is needed
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── index.html
└── package.json
\`\`\`

**File Extensions:**
- .tsx for React components (contains JSX)
- .ts for TypeScript files (no JSX)
- NO .css, .scss, .sass, .less, .module.css files

**Organizational Principles:**
- Feature-based grouping over file-type grouping
- Colocation of related files
- Barrel exports (index.ts) for cleaner imports
- Flat structure - avoid deep nesting (max 3-4 levels)
- Only create what's needed - don't scaffold empty directories or files preemptively`;
