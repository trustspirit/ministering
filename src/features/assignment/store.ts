import { create } from 'zustand';
import type { Organization } from '@/features/ministries/types';

export type Selection = { kind: 'member' | 'household'; id: string };
export type MobileTab = 'pool' | 'board' | 'map';

export const SIDE_WIDTH_KEY = 'ministering.sideWidth';
export const DEFAULT_SIDE_WIDTH = '45vw';

function readSideWidth(): string {
  try {
    return window.localStorage.getItem(SIDE_WIDTH_KEY) || DEFAULT_SIDE_WIDTH;
  } catch {
    return DEFAULT_SIDE_WIDTH;
  }
}

export interface WorkspaceState {
  org: Organization | null;
  selected: Selection | null;
  hotMinistryId: string | null;
  search: string;
  sideWidth: string;
  mobileTab: MobileTab;
  /** Switching organization clears the selection and the highlighted ministry. */
  setOrg: (org: Organization) => void;
  setSelected: (selected: Selection | null) => void;
  setHotMinistryId: (id: string | null) => void;
  toggleHotMinistry: (id: string) => void;
  setSearch: (search: string) => void;
  setSideWidth: (width: string) => void;
  setMobileTab: (tab: MobileTab) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  org: null,
  selected: null,
  hotMinistryId: null,
  search: '',
  sideWidth: readSideWidth(),
  mobileTab: 'board',
  setOrg: (org) =>
    set((s) => (s.org === org ? s : { org, selected: null, hotMinistryId: null })),
  setSelected: (selected) => set({ selected }),
  setHotMinistryId: (hotMinistryId) => set({ hotMinistryId }),
  toggleHotMinistry: (id) => set((s) => ({ hotMinistryId: s.hotMinistryId === id ? null : id })),
  setSearch: (search) => set({ search }),
  setSideWidth: (sideWidth) => {
    try {
      window.localStorage.setItem(SIDE_WIDTH_KEY, sideWidth);
    } catch {
      // Storage unavailable (private mode): keep the width for this session only.
    }
    set({ sideWidth });
  },
  setMobileTab: (mobileTab) => set({ mobileTab }),
}));
