import { defineConfig, globalIgnores } from 'eslint/config'
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import astro from 'eslint-plugin-astro'
import prettier from 'eslint-config-prettier'

// The ruleset this repo gates on. It is deliberately smaller than the one in the
// app repos (arkanora, CruciNora): this is five Astro templates and a dozen small
// modules, so a config borrowed wholesale would spend more time being argued
// with than it saves. What is kept is the part that has caught something
// here or next door — the recommended sets, and the two house rules about
// assertions — and `eslint-config-prettier` last, so formatting is Prettier's
// job alone and the two can never disagree about a file.
//
// `defineConfig` is ESLint's own; `tseslint.config()` does the same job and is
// deprecated as of typescript-eslint 8.70, where it prints a hint on every
// `astro check`.
export default defineConfig(
  globalIgnores(['dist', '.astro', '.vercel', 'public']),

  // The .ts side: src/lib, the three text endpoints, scripts/, and the configs.
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{js,mjs,ts}'],
  },

  // The .astro side. astro-eslint-parser is the only reason the templates can be
  // linted at all — the frontmatter is real TypeScript and the rest is markup,
  // and without this plugin every page of this site is simply unchecked.
  ...astro.configs.recommended,

  // Both houses, one rule each, applied to the templates as well as the modules
  // — most of the logic on this site lives in an .astro frontmatter block.
  {
    files: ['**/*.{js,mjs,ts,astro}'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      // No type casting: `x as Foo` / `<Foo>x` defeat the type checker. Use a
      // type annotation or a runtime narrowing check instead. `as const` is
      // still allowed — it tightens types rather than overriding them.
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      // No non-null assertions either: `x!` hides the same nulls the type
      // checker is trying to surface. Narrow with a real runtime check instead.
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },

  // A .d.ts declaring ambient types cannot use `import` for the Astro types it
  // pulls in: an import would make the file a module, and the global
  // `interface ImportMetaEnv` below it would stop augmenting anything. The
  // triple-slash reference is the mechanism here, not a leftover habit.
  {
    files: ['**/*.d.ts'],
    rules: { '@typescript-eslint/triple-slash-reference': 'off' },
  },

  // astro.config.mjs and vitest.config.ts run in Node, not in a browser or a
  // request; scripts/ is the image rasteriser, which is Node and nothing else.
  {
    files: ['*.config.{js,mjs,ts}', 'scripts/**/*.ts'],
    languageOptions: { globals: globals.node },
  },

  // Site code runs in the Vercel function and in the browser. `console` and the
  // URL/fetch globals are the shared part; declaring it is what keeps
  // no-undef honest rather than switched off.
  {
    files: ['src/**/*.{ts,astro}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },

  // Must come last: it switches off every stylistic rule Prettier owns.
  prettier,
)
