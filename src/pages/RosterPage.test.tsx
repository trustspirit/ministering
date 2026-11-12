import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from 'trust-ui-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { household, member } from '@/features/assignment/ui/testUtils';
import RosterPage from './RosterPage';

const mocks = vi.hoisted(() => ({ canEditMembers: true, noMembers: false, layout: 'wide' as string }));

vi.mock('@/shared/auth/usePermission', () => ({
  usePermission: () => ({ canEditMembers: mocks.canEditMembers }),
}));
vi.mock('@/shared/hooks/useRealtimeSync', () => ({ useRealtimeSync: () => {} }));
vi.mock('@/shared/hooks/useIsMobile', () => ({
  useIsMobile: () => mocks.layout === 'phone' || mocks.layout === 'tablet',
}));
vi.mock('@/features/assignment/hooks/useAssignmentBoard', () => ({
  useAssignmentBoard: () => ({ data: undefined }),
}));
vi.mock('@/features/members/hooks/useMembers', () => ({
  useMembers: () => ({
    data: mocks.noMembers
      ? []
      : [member({ id: 'a', full_name: '한상철', household_id: 'h', household_role: 'husband' })],
    isError: false,
  }),
}));
vi.mock('@/features/households/hooks/useHouseholds', () => ({
  useHouseholds: () => ({ data: [household({ id: 'h', name: '한상철 가정' })], isError: false }),
}));

function open() {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <RosterPage />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('RosterPage', () => {
  beforeEach(() => {
    mocks.canEditMembers = true;
    mocks.noMembers = false;
    mocks.layout = 'wide';
  });

  it.each(['phone', 'tablet'])('%s gets the stacked list instead of the table', (layout) => {
    mocks.layout = layout;
    open();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByRole('region', { name: '명부' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '한상철 가정' })).toBeInTheDocument();
  });

  it.each(['compact', 'wide'])('%s keeps the table', (layout) => {
    mocks.layout = layout;
    open();
    expect(screen.getByRole('table', { name: '명부' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '명부' })).toBeNull();
  });

  it('shows the summary numbers and, for editors, every edit control', () => {
    open();
    expect(screen.getByText('한상철 가정')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '＋ 사람 등록' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CSV 가져오기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CSV 내보내기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '한상철 수정' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '한상철 가정 수정' })).toBeInTheDocument();
  });

  it('names the three filters through aria-label', () => {
    open();
    for (const name of ['상태', '성별', '성향']) {
      expect(screen.getByRole('combobox', { name })).toBeInTheDocument();
    }
  });

  it('an empty roster gets its own empty state, with the way to start only for editors', () => {
    mocks.noMembers = true;
    open();
    expect(screen.getByRole('heading', { name: '아직 등록된 사람이 없습니다' })).toBeInTheDocument();
    expect(screen.getByText('사람 등록이나 CSV 가져오기로 시작하세요.')).toBeInTheDocument();
  });

  it('a viewer sees no 등록, 수정 or CSV 가져오기 but can still export', () => {
    mocks.canEditMembers = false;
    open();
    expect(screen.getByText('한상철 가정')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '＋ 사람 등록' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'CSV 가져오기' })).toBeNull();
    expect(screen.queryByRole('button', { name: /수정/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'CSV 내보내기' })).toBeInTheDocument();
  });
});
