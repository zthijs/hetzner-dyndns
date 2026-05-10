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

let isShuttingDown = false;
let currentRun: Promise<unknown> | null = null;

const runUpdate = async (label: string) => {
  if (isShuttingDown) {
    logger.warn(`Skipping ${label}: shutdown in progress`);
    return;
  }
  logger.info(`Running ${label}...`);
  currentRun = updateDnsRecords(resolvedHostnames).catch(err =>
    logger.error({ err }, `${label} failed`),
  );
  await currentRun;
  currentRun = null;
};

await runUpdate('initial DNS update');

const job = Bun.cron(env.DYNDNS_CRON_SCHEDULE, () => runUpdate('scheduled DNS update'));

const shutdown = async (signal: NodeJS.Signals) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`Received ${signal}, shutting down gracefully...`);

  job.stop();

  if (currentRun) {
    logger.info('Waiting for in-flight DNS update to finish...');
    await currentRun;
  }

  logger.info('Shutdown complete.');
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
