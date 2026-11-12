import { RouterProvider } from 'react-router-dom';
import { LocaleProvider, ThemeProvider, ToastProvider } from 'trust-ui-react';
import { AuthProvider } from '@/features/auth/AuthContext';
import QueryProvider from '@/app/providers/QueryProvider';
import { router } from '@/app/router';

export default function App() {
  return (
    <ThemeProvider defaultTheme="light">
      {/* Korean strings for what the library renders itself (dialog close, calendar, file upload ...). */}
      <LocaleProvider locale="ko">
        <ToastProvider position="bottom-center" max={3}>
          <AuthProvider>
            <QueryProvider>
              <RouterProvider router={router} />
            </QueryProvider>
          </AuthProvider>
        </ToastProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
