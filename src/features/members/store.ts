import { create } from 'zustand';
import type { Member, Gender, ActiveStatus, Personality } from './types';

export interface MemberFilterState {
  search: string;
  gender: Gender | 'all';
  activeStatus: ActiveStatus | 'all';
  personality: Personality | 'all';
  setSearch: (v: string) => void;
  setGender: (v: Gender | 'all') => void;
  setActiveStatus: (v: ActiveStatus | 'all') => void;
  setPersonality: (v: Personality | 'all') => void;
  reset: () => void;
}

const initial = {
  search: '',
  gender: 'all' as const,
  activeStatus: 'all' as const,
  personality: 'all' as const,
};

export const useMemberFilterStore = create<MemberFilterState>((set) => ({
  ...initial,
  setSearch: (search) => set({ search }),
  setGender: (gender) => set({ gender }),
  setActiveStatus: (activeStatus) => set({ activeStatus }),
  setPersonality: (personality) => set({ personality }),
  reset: () => set(initial),
}));

type FilterSnapshot = Pick<MemberFilterState, 'search' | 'gender' | 'activeStatus' | 'personality'>;

export function filterMembers(members: Member[], f: FilterSnapshot): Member[] {
  const q = f.search.trim().toLowerCase();
  return members.filter((m) => {
    if (q && !m.full_name.toLowerCase().includes(q)) return false;
    if (f.gender !== 'all' && m.gender !== f.gender) return false;
    if (f.activeStatus !== 'all' && m.active_status !== f.activeStatus) return false;
    if (f.personality !== 'all' && m.personality !== f.personality) return false;
    return true;
  });
}
