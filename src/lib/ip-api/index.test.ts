import { describe, expect, it, mock } from 'bun:test';
import { getPublicIp } from './index';

describe('getPublicIp', () => {
  it('fetches and returns the public IP response', async () => {
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

    const fetchMock = mock().mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    const result = await getPublicIp(fetchMock);

    expect(result).toEqual(mockResponse);
    expect(fetchMock).toHaveBeenCalledWith('http://ip-api.com/json');
  });

  it('calls the correct endpoint', async () => {
    const fetchMock = mock().mockResolvedValue(
      new Response(JSON.stringify({ status: 'success', query: '5.6.7.8' }), { status: 200 }),
    );

    await getPublicIp(fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('http://ip-api.com/json');
  });
});
