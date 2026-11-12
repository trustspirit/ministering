import { createContext, useContext } from 'react';
import type { Household } from '@/features/households/types';
import type { Member } from '@/features/members/types';
import type { Organization } from '@/features/ministries/types';
import type { Board } from './domain/board';
import type { BoardActions } from './hooks/useBoardActions';

/** Everything the workspace cards need, built once by AssignmentPage so all cards share one action queue. */
export interface WorkspaceData {
  org: Organization;
  board: Board;
  canEdit: boolean;
  members: Member[];
  memberById: Map<string, Member>;
  householdById: Map<string, Household>;
  /** household id → its members (unsorted) */
  familyOf: Map<string, Member[]>;
  actions: BoardActions;
}

export const WorkspaceContext = createContext<WorkspaceData | null>(null);

export function useWorkspace(): WorkspaceData {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceContext');
  return value;
}

export function buildLookups(members: Member[], households: Household[]) {
  const memberById = new Map(members.map((m) => [m.id, m]));
  const householdById = new Map(households.map((h) => [h.id, h]));
  const familyOf = new Map<string, Member[]>();
  for (const m of members) {
    if (!m.household_id) continue;
    const list = familyOf.get(m.household_id);
    if (list) list.push(m);
    else familyOf.set(m.household_id, [m]);
  }
  return { memberById, householdById, familyOf };
}
