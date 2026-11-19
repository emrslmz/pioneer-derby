import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginPlaywright from 'eslint-plugin-playwright'
import pluginVitest from '@vitest/eslint-plugin'
import pluginOxlint from 'eslint-plugin-oxlint'
import pluginBoundaries, { type Config as BoundariesConfig } from 'eslint-plugin-boundaries'
import skipFormatting from 'eslint-config-prettier/flat'

/**
 * Architecture boundaries (docs/ARCHITECTURE.md §3, requirement X7):
 *
 *   app → features → stores → domain
 *             ↘ shared ↙
 *
 * - `domain` is pure TypeScript: it imports only itself (and no Vue / Pinia / DOM libraries).
 * - a feature may import its own files, but never another feature.
 */
const architecture: BoundariesConfig = {
  plugins: { boundaries: pluginBoundaries },
  settings: {
    'boundaries/elements': [
      { type: 'app', pattern: 'src/app' },
      { type: 'feature', pattern: 'src/features/*', capture: ['feature'] },
      { type: 'stores', pattern: 'src/stores' },
      { type: 'domain', pattern: 'src/domain' },
      { type: 'shared', pattern: 'src/shared' },
      { type: 'i18n', pattern: 'src/i18n' },
      { type: 'styles', pattern: 'src/styles' },
    ],
  },
  rules: {
    'boundaries/dependencies': [
      'error',
      {
        default: 'disallow',
        policies: [
          {
            from: { element: { type: 'app' } },
            allow: {
              to: {
                element: { types: ['app', 'feature', 'stores', 'domain', 'shared', 'i18n'] },
              },
            },
          },
          {
            from: { element: { type: 'feature' } },
            allow: { to: { element: { types: ['stores', 'domain', 'shared', 'i18n'] } } },
          },
          {
            from: { element: { type: 'feature' } },
            allow: {
              to: {
                element: {
                  type: 'feature',
                  captured: { feature: '{{ from.element.captured.feature }}' },
                },
              },
            },
          },
          {
            from: { element: { type: 'stores' } },
            allow: { to: { element: { types: ['stores', 'domain', 'shared'] } } },
          },
          {
            from: { element: { type: 'shared' } },
            allow: { to: { element: { types: ['shared', 'domain', 'i18n'] } } },
          },
          {
            from: { element: { type: 'i18n' } },
            allow: { to: { element: { types: ['i18n', 'shared'] } } },
          },
          {
            from: { element: { type: 'domain' } },
            allow: { to: { element: { type: 'domain' } } },
          },
        ],
      },
    ],
  },
}

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  globalIgnores([
    '**/dist/**',
    '**/dist-ssr/**',
    '**/coverage/**',
    'playwright-report/**',
    'test-results/**',
  ]),

  ...pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,

  {
    name: 'app/conventions',
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='Math'][property.name='random']",
          message: 'Use the seeded RNG from src/domain/random.ts.',
        },
      ],
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/block-lang': ['error', { script: { lang: 'ts' } }],
      'vue/define-props-declaration': ['error', 'type-based'],
      'vue/define-emits-declaration': ['error', 'type-based'],
      'vue/multi-word-component-names': 'off',
    },
  },

  {
    name: 'app/architecture',
    files: ['src/**/*.{vue,ts}'],
    ...architecture,
    settings: {
      ...architecture.settings,
      // Resolves the `@/` alias so boundaries can classify aliased imports.
      'import/resolver': { typescript: { project: './tsconfig.app.json' } },
    },
  },

  {
    name: 'app/pure-domain',
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['vue', 'vue-*', '@vue/*', 'pinia', '@/*', '**/*.vue'],
              message: 'src/domain is pure TypeScript — no framework or app imports.',
            },
          ],
        },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'navigator'],
    },
  },

  {
    name: 'app/scripts',
    files: ['scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },

  {
    ...pluginPlaywright.configs['flat/recommended'],
    files: ['tests/e2e/**/*.spec.ts', 'tests/visual/**/*.spec.ts'],
  },

  {
    ...pluginVitest.configs.recommended,
    files: ['tests/unit/**/*.spec.ts'],
  },

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  skipFormatting,
)
