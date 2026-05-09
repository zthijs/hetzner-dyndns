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

const zoneMatch = (name: string) => ({ data: { zones: [{ name }] } });
const noZone = { data: { zones: [] } };

describe('resolveHostname', () => {
  beforeEach(() => {
    mockListZones.mockReset();
  });

  it('resolves an apex domain', async () => {
    mockListZones.mockResolvedValue(zoneMatch('example.com'));

    const result = await resolveHostname('example.com');

    expect(result).toEqual({ hostname: 'example.com', zoneName: 'example.com', recordName: '@' });
  });

  it('resolves a subdomain to the correct zone and record name', async () => {
    mockListZones.mockImplementation(({ query }: { query: { name: string } }) =>
      query.name === 'example.com' ? zoneMatch('example.com') : noZone,
    );

    const result = await resolveHostname('home.example.com');

    expect(result).toEqual({
      hostname: 'home.example.com',
      zoneName: 'example.com',
      recordName: 'home',
    });
  });

  it('resolves a deep subdomain to the correct record name', async () => {
    mockListZones.mockImplementation(({ query }: { query: { name: string } }) =>
      query.name === 'example.com' ? zoneMatch('example.com') : noZone,
    );

    const result = await resolveHostname('api.home.example.com');

    expect(result).toEqual({
      hostname: 'api.home.example.com',
      zoneName: 'example.com',
      recordName: 'api.home',
    });
  });

  it('returns null when no matching zone is found', async () => {
    mockListZones.mockResolvedValue(noZone);

    const result = await resolveHostname('unknown.example.com');

    expect(result).toBeNull();
  });

  it('normalizes zone and record name to lowercase (hostname preserves original casing)', async () => {
    mockListZones.mockImplementation(({ query }: { query: { name: string } }) =>
      query.name === 'example.com' ? zoneMatch('example.com') : noZone,
    );

    const result = await resolveHostname('HOME.EXAMPLE.COM');

    expect(result?.zoneName).toBe('example.com');
    expect(result?.recordName).toBe('home');
  });

  it('prefers a broader zone when both a subzone and parent zone exist', async () => {
    // The resolver iterates from broad to narrow, so 'example.com' wins over 'home.example.com'
    mockListZones.mockImplementation(({ query }: { query: { name: string } }) => {
      if (query.name === 'example.com' || query.name === 'home.example.com') {
        return zoneMatch(query.name);
      }
      return noZone;
    });

    const result = await resolveHostname('api.home.example.com');

    expect(result?.zoneName).toBe('example.com');
    expect(result?.recordName).toBe('api.home');
  });
});

describe('validateHostnames', () => {
  beforeEach(() => {
    mockListZones.mockReset();
  });

  it('returns resolved hostnames for all valid entries', async () => {
    mockListZones.mockImplementation(({ query }: { query: { name: string } }) =>
      query.name === 'example.com' ? zoneMatch('example.com') : noZone,
    );

    const result = await validateHostnames(['example.com', 'home.example.com']);

    expect(result).toHaveLength(2);
  });

  it('filters out hostnames with no matching zone', async () => {
    mockListZones.mockImplementation(({ query }: { query: { name: string } }) =>
      query.name === 'example.com' ? zoneMatch('example.com') : noZone,
    );

    const result = await validateHostnames(['example.com', 'unknown.other.com']);

    expect(result).toHaveLength(1);
    expect(result[0]?.hostname).toBe('example.com');
  });

  it('returns an empty array when no hostnames resolve', async () => {
    mockListZones.mockResolvedValue(noZone);

    const result = await validateHostnames(['unknown.example.com']);

    expect(result).toHaveLength(0);
  });

  it('resolves all hostnames in parallel (does not short-circuit on first failure)', async () => {
    mockListZones.mockImplementation(({ query }: { query: { name: string } }) =>
      query.name === 'other.io' ? zoneMatch('other.io') : noZone,
    );

    const result = await validateHostnames(['unknown.example.com', 'other.io']);

    expect(result).toHaveLength(1);
    expect(result[0]?.zoneName).toBe('other.io');
  });
});
