import { useLayoutEffect, useState } from 'react';

/** Taller than two wrapped rows of the sub bar (4px padding, two 22px rows, 4px row gap, 1px rule). */
const TWO_ROWS = 70;

/**
 * Decides the sub bar's fit from its height with every item shown: beyond two rows the status legend (the
 * lowest-priority item left) is hidden. Warnings are never hidden.
 */
export function subbarFit(fullHeight: number): 'tight' | null {
  return fullHeight > TWO_ROWS ? 'tight' : null;
}

function fit(el: HTMLElement) {
  delete el.dataset.fit;
  const next = subbarFit(el.getBoundingClientRect().height);
  if (next) el.dataset.fit = next;
}

/**
 * The sub bar wraps instead of scrolling; this sets `data-fit="tight"` on it when everything would take more than
 * two rows. Re-checked when the surrounding screen is resized, when `content` (a signature of what the bar shows)
 * changes, and once the web fonts have loaded. Returns a callback ref for the `.aw-sub` element.
 */
export function useSubbarFit(content: string): (el: HTMLElement | null) => void {
  const [bar, setBar] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (bar) fit(bar);
  }, [bar, content]);

  useLayoutEffect(() => {
    // Observe the screen around the bar, not the bar itself: hiding the legend changes the bar's own height.
    const outer = bar?.parentElement;
    if (!bar || !outer) return;
    let live = true;
    const refit = () => {
      if (live) fit(bar);
    };
    void document.fonts?.ready.then(refit);
    if (typeof ResizeObserver === 'undefined') {
      return () => {
        live = false;
      };
    }
    const ro = new ResizeObserver(refit);
    ro.observe(outer);
    return () => {
      live = false;
      ro.disconnect();
    };
  }, [bar]);

  return setBar;
}
