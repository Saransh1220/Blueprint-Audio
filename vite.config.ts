/// <reference types="vitest" />

import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['**/*.spec.ts'],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/app/**/*.ts'],
      exclude: [
        '**/*.spec.ts',
        'src/app/components/**/*.ts',
        'src/app/pages/**/*.ts',
        'src/app/models/**/*.ts',
        'src/app/**/index.ts',
        'src/app/app.routes.ts',
        'src/app/app.ts',
        'src/app/core/api/api-request.ts',
        'src/app/shared/components/**/*.ts',
      ],
      reportsDirectory: './coverage',
      reporter: ['text', 'json', 'json-summary', 'lcov', 'cobertura', 'html'],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 80,
      },
    },
  },
});
