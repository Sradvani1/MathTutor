# Phase 1 — Tech Debt Cleanup, Error Handling, Env/Config Fixes

**Estimated effort**: 1–2 days

---

## 1.1 Remove Agent Telemetry Blocks

Strip all `// #region agent log` / `// #endregion` fetch blocks. They are dead code outside the original dev environment.

| File | Blocks to remove |
|---|---|
| `App.tsx` | 1 block (line ~35) |
| `services/geminiService.ts` | 6 blocks (lines ~28, 35, 41, 55, 59, 66) |
| `components/ChatInterface.tsx` | 11 blocks (lines ~50, 109, 139, 153, 158, 162, 183, 189, 217, 225, 230) |
| `components/UserInput.tsx` | 3 blocks (lines ~76, 81, 86) |
| `components/WelcomeScreen.tsx` | 3 blocks (lines ~20, 25, 30) |
| `utils.ts` | 3 blocks (lines ~62, 92, 108) |

**Total**: ~30 blocks.

---

## 1.2 Fix Environment Variable Inconsistency

- `services/geminiService.ts:3` checks `process.env.API_KEY`. Change to `process.env.GEMINI_API_KEY`.
- `vite.config.ts:15` redundantly defines `process.env.API_KEY` from the same env var. Remove that line; keep only `process.env.GEMINI_API_KEY`.
- The `.env` file already declares `GEMINI_API_KEY`, so no change needed there.

---

## 1.3 Fix Vite Config `loadEnv` Root Path

- `vite.config.ts:6`: `loadEnv(mode, '.', '')` → `loadEnv(mode, process.cwd(), '')`.

---

## 1.4 Remove Empty/Dead Files

- Delete `components/MessageBubble.css` — empty and never imported.
- Verify the `.env` file is not tracked by git (`git ls-files .env` should return nothing).

---

## 1.5 Add ErrorBoundary Component

Create `components/ErrorBoundary.tsx`:

```tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[MathTutor] ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    localStorage.removeItem('mathTutorSession');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-gray-100 p-8">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="text-gray-400 mb-6 text-center max-w-md">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 rounded-lg transition-colors"
          >
            Reset Chat & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

Wrap `<main>` (or `<App>`) in `App.tsx` with `<ErrorBoundary>`.

Also remove the global `window.onerror` / `unhandledrejection` listener in `App.tsx` — the ErrorBoundary makes it redundant.

---

## 1.6 Remove Redundant `import React` Statements

React 19's JSX transform means `import React from 'react'` is unnecessary where React is only used for JSX. Strip it from every file, converting `React.xxx` to named imports where needed.

| File | Action |
|---|---|
| `App.tsx` | Remove `import React`, keep `useState, useEffect` via existing named imports |
| `ChatInterface.tsx` | Remove `import React`, keep named imports |
| `UserInput.tsx` | Remove `import React`, keep named imports |
| `MessageBubble.tsx` | Remove `import React`, keep named imports |
| `MathRenderer.tsx` | Remove `import React`, keep `useMemo, useState, useEffect` |
| `WelcomeScreen.tsx` | Remove `import React`, keep named imports |
| `GlossaryModal.tsx` | Remove `import React`, keep named imports |
| `ImagePreviewModal.tsx` | Remove `import React`, keep `useEffect` |
| `hooks/useScript.ts` | Remove `import React`, keep `useState, useEffect` |
| `index.tsx` | Remove `import React`, keep `ReactDOM` |

---

## 1.7 Add ESLint + Prettier Configuration

Create `.eslintrc.json`:

```json
{
  "env": { "browser": true, "es2022": true },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": { "ecmaVersion": "latest", "sourceType": "module" },
  "plugins": ["@typescript-eslint"],
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
  }
}
```

Create `.prettierrc`:

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

Add scripts to `package.json`:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "lint": "eslint . --ext .ts,.tsx",
  "format": "prettier --write \"src/**/*.{ts,tsx,css,json}\"",
  "typecheck": "tsc --noEmit"
}
```

Install dev dependencies:
- `eslint`
- `@typescript-eslint/parser`
- `@typescript-eslint/eslint-plugin`
- `eslint-plugin-react-hooks`
- `prettier`

---

## 1.8 Enable TypeScript Strict Mode

In `tsconfig.json`, add `"strict": true` to `compilerOptions`. Fix any type errors that emerge.

Likely fixes needed:
- `useRef<HTMLDivElement>(null)` → `useRef<HTMLDivElement | null>(null)` in `ChatInterface.tsx`.
- `part.inlineData` access may need optional chaining.
- `(window as any).katex` access in `MathRenderer.tsx` and `useScript.ts` — consider proper type guards.

---

## Summary of Files

| File | Status | Action |
|---|---|---|
| `App.tsx` | Modify | Strip agent logs, wrap with ErrorBoundary, remove `import React`, remove global error listener |
| `services/geminiService.ts` | Modify | Strip agent logs, fix env var name |
| `components/ChatInterface.tsx` | Modify | Strip agent logs, remove `import React`, fix strict-null refs |
| `components/UserInput.tsx` | Modify | Strip agent logs, remove `import React` |
| `components/WelcomeScreen.tsx` | Modify | Strip agent logs, remove `import React` |
| `utils.ts` | Modify | Strip agent logs |
| `components/MessageBubble.tsx` | Modify | Remove `import React` |
| `components/MathRenderer.tsx` | Modify | Remove `import React` |
| `components/GlossaryModal.tsx` | Modify | Remove `import React` |
| `components/ImagePreviewModal.tsx` | Modify | Remove `import React` |
| `hooks/useScript.ts` | Modify | Remove `import React` |
| `vite.config.ts` | Modify | Fix `loadEnv` root, remove redundant API_KEY define |
| `tsconfig.json` | Modify | Add `"strict": true` |
| `components/MessageBubble.css` | Delete | Empty file |
| `components/ErrorBoundary.tsx` | **Create** | New error boundary component |
| `.eslintrc.json` | **Create** | New ESLint config |
| `.prettierrc` | **Create** | New Prettier config |
| `.gitignore` | Verify | Ensure no tracked secrets |
| `package.json` | Modify | Add lint/format/typecheck scripts |
