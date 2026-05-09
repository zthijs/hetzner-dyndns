export type IpApiResponse = {
  status: 'success' | 'fail';
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  query: string;
};

export const getPublicIp = async (
  fetchFn: (url: string) => Promise<Response> = globalThis.fetch,
): Promise<IpApiResponse> => {
  const response = await fetchFn('http://ip-api.com/json');
  return response.json() as Promise<IpApiResponse>;
};
