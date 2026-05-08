import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: 'https://docs.hetzner.cloud/cloud.spec.json',
  output: {
    path: 'src/lib/hetzner',
    lint: 'biome',
  },
  plugins: ['@hey-api/typescript', '@hey-api/sdk'],
});
