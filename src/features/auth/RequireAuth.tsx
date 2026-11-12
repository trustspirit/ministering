import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from 'trust-ui-react';
import { T } from '@/shared/copy';
import { useAuth } from './useAuth';

export default function RequireAuth() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="app-loading"><Spinner size="sm" label={T.loading} showLabel /></div>;
  if (!session) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return <Outlet />;
}
