import { hetznerClient } from '@/client';
import { validateHostnames } from '@/dns/resolver';
import { createDnsUpdater } from '@/dns/updater';
import { env } from '@/env';
import { createZoneRrset, setZoneRrsetRecords } from '@/lib/hetzner';
import { getPublicIp } from '@/lib/ip-api';
import { logger } from '@/logger';

const { updateDnsRecords } = createDnsUpdater({
  client: hetznerClient,
  setZoneRrsetRecords,
  createZoneRrset,
  getPublicIp,
});

logger.info('Validating hostnames against Hetzner DNS...');
const resolvedHostnames = await validateHostnames(env.DYNDNS_HOSTNAMES);

if (resolvedHostnames.length === 0) {
  logger.error('No valid hostnames found. Exiting.');
  process.exit(1);
}

logger.info(
  `Tracking ${resolvedHostnames.length} hostname(s): ${resolvedHostnames.map(r => r.hostname).join(', ')}`,
);

await updateDnsRecords(resolvedHostnames);

Bun.cron(env.DYNDNS_CRON_SCHEDULE, async () => {
  logger.info('Running scheduled DNS update...');
  await updateDnsRecords(resolvedHostnames);
});
