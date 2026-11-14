import { describe, expect, it } from 'vitest';
import { searchAddressesWith, toAddressHits, type AddressSearchPort } from './addressSearch';

const gangdong = {
  address_name: '서울 강동구 고덕동 693',
  road_address: { address_name: '서울 강동구 상일로 55' },
  x: '127.1687',
  y: '37.5533',
};

describe('toAddressHits', () => {
  it('prefers the road address and keeps the lot address as the second line', () => {
    expect(toAddressHits([gangdong], [])).toEqual([
      { id: '0', address: '서울 강동구 상일로 55', description: '서울 강동구 고덕동 693', lat: 37.5533, lng: 127.1687 },
    ]);
  });

  it('falls back to the lot address when there is no road address', () => {
    const lot = { address_name: '서울 송파구 거여동 266-12', road_address: null, x: '127.151', y: '37.4907' };
    expect(toAddressHits([lot], [])[0]).toMatchObject({ address: '서울 송파구 거여동 266-12', description: undefined });
  });

  it('turns a place (apartment, building) into its address with the place name as the second line', () => {
    const place = {
      place_name: '고덕자이아파트',
      road_address_name: '서울 강동구 상일로 55',
      address_name: '서울 강동구 고덕동 693',
      x: '127.1687',
      y: '37.5533',
    };
    expect(toAddressHits([], [place])).toEqual([
      { id: '0', address: '서울 강동구 상일로 55', description: '고덕자이아파트', lat: 37.5533, lng: 127.1687 },
    ]);
  });

  it('lists each address once, addresses before places, at most 10', () => {
    const place = { place_name: '고덕자이', road_address_name: '서울 강동구 상일로 55', address_name: 'x', x: '1', y: '2' };
    const many = Array.from({ length: 12 }, (_, i) => ({
      place_name: `p${i}`,
      road_address_name: `서울 어딘가 ${i}`,
      address_name: '',
      x: '1',
      y: '2',
    }));
    const hits = toAddressHits([gangdong], [place, ...many]);
    expect(hits[0].address).toBe('서울 강동구 상일로 55');
    expect(hits.filter((h) => h.address === '서울 강동구 상일로 55')).toHaveLength(1);
    expect(hits).toHaveLength(10);
    expect(hits.map((h) => h.id)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });
});

describe('searchAddressesWith', () => {
  const port = (addresses: unknown[], places: unknown[]): AddressSearchPort => ({
    addressSearch: (_q, cb) => cb(addresses as never, addresses.length ? 'OK' : 'ZERO_RESULT'),
    keywordSearch: (_q, cb) => cb(places as never, places.length ? 'OK' : 'ZERO_RESULT'),
  });

  it('asks both searches and merges them', async () => {
    const hits = await searchAddressesWith('상일로 55', port([gangdong], []));
    expect(hits.map((h) => h.address)).toEqual(['서울 강동구 상일로 55']);
  });

  it('returns nothing for blank input without searching', async () => {
    let called = false;
    const spy: AddressSearchPort = {
      addressSearch: () => {
        called = true;
      },
      keywordSearch: () => {
        called = true;
      },
    };
    expect(await searchAddressesWith('  ', spy)).toEqual([]);
    expect(called).toBe(false);
  });

  it('treats a failed search as no results', async () => {
    const failing: AddressSearchPort = {
      addressSearch: (_q, cb) => cb([], 'ERROR'),
      keywordSearch: (_q, cb) => cb([], 'ERROR'),
    };
    expect(await searchAddressesWith('아무거나', failing)).toEqual([]);
  });
});
