import { NavLink } from 'react-router-dom';
import { Popover } from 'trust-ui-react';
import { useAuth } from '@/features/auth/useAuth';
import { usePermission } from '@/shared/auth/usePermission';
import { useLayout } from '@/shared/hooks/useIsMobile';
import { APP_TITLE, T, UNIT_NAME } from '@/shared/copy';
import './AppHeader.css';

/** Who is signed in and the way out: inline text from 820px up, a compact button with a small popover below. */
function UserMenu() {
  const { profile, signOut } = useAuth();
  const phone = useLayout() === 'phone';
  const name = profile?.display_name ?? '—';
  const role = profile ? T.role[profile.role] : T.header.unknownRole;

  if (!phone) {
    return (
      <div className="app-user">
        <b>{name}</b>
        {' · '}
        {role}
        {' | '}
        <button type="button" onClick={signOut}>{T.header.logout}</button>
      </div>
    );
  }
  return (
    <div className="app-user app-user--menu">
      <Popover
        presentation="popover"
        placement="bottom"
        align="end"
        label={T.header.userMenu}
        content={
          <div className="app-user-pop">
            <p>
              <b>{name}</b>
              <span>{role}</span>
            </p>
            <button type="button" onClick={signOut}>{T.header.logout}</button>
          </div>
        }
      >
        <button type="button" className="app-user-btn" aria-label={T.header.userMenu}>
          {name.slice(0, 1)}
        </button>
      </Popover>
    </div>
  );
}

export default function AppHeader() {
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
      <UserMenu />
    </header>
  );
}
