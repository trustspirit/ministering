import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import HomeRedirect from './HomeRedirect';

const useAuth = vi.fn();
vi.mock('@/features/auth/useAuth', () => ({ useAuth: () => useAuth() }));

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/assignments/rs" element={<div>rs page</div>} />
        <Route path="/assignments/eq" element={<div>eq page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HomeRedirect', () => {
  beforeEach(() => useAuth.mockReset());

  it('waits while the profile is loading', () => {
    useAuth.mockReturnValue({ profile: null, profileLoaded: false });
    renderHome();
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument();
    expect(screen.queryByText('rs page')).toBeNull();
    expect(screen.queryByText('eq page')).toBeNull();
  });

  it('sends an RS president to the RS board', () => {
    useAuth.mockReturnValue({ profile: { role: 'rs_president' }, profileLoaded: true });
    renderHome();
    expect(screen.getByText('rs page')).toBeInTheDocument();
  });

  it('falls back to the EQ board without a profile', () => {
    useAuth.mockReturnValue({ profile: null, profileLoaded: true });
    renderHome();
    expect(screen.getByText('eq page')).toBeInTheDocument();
  });
});
