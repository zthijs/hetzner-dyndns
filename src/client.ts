import { env } from '@/env';
import { createClient } from '@/lib/hetzner/client';

export const hetznerClient = createClient({
  baseUrl: 'https://api.hetzner.cloud/v1',
  headers: {
    Authorization: `Bearer ${env.HETZNER_API_KEY}`,
  },
});
