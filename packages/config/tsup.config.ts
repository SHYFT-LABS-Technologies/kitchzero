import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['index.ts'],
  format: ['cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['dotenv'],
  platform: 'node',
  target: 'node18'
});