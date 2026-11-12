import { useState, type PointerEvent } from 'react';
import clsx from 'clsx';
import { T } from '@/shared/copy';
import { clampSideWidth, poolWidthFor } from '../domain/clampSideWidth';
import { useWorkspaceStore } from '../store';

/** Vertical bar between the board and the right column; dragging it sets the right column width. */
export function ResizeBar() {
  const previewSideWidth = useWorkspaceStore((s) => s.previewSideWidth);
  const setSideWidth = useWorkspaceStore((s) => s.setSideWidth);
  const [active, setActive] = useState(false);

  // Persist once, when the drag ends (or is cancelled by the browser).
  const finish = (e: PointerEvent<HTMLDivElement>) => {
    if (!active) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setActive(false);
    setSideWidth(useWorkspaceStore.getState().sideWidth);
  };

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
        const w = window.innerWidth;
        const width = clampSideWidth(`${Math.max(0, w - e.clientX)}px`, w, poolWidthFor(w));
        previewSideWidth(`${Math.round(width)}px`);
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
    />
  );
}
