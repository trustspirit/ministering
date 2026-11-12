import { useSyncExternalStore } from 'react';
import { BP, type Layout } from '@/shared/ui/breakpoints';

/** One media query per breakpoint, written like the CSS ones (`max-width: 819.98px` etc.). */
const QUERIES = [BP.phone, BP.compact, BP.wide].map((bp) => `(max-width: ${bp - 0.02}px)`);
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
