import { create } from 'zustand';

export interface HouseholdSelectionState {
  selectedHouseholdIds: Set<string>;
  toggle: (id: string) => void;
  clear: () => void;
}

export const useHouseholdSelectionStore = create<HouseholdSelectionState>((set) => ({
  selectedHouseholdIds: new Set(),
  toggle: (id) => set((state) => {
    const next = new Set(state.selectedHouseholdIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return { selectedHouseholdIds: next };
  }),
  clear: () => set({ selectedHouseholdIds: new Set() }),
}));
