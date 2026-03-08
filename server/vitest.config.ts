import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'src/db/*.ts', 'src/tests/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/db/migrations/**',
        'src/db/test*.ts',
        'src/db/debug*.ts',
        'src/db/check*.ts',
        'src/db/run*.ts',
        'src/db/seed*.ts',
        'src/db/verify*.ts',
        'src/db/list*.ts',
        'src/db/get*.ts',
        'src/db/grant*.ts',
        'src/db/reset*.ts',
        'src/db/set*.ts',
        'src/db/sync*.ts',
        'src/db/analyze*.ts',
        'src/db/apply*.ts',
        'src/**/*.test.ts',
      ],
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    pool: 'forks',
  },
});
