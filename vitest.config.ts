import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['packages/*/src/**/*.test.ts'],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@org/ai-core': './packages/ai-core/src',
    },
  },
});
