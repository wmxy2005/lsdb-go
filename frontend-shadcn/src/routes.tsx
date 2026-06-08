import { ProtectedRoute } from '@/components/ProtectedRoute';
import { MasterLayout } from '@/layouts/MasterLayout';
import ItemDetailPage from '@/pages/ItemDetailPage';
import ItemsPage from '@/pages/ItemsPage';
import LoginPage from '@/pages/LoginPage';
import RolePage from '@/pages/RolePage';
import SpeedTestPage from '@/pages/SpeedTestPage';
import ToolPage from '@/pages/ToolPage';
import { Navigate, createBrowserRouter, Outlet } from 'react-router-dom';

export const router = createBrowserRouter([
  {
    path: '/',
    children: [
      { index: true, element: <Navigate to="/items" replace /> },
      { path: 'login', element: <LoginPage /> },
      {
        element: (
          <ProtectedRoute>
            <MasterLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: 'items', element: <ItemsPage /> },
          { path: 'items/role', element: <RolePage /> },
          { path: 'items/:itemId', element: <ItemDetailPage /> },
          { path: 'tool', element: <ToolPage /> },
          { path: 'speedTest', element: <SpeedTestPage /> },
        ],
      },
    ],
  },
]);

