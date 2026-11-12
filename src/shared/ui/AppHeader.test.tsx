import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AppHeader from './AppHeader';

const mocks = vi.hoisted(() => ({ layout: 'wide' as string, signOut: vi.fn() }));
vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({ profile: { role: 'bishopric', display_name: '홍길동' }, signOut: mocks.signOut }),
}));
vi.mock('@/shared/hooks/useIsMobile', () => ({ useLayout: () => mocks.layout }));

const renderHeader = () =>
  render(
    <MemoryRouter>
      <AppHeader />
    </MemoryRouter>,
  );

describe('AppHeader user area', () => {
  beforeEach(() => {
    mocks.signOut.mockReset();
  });

  it('shows name · role and 로그아웃 inline from 820px up', async () => {
    mocks.layout = 'tablet';
    renderHeader();
    expect(screen.getByText('홍길동')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(mocks.signOut).toHaveBeenCalled();
  });

  it('on phones shows a compact button that opens name · role and 로그아웃', async () => {
    mocks.layout = 'phone';
    const user = userEvent.setup();
    renderHeader();
    expect(screen.queryByRole('button', { name: '로그아웃' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '사용자 메뉴' }));
    expect(await screen.findByText('감독단')).toBeInTheDocument();
    expect(screen.getByText('홍길동')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(mocks.signOut).toHaveBeenCalled();
  });
});
