import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/Login';
import { SetPasswordPage } from '../pages/SetPassword';
import { Layout } from '../components/layout/Layout';
import { ProtectedRoute } from './ProtectedRoute';
import { Dashboard } from '../pages/admin/Dashboard';
import { CalendarPage } from '../pages/admin/CalendarPage';
import { Properties } from '../pages/admin/Properties';
import { Tenants } from '../pages/admin/Tenants';
import { Payments } from '../pages/admin/Payments';
import { Maintenance } from '../pages/admin/Maintenance';
import { Reports } from '../pages/admin/Reports';
import { Escrow } from '../pages/admin/Escrow';
import { CRM } from '../pages/admin/CRM';
import { Documents } from '../pages/admin/Documents';
import { Appliances } from '../pages/admin/Appliances';
import { TenantHome } from '../pages/tenant/TenantHome';
import { TenantPayment } from '../pages/tenant/TenantPayment';
import { TenantHistory } from '../pages/tenant/TenantHistory';
import { TenantMaintenance } from '../pages/tenant/TenantMaintenance';
import { TenantDocuments } from '../pages/tenant/TenantDocuments';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    // Handles both tenant invite links and admin password-reset links
    path: '/set-password',
    element: <SetPasswordPage />,
  },
  {
    // Legacy alias used by resetPassword() in authStore
    path: '/reset-password',
    element: <SetPasswordPage />,
  },
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute role="admin">
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'properties', element: <Properties /> },
      { path: 'tenants', element: <Tenants /> },
      { path: 'payments', element: <Payments /> },
      { path: 'maintenance', element: <Maintenance /> },
      { path: 'reports', element: <Reports /> },
      { path: 'escrow', element: <Escrow /> },
      { path: 'crm', element: <CRM /> },
      { path: 'documents', element: <Documents /> },
      { path: 'appliances', element: <Appliances /> },
    ],
  },
  {
    path: '/tenant',
    element: (
      <ProtectedRoute role="tenant">
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <TenantHome /> },
      { path: 'payment', element: <TenantPayment /> },
      { path: 'history', element: <TenantHistory /> },
      { path: 'maintenance', element: <TenantMaintenance /> },
      { path: 'documents', element: <TenantDocuments /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);
