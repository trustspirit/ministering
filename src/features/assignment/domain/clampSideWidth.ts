import { BP } from '@/shared/ui/breakpoints';

/** Grid pieces between the pool and the right column, matching `.aw-work` in assignment.css. */
const BAR = 7;
const MIN_BOARD = 300;
const MIN_SIDE = 300;
const DEFAULT_VW = 45;

/** Width of the pool (left) column: 286px on wide windows, 240px in the compact three-column layout. */
export function poolWidthFor(windowWidth: number): number {
  return windowWidth >= BP.wide ? 286 : 240;
}

/**
 * The map (right) column's actual width in px for a stored `px`/`vw` width: at most what leaves the companionship
 * board its 300px minimum, at least 300px. `vw` is taken against `workWidth` (the workspace spans the window).
 */
export function clampSideWidth(side: string, workWidth: number, poolWidth: number): number {
  const match = /^(\d+(?:\.\d+)?)(px|vw)$/.exec(side);
  const wanted = !match
    ? (workWidth * DEFAULT_VW) / 100
    : match[2] === 'vw'
      ? (workWidth * Number(match[1])) / 100
      : Number(match[1]);
  const max = workWidth - poolWidth - BAR - MIN_BOARD;
  return Math.max(MIN_SIDE, Math.min(wanted, max));
}
