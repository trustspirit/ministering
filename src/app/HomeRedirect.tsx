import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { defaultAssignmentPath } from '@/app/defaultPath';

export default function HomeRedirect() {
  const { profile } = useAuth();
  return <Navigate to={defaultAssignmentPath(profile?.role)} replace />;
}
