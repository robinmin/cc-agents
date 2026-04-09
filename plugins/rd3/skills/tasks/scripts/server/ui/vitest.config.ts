import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['@testing-library/jest-dom'],
        include: ['src/**/*.test.{ts,tsx}', 'src/**/*.vitest.{ts,tsx}'],
        coverage: {
            reporter: ['text', 'json', 'clover'],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
});
