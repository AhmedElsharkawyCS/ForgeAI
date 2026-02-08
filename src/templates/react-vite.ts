/**
 * React + Vite Default Template
 * The default project template for the AI Agent SDK
 */

import type { VirtualFile } from '../types';

/**
 * Get the default project template (React + Vite + TypeScript + MUI)
 * This is the recommended starting point for all AI-generated projects
 */
export function getReactMUIViteTemplate(): VirtualFile[] {
  const now = Date.now();

  return [
    {
      path: '/src/App.tsx',
      content: getAppComponent(),
      language: 'typescript',
      version: 1,
      lastModified: now,
    },
    {
      path: '/src/main.tsx',
      content: getMainEntry(),
      language: 'typescript',
      version: 1,
      lastModified: now,
    },
    {
      path: '/src/theme/theme.ts',
      content: getThemeConfig(),
      language: 'typescript',
      version: 1,
      lastModified: now,
    },
    {
      path: '/src/vite-env.d.ts',
      content: getViteEnvTypes(),
      language: 'typescript',
      version: 1,
      lastModified: now,
    },
    {
      path: '/index.html',
      content: getIndexHtml(),
      language: 'html',
      version: 1,
      lastModified: now,
    },
    {
      path: '/package.json',
      content: generatePackageJson(),
      language: 'json',
      version: 1,
      lastModified: now,
    },
    {
      path: '/vite.config.ts',
      content: getViteConfig(),
      language: 'typescript',
      version: 1,
      lastModified: now,
    },
    {
      path: '/tsconfig.json',
      content: getTsConfig(),
      language: 'json',
      version: 1,
      lastModified: now,
    },
    {
      path: '/tsconfig.node.json',
      content: getTsConfigNode(),
      language: 'json',
      version: 1,
      lastModified: now,
    },
  ];
}

export function generatePackageJson(): string {
  return JSON.stringify(
    {
      name: 'ai-generated-app',
      private: true,
      version: '0.0.1',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      },
      dependencies: {
        react: '^18.3.1',
        'react-dom': '^18.3.1',
        '@mui/material': '^5.15.0',
        '@mui/icons-material': '^5.15.0',
        '@emotion/react': '^11.11.3',
        '@emotion/styled': '^11.11.0',
      },
      devDependencies: {
        '@types/react': '^18.3.12',
        '@types/react-dom': '^18.3.1',
        '@vitejs/plugin-react': '^4.3.3',
        typescript: '~5.6.2',
        vite: '^5.4.10',
      },
    },
    null,
    2
  );
}

