# Vite Configuration Patterns

Complete guide to Vite configuration patterns for TypeScript projects, covering common scenarios from basic setup to advanced production configurations.

## Basic Configuration

### TypeScript Configuration

Simple TypeScript configuration with path alias support:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
```

### Path Aliases Configuration

Comprehensive path aliases for large projects:

```typescript
// vite.config.ts (with path aliases)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services')
    }
  }
});
```

## Advanced Build Configurations

### Multiple Entry Points

Configure multiple HTML entry points:

```typescript
// vite.config.ts (multiple entries)
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin.html')
      }
    }
  }
});
```

### Library Mode Configuration

For building libraries instead of applications:

```typescript
// vite.config.ts (library mode)
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'MyLibrary',
      fileName: (format) => `my-library.${format}.js`,
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
});
```

### Build Optimization

Optimized production build with code splitting:

```typescript
// vite.config.ts (optimized build)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog']
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
});
```

## Environment Configuration

### Environment Variables

Using environment variables in configuration:

```typescript
// vite.config.ts (with env vars)
import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    '__APP_VERSION__': JSON.stringify(process.env.npm_package_version)
  },
  server: {
    port: parseInt(process.env.VITE_PORT || '3000')
  }
});
```

### Proxy Configuration

API proxy configuration for development:

```typescript
// vite.config.ts (with proxy)
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true
      }
    }
  }
});
```

## CSS Configuration

### CSS Processing

CSS modules and preprocessor configuration:

```typescript
// vite.config.ts (CSS processing)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    // Auto-import for CSS modules
  ],
  css: {
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: '[name]__[local]__[hash:base64:5]'
    },
    preprocessorOptions: {
      scss: {
        additionalData: '@import "@/styles/variables.scss";'
      }
    }
  }
});
```

## Testing Configuration

### Vitest Integration

Configuring Vitest within Vite config:

```typescript
// vite.config.ts (with Vitest)
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});
```

## SSR Configuration

### Server-Side Rendering

SSR build configuration:

```typescript
// vite.config.ts (SSR)
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        client: path.resolve(__dirname, 'src/client/index.ts'),
        server: path.resolve(__dirname, 'src/server/index.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  }
});
```

## Plugin Configuration

### Auto-import Plugins

Component and API auto-import configuration:

```typescript
// vite.config.ts (with plugins)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    // Auto-import components
    Components({
      resolvers: [
        (name) => {
          if (name.startsWith('Button')) {
            return { name, from: '@components/ui' };
          }
        }
      ]
    }),
    // Auto-import APIs
    AutoImport({
      imports: [
        'react',
        'react-router-dom',
        {
          '@hooks': ['useAuth', 'useApi']
        }
      ],
      dts: true
    })
  ]
});
```

## Environment-Specific Configurations

### Development Configuration

Development-focused settings:

```typescript
// vite.config.ts (dev-focused)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    hmr: {
      overlay: true
    },
    watch: {
      usePolling: true
    }
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
});
```

### Production Configuration

Production-focused optimization:

```typescript
// vite.config.ts (production-focused)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log']
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
```

### Monorepo Configuration

Monorepo-specific settings:

```typescript
// vite.config.ts (monorepo)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../packages/shared/src')
    }
  },
  server: {
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**']
    }
  }
});
```

## Supporting Configuration Files

### tsconfig.json for Vite

Recommended TypeScript configuration:

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@utils/*": ["./src/utils/*"],
      "@types/*": ["./src/types/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@services/*": ["./src/services/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### package.json Scripts

Common Vite scripts:

```json
// package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  }
}
```

## See Also

- `tooling.md` - Build tools comparison and selection guidance
- `testing-strategy.md` - Vitest configuration and testing patterns
- `examples/vite-config.ts` - Essential Vite configuration examples
