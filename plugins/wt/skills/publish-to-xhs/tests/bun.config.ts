/**
 * Bun test configuration for publish-to-xhs
 *
 * This configuration enables:
 * - Built-in bun test runner
 * - Coverage reporting with c8
 * - TypeScript support
 */

export default {
  test: {
    coverage: {
      enabled: true,
    },
    // Preload files for test setup
    preload: [],
  },
};
