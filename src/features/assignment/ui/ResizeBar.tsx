import { useState } from 'react';
import clsx from 'clsx';
import { T } from '@/shared/copy';
import { useWorkspaceStore } from '../store';

const MIN_SIDE = 300;
/** Pool (286) + bar (7) + the board's minimum width. */
const MIN_REST = 640;

/** Vertical bar between the board and the right column; dragging it sets the right column width. */
export function ResizeBar() {
  const setSideWidth = useWorkspaceStore((s) => s.setSideWidth);
  const [active, setActive] = useState(false);

  return (
    <div
      className={clsx('aw-bar', active && 'aw-bar--on')}
      role="separator"
      aria-orientation="vertical"
      title={T.assign.resize}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setActive(true);
      }}
      onPointerMove={(e) => {
        if (!active) return;
        const width = Math.min(Math.max(window.innerWidth - e.clientX, MIN_SIDE), window.innerWidth - MIN_REST);
        setSideWidth(`${Math.round(width)}px`);
      }}
      onPointerUp={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        setActive(false);
      }}
    />
  );
}
