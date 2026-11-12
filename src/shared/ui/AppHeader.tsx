import { NavLink } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { usePermission } from '@/shared/auth/usePermission';
import { APP_TITLE, T, UNIT_NAME } from '@/shared/copy';
import './AppHeader.css';

export default function AppHeader() {
  const { profile, signOut } = useAuth();
  const perm = usePermission();
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'app-tab app-tab--on' : 'app-tab';

  return (
    <header className="app-header">
      <div className="app-symbol">
        <img src="/brand/church-symbol-ko-white.png" alt={T.header.symbolAlt} />
      </div>
      <img className="app-wordmark" src="/brand/church-wordmark-ko.svg" alt={T.header.logoAlt} />
      <div className="app-title">
        <h1>{APP_TITLE}</h1>
        {UNIT_NAME && <small>{UNIT_NAME}</small>}
      </div>
      <nav className="app-nav" aria-label={T.header.navLabel}>
        <NavLink to="/assignments/eq" className={tabClass}>{T.nav.eq}</NavLink>
        <NavLink to="/assignments/rs" className={tabClass}>{T.nav.rs}</NavLink>
        <span className="app-nav-gap" />
        <NavLink to="/roster" className={tabClass}>{T.nav.roster}</NavLink>
        {perm.canManageUsers && (
          <NavLink to="/settings" className={tabClass}>{T.nav.settings}</NavLink>
        )}
      </nav>
      <div className="app-user">
        <b>{profile?.display_name ?? '—'}</b>
        {' · '}
        {profile ? T.role[profile.role] : T.header.unknownRole}
        {' | '}
        <button type="button" onClick={signOut}>{T.header.logout}</button>
      </div>
    </header>
  );
}
