import { router } from '@/routes';
import { AuthProvider } from '@/hooks/use-auth';
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v6';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <NuqsAdapter>
            <RouterProvider router={router} />
            <Toaster richColors position="top-center" />
          </NuqsAdapter>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
