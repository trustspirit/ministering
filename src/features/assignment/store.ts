import { create } from 'zustand';
import type { Organization } from '@/features/ministries/types';

export type Selection = { kind: 'member' | 'household'; id: string };
export type MobileTab = 'pool' | 'board' | 'map';

export const SIDE_WIDTH_KEY = 'ministering.sideWidth';
export const DEFAULT_SIDE_WIDTH = '45vw';

const SIDE_WIDTH_PATTERN = /^\d+(\.\d+)?(px|vw)$/;

/** A stored width is only trusted when it is a plain px/vw length; anything else falls back to the default. */
export function parseSideWidth(value: string | null | undefined): string {
  return value && SIDE_WIDTH_PATTERN.test(value) ? value : DEFAULT_SIDE_WIDTH;
}

function readSideWidth(): string {
  try {
    return parseSideWidth(window.localStorage.getItem(SIDE_WIDTH_KEY));
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
  /** Sets and persists the right column width. */
  setSideWidth: (width: string) => void;
  /** Sets the width without persisting it (while the resize bar is being dragged). */
  previewSideWidth: (width: string) => void;
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
  setSideWidth: (width) => {
    const sideWidth = parseSideWidth(width);
    try {
      window.localStorage.setItem(SIDE_WIDTH_KEY, sideWidth);
    } catch {
      // Storage unavailable (private mode): keep the width for this session only.
    }
    set({ sideWidth });
  },
  previewSideWidth: (width) => set({ sideWidth: parseSideWidth(width) }),
  setMobileTab: (mobileTab) => set({ mobileTab }),
}));
