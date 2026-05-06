# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Releases

Releases are fully automated. On every push to `main`, a GitHub Actions workflow runs [semantic-release](https://semantic-release.gitbook.io), which:

1. Reads new commits since the last tag
2. Decides the next version from commit prefixes
3. Updates `CHANGELOG.md` and `package.json` and commits them back to `main`
4. Creates the git tag and a GitHub Release with auto-generated notes

You don't run anything locally — just push.

### Commit message format

Use [Conventional Commits](https://www.conventionalcommits.org/). The prefix decides the version bump:

| Prefix | Version bump | Example |
|---|---|---|
| `fix:` | patch (`0.1.0` → `0.1.1`) | `fix: volume slider not persisting` |
| `feat:` | minor (`0.1.0` → `0.2.0`) | `feat: add timeline scrubbing` |
| `feat!:` or `BREAKING CHANGE:` in body | major (`0.1.0` → `1.0.0`) | `feat!: rename clip API` |
| `chore:`, `refactor:`, `docs:`, `test:`, `style:`, `ci:` | no release | `chore: bump deps` |

Commits with non-releasing prefixes are skipped silently — no version bump, no changelog entry. So refactors and tweaks stay out of the release notes.

### First release

The very first push that contains at least one `feat:` or `fix:` commit will produce `v1.0.0` (semantic-release defaults to 1.0.0 on the first release). If you want to start at `0.x`, make the first release commit a `fix:` and configure `initialVersion` — or just let it ship `1.0.0` and accept that.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
