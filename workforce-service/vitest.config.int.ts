import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/test/**/*.int-spec.ts'],
    // İlk image indirmesi ve PostgreSQL hazırlığı normal unit testten uzun sürer.
    hookTimeout: 180_000,
    testTimeout: 30_000,
    fileParallelism: false,
  },
});