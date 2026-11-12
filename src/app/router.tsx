import { createBrowserRouter, Navigate } from 'react-router-dom';
import HomeRedirect from '@/app/HomeRedirect';
import LoginPage from '@/features/auth/LoginPage';
import RequireAuth from '@/features/auth/RequireAuth';
import Layout from '@/shared/ui/Layout';
import DashboardPage from '@/pages/DashboardPage';
import NotFoundPage from '@/pages/NotFoundPage';
import RosterPage from '@/pages/RosterPage';
import AssignmentPage from '@/pages/AssignmentPage';
import SettingsPage from '@/pages/SettingsPage';
import SharePage from '@/pages/SharePage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  // Public, token-gated: outside RequireAuth and Layout (no app chrome).
  { path: '/s/:token', element: <SharePage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <HomeRedirect /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/assignments', element: <Navigate to="/assignments/rs" replace /> },
          { path: '/assignments/:org', element: <AssignmentPage /> },
          { path: '/roster', element: <RosterPage /> },
          { path: '/members', element: <Navigate to="/roster" replace /> },
          { path: '/households', element: <Navigate to="/roster" replace /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
