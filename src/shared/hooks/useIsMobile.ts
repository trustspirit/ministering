import { useSyncExternalStore } from 'react';

/** Phone layout: strictly below 820px. Keep in sync with the `max-width: 819.98px` CSS media queries. */
export const MOBILE_QUERY = '(max-width: 819.98px)';

function subscribe(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

const getSnapshot = () =>
  typeof window.matchMedia === 'function' && window.matchMedia(MOBILE_QUERY).matches;

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
