import { RouterProvider } from 'react-router-dom';
import { ThemeProvider, ToastProvider } from 'trust-ui-react';
import { AuthProvider } from '@/features/auth/AuthContext';
import QueryProvider from '@/app/providers/QueryProvider';
import { router } from '@/app/router';

export default function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <ToastProvider>
        <AuthProvider>
          <QueryProvider>
            <RouterProvider router={router} />
          </QueryProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