export function getViteConfig(): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
  },
});
`;
}

export function getTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
      },
      include: ['src'],
      references: [{ path: './tsconfig.node.json' }],
    },
    null,
    2
  );
}

export function getTsConfigNode(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        composite: true,
        skipLibCheck: true,
        module: 'ESNext',
        moduleResolution: 'bundler',
        allowSyntheticDefaultImports: true,
        strict: true,
      },
      include: ['vite.config.ts'],
    },
    null,
    2
  );
}

export function getAppComponent(): string {
  const lines = [
    "import { Container, Typography, Box, Button } from '@mui/material';",
    "import { RocketLaunch } from '@mui/icons-material';",
    '',
    'function App() {',
    '  return (',
    '    <Container maxWidth="lg">',
    '      <Box',
    '        sx={{',
    "          minHeight: '100vh',",
    "          display: 'flex',",
    "          flexDirection: 'column',",
    "          alignItems: 'center',",
    "          justifyContent: 'center',",
    "          textAlign: 'center',",
    '          py: 4,',
    '        }}',
    '      >',
    "        <RocketLaunch sx={{ fontSize: 80, color: 'primary.main', mb: 3 }} />",
    '        ',
    '        <Typography variant="h2" component="h1" gutterBottom>',
    '          Welcome to Your React App',
    '        </Typography>',
    '        ',
    '        <Typography variant="h5" color="text.secondary" paragraph>',
    '          Ask the AI to build something amazing!',
    '        </Typography>',
    '        ',
    '        <Box sx={{ mt: 4 }}>',
    '          <Button',
    '            variant="contained"',
    '            size="large"',
    '            startIcon={<RocketLaunch />}',
    '          >',
    '            Get Started',
    '          </Button>',
    '        </Box>',
    '      </Box>',
    '    </Container>',
    '  );',
    '}',
    '',
    'export default App;',
  ];

  return lines.join('\n');
}

export function getMainEntry(): string {
  const lines = [
    "import React from 'react';",
    "import ReactDOM from 'react-dom/client';",
    "import { ThemeProvider, CssBaseline } from '@mui/material';",
    "import App from './App';",
    "import { theme } from './theme/theme';",
    '',
    "ReactDOM.createRoot(document.getElementById('root')!).render(",
    '  <React.StrictMode>',
    '    <ThemeProvider theme={theme}>',
    '      <CssBaseline />',
    '      <App />',
    '    </ThemeProvider>',
    '  </React.StrictMode>',
    ');',
  ];

  return lines.join('\n');
}

export function getThemeConfig(): string {
  const lines = [
    "import { createTheme } from '@mui/material/styles';",
    '',
    '// Create a custom MUI theme',
    'export const theme = createTheme({',
    '  palette: {',
    "    mode: 'light',",
    '    primary: {',
    "      main: '#1976d2',",
    "      light: '#42a5f5',",
    "      dark: '#1565c0',",
    "      contrastText: '#ffffff',",
    '    },',
    '    secondary: {',
    "      main: '#9c27b0',",
    "      light: '#ba68c8',",
    "      dark: '#7b1fa2',",
    "      contrastText: '#ffffff',",
    '    },',
    '    error: {',
    "      main: '#d32f2f',",
    '    },',
    '    warning: {',
    "      main: '#ed6c02',",
    '    },',
    '    info: {',
    "      main: '#0288d1',",
    '    },',
    '    success: {',
    "      main: '#2e7d32',",
    '    },',
    '    background: {',
    "      default: '#fafafa',",
    "      paper: '#ffffff',",
    '    },',
    '  },',
    '  typography: {',
    '    fontFamily: [',
    "      '-apple-system',",
    "      'BlinkMacSystemFont',",
    '      \'"Segoe UI"\',',
    "      'Roboto',",
    '      \'"Helvetica Neue"\',',
    "      'Arial',",
    "      'sans-serif',",
    "    ].join(','),",
    '    h1: {',
    '      fontWeight: 700,',
    '    },',
    '    h2: {',
    '      fontWeight: 700,',
    '    },',
    '    h3: {',
    '      fontWeight: 600,',
    '    },',
    '    h4: {',
    '      fontWeight: 600,',
    '    },',
    '    h5: {',
    '      fontWeight: 500,',
    '    },',
    '    h6: {',
    '      fontWeight: 500,',
    '    },',
    '  },',
    '  spacing: 8,',
    '  shape: {',
    '    borderRadius: 8,',
    '  },',
    '  components: {',
    '    MuiButton: {',
    '      styleOverrides: {',
    '        root: {',
    "          textTransform: 'none',",
    '          fontWeight: 600,',
    '        },',
    '      },',
    '    },',
    '    MuiCard: {',
    '      styleOverrides: {',
    '        root: {',
    "          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',",
    '        },',
    '      },',
    '    },',
    '  },',
    '});',
  ];

  return lines.join('\n');
}

export function getViteEnvTypes(): string {
  return '/// <reference types="vite/client" />';
}

export function getIndexHtml(): string {
  const lines = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="UTF-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '    <title>React App</title>',
    '  </head>',
    '  <body>',
    '    <div id="root"></div>',
    '    <script type="module" src="/src/main.tsx"></script>',
    '  </body>',
    '</html>',
  ];

  return lines.join('\n');
}


