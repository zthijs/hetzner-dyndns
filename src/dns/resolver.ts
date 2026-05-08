import { hetznerClient } from '@/client';
import { listZones } from '@/lib/hetzner';
import { logger } from '@/logger';

export type ResolvedHostname = {
  hostname: string;
  zoneName: string;
  recordName: string;
};

export async function resolveHostname(hostname: string): Promise<ResolvedHostname | null> {
  const parts = hostname.toLowerCase().split('.');

  for (let i = parts.length - 2; i >= 0; i--) {
    const zoneName = parts.slice(i).join('.');
    const recordName = i === 0 ? '@' : parts.slice(0, i).join('.');

    const { data } = await listZones({ client: hetznerClient, query: { name: zoneName } });
    if (data?.zones?.length) {
      return { hostname, zoneName, recordName };
    }
  }

  return null;
}

export async function validateHostnames(hostnames: string[]): Promise<ResolvedHostname[]> {
  const resolved = await Promise.all(
    hostnames.map(async hostname => {
      const result = await resolveHostname(hostname);
      if (!result) {
        logger.warn(`No Hetzner DNS zone found for hostname: ${hostname}`);
      }
      return result;
    }),
  );

  return resolved.filter((r): r is ResolvedHostname => r !== null);
}
