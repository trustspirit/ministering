import { create } from 'zustand';

export interface SelectionState {
  selectedIds: Set<string>;
  toggle: (id: string) => void;
  setSelected: (ids: string[]) => void;
  removeAll: (ids: string[]) => void;
  clear: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedIds: new Set(),
  toggle: (id) => set((state) => {
    const next = new Set(state.selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return { selectedIds: next };
  }),
  setSelected: (ids) => set({ selectedIds: new Set(ids) }),
  removeAll: (ids) => set((state) => {
    const next = new Set(state.selectedIds);
    for (const id of ids) next.delete(id);
    return { selectedIds: next };
  }),
  clear: () => set({ selectedIds: new Set() }),
}));
