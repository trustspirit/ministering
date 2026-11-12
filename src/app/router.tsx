import { createBrowserRouter, Navigate } from 'react-router-dom';
import HomeRedirect from '@/app/HomeRedirect';
import LoginPage from '@/features/auth/LoginPage';
import RequireAuth from '@/features/auth/RequireAuth';
import Layout from '@/shared/ui/Layout';
import NotFoundPage from '@/pages/NotFoundPage';
import RosterPage from '@/pages/RosterPage';
import AssignmentPage from '@/pages/AssignmentPage';
import SettingsPage from '@/pages/SettingsPage';
import SharePage from '@/pages/SharePage';
import SetPasswordPage from '@/pages/SetPasswordPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  // Public, token-gated: outside RequireAuth and Layout (no app chrome).
  { path: '/s/:token', element: <SharePage /> },
  // Public, one-time password link from the bishopric (also signed-out, no app chrome).
  { path: '/set-password', element: <SetPasswordPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <HomeRedirect /> },
          { path: '/assignments', element: <Navigate to="/assignments/rs" replace /> },
          { path: '/assignments/:org', element: <AssignmentPage /> },
          { path: '/roster', element: <RosterPage /> },
          // Old bookmarks of the retired members / households pages land on the roster.
          { path: '/members', element: <Navigate to="/roster" replace /> },
          { path: '/households', element: <Navigate to="/roster" replace /> },
          { path: '/settings', element: <SettingsPage /> },
          // Unknown addresses keep the app header (signed-out visitors are sent to the login page first).
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
