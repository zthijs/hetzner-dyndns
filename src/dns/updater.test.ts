import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { Client } from '@/lib/hetzner/client';
import { createDnsUpdater } from './updater';

const mockClient = {
  buildUrl: mock(),
  getConfig: mock(),
  request: mock(),
  setConfig: mock(),
} as unknown as Client;

mock.module('@/logger', () => ({ logger: { info: mock(), warn: mock(), error: mock() } }));

const resolved = {
  hostname: 'home.example.com',
  zoneName: 'example.com',
  recordName: 'home',
};

describe('createDnsUpdater', () => {
  let mockSetZoneRrsetRecords: ReturnType<typeof mock>;
  let mockCreateZoneRrset: ReturnType<typeof mock>;
  let mockGetPublicIp: ReturnType<typeof mock>;
  let updateDnsRecords: ReturnType<typeof createDnsUpdater>['updateDnsRecords'];
  let clearIpCache: ReturnType<typeof createDnsUpdater>['clearIpCache'];

  beforeEach(() => {
    mockSetZoneRrsetRecords = mock();
    mockCreateZoneRrset = mock();
    mockGetPublicIp = mock();
    const updater = createDnsUpdater({
      client: mockClient,
      setZoneRrsetRecords: mockSetZoneRrsetRecords,
      createZoneRrset: mockCreateZoneRrset,
      getPublicIp: mockGetPublicIp,
    });
    updateDnsRecords = updater.updateDnsRecords;
    clearIpCache = updater.clearIpCache;
  });

  it('fetches the public IP and sets the A record', async () => {
    mockGetPublicIp.mockResolvedValue({ query: '1.2.3.4' });
    mockSetZoneRrsetRecords.mockResolvedValue({ error: null });

    await updateDnsRecords([resolved]);

    expect(mockSetZoneRrsetRecords).toHaveBeenCalledTimes(1);
    expect(mockSetZoneRrsetRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        path: { id_or_name: 'example.com', rr_name: 'home', rr_type: 'A' },
        body: { records: [{ value: '1.2.3.4' }] },
      }),
    );
  });

  it('creates the rrset when set returns an error (record does not exist yet)', async () => {
    mockGetPublicIp.mockResolvedValue({ query: '1.2.3.4' });
    mockSetZoneRrsetRecords.mockResolvedValue({ error: { code: 'not_found' } });
    mockCreateZoneRrset.mockResolvedValue({});

    await updateDnsRecords([resolved]);

    expect(mockSetZoneRrsetRecords).toHaveBeenCalledTimes(1);
    expect(mockCreateZoneRrset).toHaveBeenCalledTimes(1);
    expect(mockCreateZoneRrset).toHaveBeenCalledWith(
      expect.objectContaining({
        path: { id_or_name: 'example.com' },
        body: { name: 'home', type: 'A', records: [{ value: '1.2.3.4' }] },
      }),
    );
  });

  it('skips the update when the IP has not changed', async () => {
    mockGetPublicIp.mockResolvedValue({ query: '1.2.3.4' });
    mockSetZoneRrsetRecords.mockResolvedValue({ error: null });

    await updateDnsRecords([resolved]);
    await updateDnsRecords([resolved]);

    expect(mockSetZoneRrsetRecords).toHaveBeenCalledTimes(1);
  });

  it('updates again when the IP changes between runs', async () => {
    mockSetZoneRrsetRecords.mockResolvedValue({ error: null });

    mockGetPublicIp.mockResolvedValueOnce({ query: '1.2.3.4' });
    await updateDnsRecords([resolved]);

    mockGetPublicIp.mockResolvedValueOnce({ query: '9.9.9.9' });
    await updateDnsRecords([resolved]);

    expect(mockSetZoneRrsetRecords).toHaveBeenCalledTimes(2);
    expect(mockSetZoneRrsetRecords).toHaveBeenLastCalledWith(
      expect.objectContaining({ body: { records: [{ value: '9.9.9.9' }] } }),
    );
  });

  it('clears the IP cache so the next run forces an update', async () => {
    mockGetPublicIp.mockResolvedValue({ query: '1.2.3.4' });
    mockSetZoneRrsetRecords.mockResolvedValue({ error: null });

    await updateDnsRecords([resolved]);
    clearIpCache();
    await updateDnsRecords([resolved]);

    expect(mockSetZoneRrsetRecords).toHaveBeenCalledTimes(2);
  });

  it('updates all provided hostnames in parallel', async () => {
    const second = { hostname: 'api.example.com', zoneName: 'example.com', recordName: 'api' };
    mockGetPublicIp.mockResolvedValue({ query: '1.2.3.4' });
    mockSetZoneRrsetRecords.mockResolvedValue({ error: null });

    await updateDnsRecords([resolved, second]);

    expect(mockSetZoneRrsetRecords).toHaveBeenCalledTimes(2);
  });

  it('tracks IP cache per hostname independently', async () => {
    const second = { hostname: 'api.example.com', zoneName: 'example.com', recordName: 'api' };
    mockSetZoneRrsetRecords.mockResolvedValue({ error: null });

    mockGetPublicIp.mockResolvedValue({ query: '1.2.3.4' });
    await updateDnsRecords([resolved]);

    // Only second hostname should be updated (resolved is already cached)
    mockGetPublicIp.mockResolvedValue({ query: '1.2.3.4' });
    await updateDnsRecords([resolved, second]);

    expect(mockSetZoneRrsetRecords).toHaveBeenCalledTimes(2);
  });

  it('propagates errors from getPublicIp', async () => {
    mockGetPublicIp.mockRejectedValue(new Error('API unreachable'));

    await expect(updateDnsRecords([resolved])).rejects.toThrow('API unreachable');
  });
});
