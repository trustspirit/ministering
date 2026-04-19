import { loadKakaoMapsSdk } from './kakaoSdk';

export type GeocodeStatus = 'ok' | 'empty' | 'failed';

export interface GeocodeResult {
  lat: number | null;
  lng: number | null;
  status: GeocodeStatus;
}

export interface GeocoderPort {
  addressSearch(
    addr: string,
    cb: (result: Array<{ x: string; y: string }>, status: string) => void,
  ): void;
}

export function geocodeWith(
  address: string | null | undefined,
  geocoder: GeocoderPort,
): Promise<GeocodeResult> {
  return new Promise((resolve) => {
    if (!address || address.trim().length === 0) {
      resolve({ lat: null, lng: null, status: 'empty' });
      return;
    }
    geocoder.addressSearch(address, (result, status) => {
      if (status === 'OK' && result.length > 0) {
        resolve({
          lat: parseFloat(result[0].y),
          lng: parseFloat(result[0].x),
          status: 'ok',
        });
      } else if (status === 'ZERO_RESULT') {
        resolve({ lat: null, lng: null, status: 'failed' });
      } else {
        resolve({ lat: null, lng: null, status: 'failed' });
      }
    });
  });
}

let cachedGeocoder: GeocoderPort | null = null;

async function getKakaoGeocoder(): Promise<GeocoderPort> {
  if (cachedGeocoder) return cachedGeocoder;
  await loadKakaoMapsSdk();
  cachedGeocoder = new window.kakao!.maps.services.Geocoder() as GeocoderPort;
  return cachedGeocoder;
}

export async function geocodeAddress(address: string | null | undefined): Promise<GeocodeResult> {
  if (!address || address.trim().length === 0) {
    return { lat: null, lng: null, status: 'empty' };
  }
  try {
    const geocoder = await getKakaoGeocoder();
    return await geocodeWith(address, geocoder);
  } catch {
    return { lat: null, lng: null, status: 'failed' };
  }
}
