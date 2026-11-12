/**
 * Layout breakpoints — the single source of truth for JS. CSS cannot import this file, so every media query uses the
 * same values as literals just below each step: `max-width: 819.98px` (phone), `1023.98px` (tablet), `1279.98px`
 * (compact). Change them together.
 */
export const BP = { phone: 820, compact: 1024, wide: 1280 } as const;

/** phone < 820 ≤ tablet < 1024 ≤ compact < 1280 ≤ wide. Phone and tablet use the tabbed one-panel layout. */
export type Layout = 'phone' | 'tablet' | 'compact' | 'wide';

export function layoutFor(width: number): Layout {
  if (width < BP.phone) return 'phone';
  if (width < BP.compact) return 'tablet';
  if (width < BP.wide) return 'compact';
  return 'wide';
}
