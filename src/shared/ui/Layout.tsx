import { Outlet } from 'react-router-dom';
import AppHeader from '@/shared/ui/AppHeader';

export default function Layout() {
  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppHeader />
      {/* Legacy pages expect a scrolling, padded container until they are replaced. */}
      <main style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
