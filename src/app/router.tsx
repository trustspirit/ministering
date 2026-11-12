import { createBrowserRouter, Navigate } from 'react-router-dom';
import HomeRedirect from '@/app/HomeRedirect';
import LoginPage from '@/features/auth/LoginPage';
import RequireAuth from '@/features/auth/RequireAuth';
import Layout from '@/shared/ui/Layout';
import DashboardPage from '@/pages/DashboardPage';
import NotFoundPage from '@/pages/NotFoundPage';
import MembersPage from '@/pages/MembersPage';
import HouseholdsPage from '@/pages/HouseholdsPage';
import AssignmentWorkspacePage from '@/pages/AssignmentWorkspacePage';
import SettingsPage from '@/pages/SettingsPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <HomeRedirect /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/assignments', element: <Navigate to="/assignments/rs" replace /> },
          { path: '/assignments/:org', element: <AssignmentWorkspacePage /> },
          { path: '/members', element: <MembersPage /> },
          { path: '/households', element: <HouseholdsPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
