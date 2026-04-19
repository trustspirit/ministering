import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { usePermission } from '@/shared/auth/usePermission';

const navLinkStyle = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded text-sm ${isActive ? 'bg-slate-200 font-medium' : 'hover:bg-slate-100'}`;

export default function Layout() {
  const { profile, signOut } = useAuth();
  const perm = usePermission();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto flex items-center gap-4 px-4 py-3">
          <h1 className="font-semibold text-lg">성역 편성 관리</h1>
          <nav className="flex items-center gap-1 ml-6">
            <NavLink to="/" end className={navLinkStyle}>대시보드</NavLink>
            <NavLink to="/assignments/rs" className={navLinkStyle}>RS 편성</NavLink>
            <NavLink to="/assignments/eq" className={navLinkStyle}>EQ 편성</NavLink>
            <NavLink to="/members" className={navLinkStyle}>회원</NavLink>
            <NavLink to="/households" className={navLinkStyle}>가정</NavLink>
            {perm.canManageUsers && (
              <NavLink to="/settings" className={navLinkStyle}>설정</NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-slate-600">
              {profile?.display_name ?? '—'} · <span className="text-xs text-slate-500">{profile?.role ?? 'unknown'}</span>
            </span>
            <button onClick={signOut} className="text-slate-500 hover:text-slate-900">
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
