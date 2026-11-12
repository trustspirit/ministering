import { useSyncExternalStore } from 'react';
import { QUERY_BELOW, type Layout } from '@/shared/ui/breakpoints';

/** Narrowest first: below 820 is phone, below 1024 tablet, below 1280 compact. */
const QUERIES = [QUERY_BELOW.phone, QUERY_BELOW.compact, QUERY_BELOW.wide];
const LAYOUTS: Layout[] = ['phone', 'tablet', 'compact'];

const hasMatchMedia = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

function subscribe(onChange: () => void): () => void {
  if (!hasMatchMedia()) return () => {};
  const lists = QUERIES.map((q) => window.matchMedia(q));
  lists.forEach((mq) => mq.addEventListener('change', onChange));
  return () => lists.forEach((mq) => mq.removeEventListener('change', onChange));
}

function getSnapshot(): Layout {
  if (!hasMatchMedia()) return 'wide';
  const i = QUERIES.findIndex((q) => window.matchMedia(q).matches);
  return i === -1 ? 'wide' : LAYOUTS[i];
}

/** The current layout step (see src/shared/ui/breakpoints.ts); updates when the window crosses a breakpoint. */
export function useLayout(): Layout {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'wide');
}

/** Tabbed one-panel layout (phone or tablet: below 1024px). */
export function useIsMobile(): boolean {
  const layout = useLayout();
  return layout === 'phone' || layout === 'tablet';
}
