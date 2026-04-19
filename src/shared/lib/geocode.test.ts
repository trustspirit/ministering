import { describe, expect, it } from 'vitest';
import { geocodeWith, type GeocoderPort } from './geocode';

const makeMockGeocoder = (
  handler: (addr: string) => { result: Array<{ x: string; y: string }>; status: string },
): GeocoderPort => ({
  addressSearch(addr, cb) {
    const { result, status } = handler(addr);
    cb(result, status);
  },
});

describe('geocodeWith', () => {
  it('빈 주소 → status: empty', async () => {
    const res = await geocodeWith('', makeMockGeocoder(() => ({ result: [], status: 'OK' })));
    expect(res).toEqual({ lat: null, lng: null, status: 'empty' });
  });

  it('null → status: empty', async () => {
    const res = await geocodeWith(null, makeMockGeocoder(() => ({ result: [], status: 'OK' })));
    expect(res.status).toBe('empty');
  });

  it('공백 문자열 → status: empty', async () => {
    const res = await geocodeWith('   ', makeMockGeocoder(() => ({ result: [], status: 'OK' })));
    expect(res.status).toBe('empty');
  });

  it('OK + 결과 있으면 lat/lng 파싱', async () => {
    const mock = makeMockGeocoder(() => ({
      result: [{ x: '127.12345', y: '37.56789' }],
      status: 'OK',
    }));
    const res = await geocodeWith('서울시 강남구', mock);
    expect(res).toEqual({ lat: 37.56789, lng: 127.12345, status: 'ok' });
  });

  it('ZERO_RESULT → status: failed', async () => {
    const mock = makeMockGeocoder(() => ({ result: [], status: 'ZERO_RESULT' }));
    const res = await geocodeWith('없는주소', mock);
    expect(res).toEqual({ lat: null, lng: null, status: 'failed' });
  });

  it('ERROR → status: failed', async () => {
    const mock = makeMockGeocoder(() => ({ result: [], status: 'ERROR' }));
    const res = await geocodeWith('주소', mock);
    expect(res.status).toBe('failed');
  });
});
