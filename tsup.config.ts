import { defineConfig } from 'tsup'

export default defineConfig([
  // Library build
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    outDir: 'dist',
    clean: true,
    sourcemap: true,
    splitting: false,
  },
  // CLI build
  {
    entry: {
      cli: 'src/cli/index.ts',
    },
    format: ['cjs'],
    outDir: 'dist',
    clean: false,
    sourcemap: false,
  },
])

