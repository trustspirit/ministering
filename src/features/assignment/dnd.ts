import type React from 'react';
import { create } from 'zustand';
import { useToast } from 'trust-ui-react';
import type { Organization } from '@/features/ministries/types';
import { resolveDrop, type DragItem, type DropTarget } from './domain/resolveDrop';
import { useWorkspace } from './workspaceContext';

/** Marks a drag as one of ours; foreign drags (files, selected text) never carry it. */
export const DRAG_MIME = 'application/x-ministering-item';

let current: DragItem | null = null;

interface DragState {
  item: DragItem | null;
  /** Key of the drop area currently highlighted (see `overKey`). */
  over: string | null;
  setOver: (over: string | null) => void;
}

/** Render-facing mirror of the drag in progress, used only for highlighting. */
export const useDragStore = create<DragState>((set) => ({
  item: null,
  over: null,
  setOver: (over) => set((s) => (s.over === over ? s : { over })),
}));

export const overKey = {
  pool: 'pool',
  newMinistry: 'new',
  zone: (ministryId: string, zone: string) => `${ministryId}:${zone}`,
};

type DragEventLike = Pick<React.DragEvent | DragEvent, 'dataTransfer'>;

export function startDrag(e: React.DragEvent, item: DragItem): void {
  current = item;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData(DRAG_MIME, item.id);
  e.dataTransfer.setData('text/plain', item.id);
  // Defer the render-facing update: the browser snapshots the drag image after dragstart, and
  // the source card must not already be faded in that snapshot.
  setTimeout(() => {
    if (current === item) useDragStore.setState({ item, over: null });
  });
}

export function getDrag(): DragItem | null {
  return current;
}

export function endDrag(): void {
  if (!current && !useDragStore.getState().item && !useDragStore.getState().over) return;
  current = null;
  useDragStore.setState({ item: null, over: null });
}

export function isOurDrag(e: DragEventLike): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes(DRAG_MIME);
}

/**
 * For dragover: the drag in progress when `e` belongs to it. A foreign drag means any
 * remembered item is stale (its dragend was lost), so the state is cleared.
 */
export function dragOf(e: DragEventLike): DragItem | null {
  if (!isOurDrag(e)) {
    endDrag();
    return null;
  }
  return current;
}

/** For drop: like `dragOf`, but always ends the drag. */
export function takeDrag(e: DragEventLike): DragItem | null {
  const item = isOurDrag(e) ? current : null;
  endDrag();
  return item;
}

/** Resolves `item` against `target`; rejections become a toast, accepted moves are performed. Shared by drop and tap-to-assign. */
export function useAssign(org: Organization): (item: DragItem, target: DropTarget) => void {
  const { board, members, actions } = useWorkspace();
  const { toast } = useToast();
  return (item, target) => {
    if (board.organization !== org) return;
    const result = resolveDrop({ board, item, target, members });
    if (!result.ok) {
      toast({ variant: 'warning', message: result.message });
      return;
    }
    void actions.perform(result.ops);
  };
}

/** Drop handler: takes the drag in progress and hands it to `useAssign`. */
export function useDropHandler(org: Organization): (e: DragEventLike, target: DropTarget) => void {
  const assign = useAssign(org);
  return (e, target) => {
    const item = takeDrag(e);
    if (item) assign(item, target);
  };
}
