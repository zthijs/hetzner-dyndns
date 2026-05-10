# hetzner-dyndns

A lightweight Dynamic DNS (DynDNS) service for [Hetzner DNS](https://www.hetzner.com/dns-console). It detects your current public IP address and updates the configured DNS A records on a cron schedule.

Built with [Bun](https://bun.sh) and TypeScript.

## How it works

1. On startup, it validates that all configured hostnames have a matching zone in Hetzner DNS.
2. It immediately runs a DNS update, then repeats on the configured cron schedule.
3. For each hostname it fetches the current public IP via [ip-api.com](http://ip-api.com) and updates (or creates) the A record via the Hetzner DNS API.
4. IPs are cached in memory — if the IP hasn't changed since the last run, the API call is skipped.

## Configuration

All configuration is via environment variables.

| Variable | Required | Default | Description |
|---|---|---|---|
| `HETZNER_API_KEY` | Yes | — | Hetzner Console API token |
| `DYNDNS_HOSTNAMES` | Yes | — | Comma-separated list of hostnames to update (e.g. `home.example.com,vpn.example.com`) |
| `DYNDNS_CRON_SCHEDULE` | No | `0 */6 * * *` | Cron expression for how often to update DNS records |

## Usage

### Docker Compose

```yaml
services:
  hetzner-dyndns:
    image: ghcr.io/zthijs/hetzner-dyndns:latest
    container_name: hetzner-dyndns
    restart: unless-stopped
    stop_grace_period: 30s
    environment:
      HETZNER_API_KEY: your_api_key_here
      DYNDNS_HOSTNAMES: home.example.com,vpn.example.com
      DYNDNS_CRON_SCHEDULE: "0 */6 * * *"
```

### Docker

```sh
docker run -d \
  --name hetzner-dyndns \
  --restart unless-stopped \
  -e HETZNER_API_KEY=your_api_key_here \
  -e DYNDNS_HOSTNAMES=home.example.com,vpn.example.com \
  -e DYNDNS_CRON_SCHEDULE="0 */6 * * *" \
  ghcr.io/zthijs/hetzner-dyndns:latest
```

## Development

**Prerequisites:** [Bun](https://bun.sh)

```sh
# Install dependencies
bun install

# Run in development mode
bun dev

# Run tests
bun test

# Type check
bun run typecheck

# Lint & format
bun run format-n-lint
```

## Building

```sh
# Build
bun run build

# Build Docker image
docker build -t hetzner-dyndns .
```
