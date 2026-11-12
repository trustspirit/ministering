import { Link } from 'react-router-dom';
import { defaultAssignmentPath } from '@/app/defaultPath';
import { useAuth } from '@/features/auth/useAuth';
import { T } from '@/shared/copy';
import './NotFoundPage.css';

/** Rendered inside the app layout (the header stays) for any address the router does not know. */
export default function NotFoundPage() {
  const { profile } = useAuth();
  return (
    <div className="nf">
      <h1>{T.notFound.title}</h1>
      <p>{T.notFound.description}</p>
      <Link to={defaultAssignmentPath(profile?.role)}>{T.notFound.back}</Link>
    </div>
  );
}
