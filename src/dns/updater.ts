import type { CreateZoneRrsetData, SetZoneRrsetRecordsData } from '@/lib/hetzner';
import type { Client } from '@/lib/hetzner/client';
import { logger } from '@/logger';
import type { ResolvedHostname } from './resolver';

type SetRecordsArgs = {
  client: Client;
  path: {
    id_or_name: string;
    rr_name: string;
    rr_type: SetZoneRrsetRecordsData['path']['rr_type'];
  };
  body: { records: Array<{ value: string }> };
};

type CreateRrsetArgs = {
  client: Client;
  path: { id_or_name: string };
  body: {
    name: string;
    type: CreateZoneRrsetData['body']['type'];
    records: Array<{ value: string }>;
  };
};

export type DnsUpdaterDeps = {
  setZoneRrsetRecords: (args: SetRecordsArgs) => Promise<{ error?: unknown }>;
  createZoneRrset: (args: CreateRrsetArgs) => Promise<unknown>;
  getPublicIp: () => Promise<{ query: string }>;
  client: Client;
};

export const createDnsUpdater = ({
  setZoneRrsetRecords,
  createZoneRrset,
  getPublicIp,
  client,
}: DnsUpdaterDeps) => {
  const lastKnownIp = new Map<string, string>();

  const setARecord = async (resolved: ResolvedHostname, ip: string): Promise<void> => {
    const { hostname, zoneName, recordName } = resolved;

    if (lastKnownIp.get(hostname) === ip) {
      logger.info({ hostname, ip }, 'A record already up to date, skipping.');
      return;
    }

    const { error } = await setZoneRrsetRecords({
      client,
      path: { id_or_name: zoneName, rr_name: recordName, rr_type: 'A' },
      body: { records: [{ value: ip }] },
    });

    if (error) {
      await createZoneRrset({
        client,
        path: { id_or_name: zoneName },
        body: { name: recordName, type: 'A', records: [{ value: ip }] },
      });
      logger.info({ hostname, ip }, 'Created A record.');
    } else {
      logger.info({ hostname, ip }, 'Updated A record.');
    }

    lastKnownIp.set(hostname, ip);
  };

  return {
    clearIpCache: () => lastKnownIp.clear(),
    updateDnsRecords: async (resolved: ResolvedHostname[]): Promise<void> => {
      const { query: ip } = await getPublicIp();
      logger.info({ ip }, 'Fetched public IP.');
      await Promise.all(resolved.map(r => setARecord(r, ip)));
    },
  };
};
