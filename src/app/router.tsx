import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '@/features/auth/LoginPage';
import RequireAuth from '@/features/auth/RequireAuth';
import Layout from '@/shared/ui/Layout';
import DashboardPage from '@/pages/DashboardPage';
import PlaceholderPage from '@/pages/PlaceholderPage';
import NotFoundPage from '@/pages/NotFoundPage';
import MembersPage from '@/pages/MembersPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/assignments', element: <Navigate to="/assignments/rs" replace /> },
          { path: '/assignments/rs', element: <PlaceholderPage title="RS 편성" /> },
          { path: '/assignments/eq', element: <PlaceholderPage title="EQ 편성" /> },
          { path: '/members', element: <MembersPage /> },
          { path: '/households', element: <PlaceholderPage title="가정 관리" /> },
          { path: '/settings', element: <PlaceholderPage title="설정" /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
