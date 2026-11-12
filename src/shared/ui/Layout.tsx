import { Outlet } from 'react-router-dom';
import AppHeader from '@/shared/ui/AppHeader';

export default function Layout() {
  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppHeader />
      {/* App screens fill this exactly and scroll inside their own panels (no page scrollbar). */}
      <main style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Outlet />
      </main>
    </div>
  );
}
