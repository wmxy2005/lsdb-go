import { ProtectedRoute } from '@/components/ProtectedRoute';
import { MasterLayout } from '@/layouts/MasterLayout';
import ItemsPage from '@/pages/ItemsPage';
import { lazy } from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';

// Code-split the heavier / less-frequent routes so the landing page (/items)
// doesn't pull in xgplayer, photoswipe or chart.js on first load.
const ItemDetailPage = lazy(() => import('@/pages/ItemDetailPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RolePage = lazy(() => import('@/pages/RolePage'));
const SpeedTestPage = lazy(() => import('@/pages/SpeedTestPage'));
const ToolPage = lazy(() => import('@/pages/ToolPage'));

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
