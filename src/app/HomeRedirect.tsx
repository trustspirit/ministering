import { Navigate } from 'react-router-dom';
import { Spinner } from 'trust-ui-react';
import { useAuth } from '@/features/auth/useAuth';
import { defaultAssignmentPath } from '@/app/defaultPath';
import { T } from '@/shared/copy';

export default function HomeRedirect() {
  const { profile, profileLoaded } = useAuth();
  if (!profileLoaded) return <div className="app-loading"><Spinner size="sm" label={T.loading} showLabel /></div>;
  return <Navigate to={defaultAssignmentPath(profile?.role)} replace />;
}
