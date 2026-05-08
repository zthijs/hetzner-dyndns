import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HETZNER_API_KEY: z.string().min(1),
  DYNDNS_CRON_SCHEDULE: z
    .string()
    .min(1)
    .regex(
      /^((((\d+,)+\d+|(\d+(\/|-|#)\d+)|\d+L?|\*(\/\d+)?|L(-\d+)?|\?|[A-Z]{3}(-[A-Z]{3})?) ?){5,7})|(@(annually|yearly|monthly|weekly|daily|hourly|reboot))|(@every (\d+(ns|us|µs|ms|s|m|h))+)$/,
      'Invalid cron expression',
    )
    .default('0 */6 * * *'),
  DYNDNS_HOSTNAMES: z
    .string()
    .min(1)
    .transform(str => str.split(',').map(url => url.trim())),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', z.treeifyError(parsed.error).properties);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
