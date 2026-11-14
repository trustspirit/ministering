import { loadKakaoMapsSdk } from './kakaoSdk';

/** One address the user can pick: the text that is saved and the coordinates that go with it. */
export interface AddressHit {
  id: string;
  /** Road address when Kakao has one, else the lot address. This is what gets saved. */
  address: string;
  /** Second line in the list: the lot address, or the name of the place that matched. */
  description?: string;
  lat: number;
  lng: number;
}

interface KakaoAddress {
  address_name: string;
  road_address: { address_name: string } | null;
  x: string;
  y: string;
}

interface KakaoPlace {
  place_name: string;
  road_address_name: string;
  address_name: string;
  x: string;
  y: string;
}

type Callback<T> = (result: T[], status: string) => void;

/** The two Kakao Maps searches used: by address, and by place name (apartment complexes, buildings). */
export interface AddressSearchPort {
  addressSearch(query: string, cb: Callback<KakaoAddress>): void;
  keywordSearch(query: string, cb: Callback<KakaoPlace>): void;
}

const MAX_HITS = 10;

export function toAddressHits(addresses: KakaoAddress[], places: KakaoPlace[]): AddressHit[] {
  const candidates: Omit<AddressHit, 'id'>[] = [
    ...addresses.map((a) => {
      const road = a.road_address?.address_name;
      return { address: road || a.address_name, description: road ? a.address_name : undefined, x: a.x, y: a.y };
    }),
    ...places.map((p) => ({ address: p.road_address_name || p.address_name, description: p.place_name, x: p.x, y: p.y })),
  ].map(({ x, y, ...rest }) => ({ ...rest, lat: parseFloat(y), lng: parseFloat(x) }));

  const seen = new Set<string>();
  const hits: AddressHit[] = [];
  for (const c of candidates) {
    if (!c.address || seen.has(c.address)) continue;
    seen.add(c.address);
    hits.push({ id: String(hits.length), ...c });
    if (hits.length === MAX_HITS) break;
  }
  return hits;
}

function ask<T>(run: (cb: Callback<T>) => void): Promise<T[]> {
  return new Promise((resolve) => run((result, status) => resolve(status === 'OK' ? result : [])));
}

export async function searchAddressesWith(query: string, port: AddressSearchPort): Promise<AddressHit[]> {
  const q = query.trim();
  if (!q) return [];
  const [addresses, places] = await Promise.all([
    ask<KakaoAddress>((cb) => port.addressSearch(q, cb)),
    ask<KakaoPlace>((cb) => port.keywordSearch(q, cb)),
  ]);
  return toAddressHits(addresses, places);
}

let cachedPort: AddressSearchPort | null = null;

async function kakaoPort(): Promise<AddressSearchPort> {
  if (cachedPort) return cachedPort;
  await loadKakaoMapsSdk();
  const services = window.kakao!.maps.services;
  const geocoder = new services.Geocoder();
  const places = new services.Places();
  cachedPort = {
    addressSearch: (q, cb) => geocoder.addressSearch(q, cb as never),
    keywordSearch: (q, cb) => places.keywordSearch(q, cb as never),
  };
  return cachedPort;
}

/** Kakao address + place search. Resolves with no hits when the SDK cannot be loaded. */
export async function searchAddresses(query: string): Promise<AddressHit[]> {
  try {
    return await searchAddressesWith(query, await kakaoPort());
  } catch {
    return [];
  }
}
