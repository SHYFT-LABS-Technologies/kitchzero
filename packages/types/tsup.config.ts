import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['index.ts', 'auth.ts', 'tenant.ts', 'common.ts', 'inventory.ts'],
  format: ['cjs'],
  dts: true,
  clean: true,
  sourcemap: true
});