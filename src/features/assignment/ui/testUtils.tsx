import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { ToastProvider } from 'trust-ui-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Household } from '@/features/households/types';
import type { Member } from '@/features/members/types';
import type { Organization } from '@/features/ministries/types';
import type { Board } from '../domain/board';
import { buildLookups, WorkspaceContext, type WorkspaceData } from '../workspaceContext';

export function member(over: Partial<Member> & Pick<Member, 'id' | 'full_name'>): Member {
  return {
    active_status: 'active',
    address: null,
    birth_date: '1976-01-01',
    created_at: '',
    gender: 'M',
    household_id: null,
    household_role: 'other',
    is_deleted: false,
    lat: null,
    lng: null,
    memo: null,
    personality: 'moderate',
    phone: null,
    updated_at: '',
    ...over,
  };
}

export function household(over: Partial<Household> & Pick<Household, 'id' | 'name'>): Household {
  return { address: null, created_at: '', lat: null, lng: null, memo: null, updated_at: '', ...over };
}

export function renderWorkspace(
  ui: ReactNode,
  opts: { org?: Organization; canEdit?: boolean; members?: Member[]; households?: Household[]; board?: Board } = {},
) {
  const org = opts.org ?? 'EQ';
  const members = opts.members ?? [];
  const households = opts.households ?? [];
  const value: WorkspaceData = {
    org,
    board: opts.board ?? { organization: org, ministries: [] },
    canEdit: opts.canEdit ?? true,
    members,
    ...buildLookups(members, households),
    actions: {
      perform: vi.fn(async () => {}),
      renameMinistry: vi.fn(async () => {}),
      deleteMinistry: vi.fn(async () => {}),
      setShareToken: vi.fn(async () => true),
      pending: false,
    },
  };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    value,
    wrapper: (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <WorkspaceContext.Provider value={value}>{ui}</WorkspaceContext.Provider>
        </ToastProvider>
      </QueryClientProvider>
    ),
  };
}
