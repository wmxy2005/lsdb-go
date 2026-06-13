import { ProtectedRoute } from '@/components/ProtectedRoute';
import { MasterLayout } from '@/layouts/MasterLayout';
import ItemDetailPage from '@/pages/ItemDetailPage';
import ItemsPage from '@/pages/ItemsPage';
import LoginPage from '@/pages/LoginPage';
import RolePage from '@/pages/RolePage';
import SpeedTestPage from '@/pages/SpeedTestPage';
import ToolPage from '@/pages/ToolPage';
import { Navigate, createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter([
  {
    path: '/',
    children: [
      { index: true, element: <Navigate to="/items" replace /> },
      {
        element: <MasterLayout />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'tool', element: <ToolPage /> },
          { path: 'speedTest', element: <SpeedTestPage /> },
          { path: 'items', element: <ProtectedRoute><ItemsPage /></ProtectedRoute> },
          { path: 'items/role/:id', element: <ProtectedRoute><RolePage /></ProtectedRoute> },
          { path: 'items/:itemId', element: <ProtectedRoute><ItemDetailPage /></ProtectedRoute> },
        ],
      },
    ],
  },
]);
