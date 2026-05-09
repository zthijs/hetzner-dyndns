import { describe, expect, it, mock } from 'bun:test';
import { getPublicIp } from './index';

const makeResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe('getPublicIp', () => {
  it('fetches from the ip-api endpoint and returns parsed JSON', async () => {
    const mockResponse = {
      status: 'success' as const,
      country: 'Netherlands',
      countryCode: 'NL',
      region: 'NH',
      regionName: 'North Holland',
      city: 'Amsterdam',
      zip: '1053',
      lat: 52.364,
      lon: 4.866,
      timezone: 'Europe/Amsterdam',
      isp: 'Test ISP',
      org: 'Test Org',
      as: 'AS12345 Test',
      query: '1.2.3.4',
    };

    const fetchMock = mock().mockResolvedValue(makeResponse(mockResponse));

    const result = await getPublicIp(fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('http://ip-api.com/json');
    expect(result).toEqual(mockResponse);
  });

  it('uses globalThis.fetch by default', async () => {
    const original = globalThis.fetch;
    const fetchMock = mock().mockResolvedValue(
      makeResponse({ status: 'success', query: '1.2.3.4' }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      await getPublicIp();
      expect(fetchMock).toHaveBeenCalledWith('http://ip-api.com/json');
    } finally {
      globalThis.fetch = original;
    }
  });

  it('propagates fetch errors', async () => {
    const fetchMock = mock().mockRejectedValue(new Error('Network error'));

    await expect(getPublicIp(fetchMock)).rejects.toThrow('Network error');
  });

  it('returns the query field as the public IP', async () => {
    const fetchMock = mock().mockResolvedValue(
      makeResponse({ status: 'success', query: '203.0.113.42' }),
    );

    const result = await getPublicIp(fetchMock);

    expect(result.query).toBe('203.0.113.42');
  });
});
