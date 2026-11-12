import type React from 'react';
import { create } from 'zustand';
import { useToast } from 'trust-ui-react';
import type { Organization } from '@/features/ministries/types';
import { resolveDrop, type DragItem, type DropTarget } from './domain/resolveDrop';
import { useWorkspace } from './workspaceContext';

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

export function startDrag(e: React.DragEvent, item: DragItem): void {
  current = item;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', item.id);
  useDragStore.setState({ item, over: null });
}

export function getDrag(): DragItem | null {
  return current;
}

export function endDrag(): void {
  current = null;
  useDragStore.setState({ item: null, over: null });
}

/** Resolves the drag in progress against `target`; rejections become a toast, accepted drops are performed. */
export function useDropHandler(org: Organization): (target: DropTarget) => void {
  const { board, members, actions } = useWorkspace();
  const { toast } = useToast();
  return (target) => {
    const item = getDrag();
    endDrag();
    if (!item || board.organization !== org) return;
    const result = resolveDrop({ board, item, target, members });
    if (!result.ok) {
      toast({ variant: 'warning', message: result.message });
      return;
    }
    void actions.perform(result.ops);
  };
}
