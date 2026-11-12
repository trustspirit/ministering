import { useLayoutEffect, useState } from 'react';

/** Taller than two wrapped rows of the sub bar (4px padding, two 22px rows, 4px row gap, 1px rule). */
const TWO_ROWS = 70;

function fit(el: HTMLElement) {
  delete el.dataset.fit;
  if (el.getBoundingClientRect().height > TWO_ROWS) el.dataset.fit = 'tight';
}

/**
 * The sub bar wraps instead of scrolling. When everything would take more than two rows, the status legend (the
 * lowest-priority item left) is hidden via `data-fit="tight"`; warnings are never hidden. Decided from the bar's
 * real width, re-checked after every render and whenever the surrounding screen is resized.
 * Returns a callback ref for the `.aw-sub` element.
 */
export function useSubbarFit(): (el: HTMLElement | null) => void {
  const [bar, setBar] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (bar) fit(bar);
  });

  useLayoutEffect(() => {
    // Observe the screen around the bar, not the bar itself: hiding the legend changes the bar's own height.
    const outer = bar?.parentElement;
    if (!bar || !outer || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => fit(bar));
    ro.observe(outer);
    return () => ro.disconnect();
  }, [bar]);

  return setBar;
}
