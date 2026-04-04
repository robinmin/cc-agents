import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// From scripts/server/ui/, go up 2 levels → plugins/rd3/skills/tasks/scripts/static/
// (Production: tasks server serves this directory directly — single process, single port)
const STATIC_OUT = path.resolve(__dirname, '..', '..', 'static');

// Default tasks server port — override with TASKS_PORT env var during development
const TASKS_SERVER_PORT = process.env.TASKS_PORT ?? '3456';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    root: __dirname,
    base: '/',
    build: {
        outDir: STATIC_OUT,
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
    server: {
        // Dev mode proxy: forwards API + SSE calls to the tasks server.
        // This is the ONLY scenario with two processes — and only during development.
        // Production is always a single server (tasks server serves both API and static UI).
        proxy: {
            '/tasks': { target: `http://localhost:${TASKS_SERVER_PORT}`, changeOrigin: true },
            '/events': { target: `http://localhost:${TASKS_SERVER_PORT}`, changeOrigin: true, ws: true },
            '/config': { target: `http://localhost:${TASKS_SERVER_PORT}`, changeOrigin: true },
            '/health': { target: `http://localhost:${TASKS_SERVER_PORT}`, changeOrigin: true },
        },
    },
});
