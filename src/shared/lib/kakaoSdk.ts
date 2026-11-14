declare global {
  interface Window {
    kakao?: {
      maps: {
        load: (cb: () => void) => void;
        services: {
          Geocoder: new () => {
            addressSearch: (
              addr: string,
              cb: (result: Array<{ x: string; y: string }>, status: string) => void,
            ) => void;
          };
          Places: new () => {
            keywordSearch: (query: string, cb: (result: unknown[], status: string) => void) => void;
          };
          Status: { OK: string; ZERO_RESULT: string; ERROR: string };
        };
      };
    };
  }
}

let loadPromise: Promise<void> | null = null;

export function loadKakaoMapsSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('window unavailable'));
  if (window.kakao?.maps) return Promise.resolve();

  if (loadPromise) return loadPromise;

  const key = import.meta.env.VITE_KAKAO_JS_KEY;
  if (!key) return Promise.reject(new Error('VITE_KAKAO_JS_KEY missing'));

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&libraries=services&autoload=false`;
    script.async = true;
    script.onerror = () => reject(new Error('Kakao SDK load failed'));
    script.onload = () => {
      window.kakao!.maps.load(() => resolve());
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
