import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { defaultAssignmentPath } from '@/app/defaultPath';

export default function HomeRedirect() {
  const { profile, profileLoaded } = useAuth();
  if (!profileLoaded) return <div className="p-8">로딩 중...</div>;
  return <Navigate to={defaultAssignmentPath(profile?.role)} replace />;
}
