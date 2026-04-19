import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthContext';
import QueryProvider from '@/app/providers/QueryProvider';
import { router } from '@/app/router';

export default function App() {
  return (
    <AuthProvider>
      <QueryProvider>
        <RouterProvider router={router} />
      </QueryProvider>
    </AuthProvider>
  );
}
