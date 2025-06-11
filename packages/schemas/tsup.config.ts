import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['index.ts', 'auth.schema.ts'],
  format: ['cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['@kitchzero/types']
});