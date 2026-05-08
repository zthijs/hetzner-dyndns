import { beforeEach, describe, expect, it, mock } from 'bun:test';

const mockListZones = mock();

mock.module('@/lib/hetzner', () => ({
  listZones: mockListZones,
}));

mock.module('@/client', () => ({
  hetznerClient: {},
}));

mock.module('@/logger', () => ({
  logger: { info: mock(), warn: mock(), error: mock() },
}));

const { resolveHostname, validateHostnames } = await import('@/dns/resolver');

describe('resolveHostname', () => {
  beforeEach(() => {
    mockListZones.mockReset();
  });

  it('resolves an apex domain to its zone', async () => {
    mockListZones.mockResolvedValue({ data: { zones: [{ name: 'zthijs.dev' }] } });

    const result = await resolveHostname('zthijs.dev');

    expect(result).toEqual({ hostname: 'zthijs.dev', zoneName: 'zthijs.dev', recordName: '@' });
  });

  it('resolves a subdomain to the correct zone and record name', async () => {
    mockListZones.mockImplementation(({ query }: { query: { name: string } }) => {
      if (query.name === 'zthijs.dev') {
        return { data: { zones: [{ name: 'zthijs.dev' }] } };
      }
      return { data: { zones: [] } };
    });

    const result = await resolveHostname('home.zthijs.dev');

    expect(result).toEqual({
      hostname: 'home.zthijs.dev',
      zoneName: 'zthijs.dev',
      recordName: 'home',
    });
  });

  it('resolves a deep subdomain to the correct record name', async () => {
    mockListZones.mockImplementation(({ query }: { query: { name: string } }) => {
      if (query.name === 'zthijs.dev') {
        return { data: { zones: [{ name: 'zthijs.dev' }] } };
      }
      return { data: { zones: [] } };
    });

    const result = await resolveHostname('api.home.zthijs.dev');

    expect(result).toEqual({
      hostname: 'api.home.zthijs.dev',
      zoneName: 'zthijs.dev',
      recordName: 'api.home',
    });
  });

  it('returns null when no matching zone is found', async () => {
    mockListZones.mockResolvedValue({ data: { zones: [] } });

    const result = await resolveHostname('unknown.example.com');

    expect(result).toBeNull();
  });

  it('normalizes the hostname to lowercase', async () => {
    mockListZones.mockImplementation(({ query }: { query: { name: string } }) => {
      if (query.name === 'zthijs.dev') {
        return { data: { zones: [{ name: 'zthijs.dev' }] } };
      }
      return { data: { zones: [] } };
    });

    const result = await resolveHostname('HOME.ZTHIJS.DEV');

    expect(result?.zoneName).toBe('zthijs.dev');
    expect(result?.recordName).toBe('home');
  });
});

describe('validateHostnames', () => {
  beforeEach(() => {
    mockListZones.mockReset();
  });

  it('returns resolved hostnames for all valid entries', async () => {
    mockListZones.mockImplementation(({ query }: { query: { name: string } }) => {
      if (query.name === 'zthijs.dev') {
        return { data: { zones: [{ name: 'zthijs.dev' }] } };
      }
      return { data: { zones: [] } };
    });

    const result = await validateHostnames(['zthijs.dev', 'home.zthijs.dev']);

    expect(result).toHaveLength(2);
  });

  it('filters out hostnames with no matching zone', async () => {
    mockListZones.mockImplementation(({ query }: { query: { name: string } }) => {
      if (query.name === 'zthijs.dev') {
        return { data: { zones: [{ name: 'zthijs.dev' }] } };
      }
      return { data: { zones: [] } };
    });

    const result = await validateHostnames(['zthijs.dev', 'unknown.example.com']);

    expect(result).toHaveLength(1);
    const first = result[0];
    expect(first).toBeDefined();
    expect(first?.hostname).toBe('zthijs.dev');
  });

  it('returns an empty array when no hostnames resolve', async () => {
    mockListZones.mockResolvedValue({ data: { zones: [] } });

    const result = await validateHostnames(['unknown.example.com']);

    expect(result).toHaveLength(0);
  });
});
