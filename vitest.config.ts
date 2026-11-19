import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['tests/unit/**/*.spec.ts'],
      setupFiles: ['tests/unit/setup.ts'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      restoreMocks: true,
      // Node ≥ 25 ships a global `localStorage` that shadows jsdom's and is undefined without
      // --localstorage-file. Turn it off so tests use jsdom's Web Storage.
      execArgv: ['--no-experimental-webstorage'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,vue}'],
        exclude: ['src/main.ts', 'src/**/*.d.ts'],
        reporter: ['text', 'html', 'json-summary'],
        thresholds: {
          'src/domain/**': { statements: 95, branches: 95, functions: 95, lines: 95 },
          'src/stores/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
        },
      },
    },
  }),
)
