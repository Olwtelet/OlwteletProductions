// ESLint flat config (Next.js 16 removed `next lint`: node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md).
//   npm run lint   →   eslint .
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-plugin-react-hooks 7 adds rules written for the React Compiler. This project does not enable the React
    // Compiler (next.config.ts), and the flagged code reproduces the original's own component code (setState inside
    // effects, refs read during render, e.g. useSplit = original module 55692), whose update timing is observable
    // (docs/implementation/foundation.md §11). They stay visible as warnings instead of errors; rewriting faithful
    // code to satisfy them would change commit timing.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
  {
    // CommonJS measurement scripts must use require()
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // measurement tooling (Playwright): in-page instrumentation patches prototypes and keeps `this` in closures
    files: ['scripts/**/*.{js,mjs,cjs}'],
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: { '@typescript-eslint/no-this-alias': 'off' },
  },
  globalIgnores([
    // default ignores of eslint-config-next
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // verification builds (NEXT_DIST_DIR), caches, mirrored media and evidence: not source code
    '.next-*/**',
    '.cache/**',
    'public/**',
    'docs/**',
  ]),
]);

export default eslintConfig;
