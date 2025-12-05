import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import AuthLayout from '@/layouts/AuthLayout';
import { PermissionProvider } from '@/contexts/PermissionContext';

import SystemAdminLayout from '@/layouts/SystemAdminLayout';
import TenantAdminLayout from '@/layouts/TenantAdminLayout';
import UserAppLayout from '@/layouts/UserAppLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import ScopeRedirect from '@/components/routing/ScopeRedirect';
import ProtectedRoute from '@/components/routing/ProtectedRoute';
import LegacyRedirect from '@/components/routing/LegacyRedirect';

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6]">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto" />
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
      </div>
    </div>
  );
}

function DarkLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const DashboardHomePage = lazy(() => import('@/pages/dashboard/DashboardHomePage'));

const SystemDashboard = lazy(() => import('@/pages/system/SystemDashboard'));
const SystemTenantsPage = lazy(() => import('@/pages/system/SystemTenantsPage'));
const SystemUsersPage = lazy(() => import('@/pages/system/SystemUsersPage'));
const SystemRolesPage = lazy(() => import('@/pages/system/SystemRolesPage'));
const SystemDPFPage = lazy(() => import('@/pages/system/SystemDPFPage'));
const SystemMetricsPage = lazy(() => import('@/pages/system/SystemMetricsPage'));
const SystemSettingsPage = lazy(() => import('@/pages/system/SystemSettingsPage'));

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminBusinessLinesPage = lazy(() => import('@/pages/admin/AdminBusinessLinesPage'));
const AdminBranchesPage = lazy(() => import('@/pages/admin/AdminBranchesPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminRolesPage = lazy(() => import('@/pages/admin/AdminRolesPage'));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage'));

const AppDashboard = lazy(() => import('@/pages/app/AppDashboard'));
const AppAppointmentsPage = lazy(() => import('@/pages/app/AppAppointmentsPage'));
const AppPatientsPage = lazy(() => import('@/pages/app/AppPatientsPage'));
const AppTasksPage = lazy(() => import('@/pages/app/AppTasksPage'));
const AppReportsPage = lazy(() => import('@/pages/app/AppReportsPage'));

const CreateTenantPage = lazy(() => import('@/pages/tenants/CreateTenantPage'));
const TenantDetailPage = lazy(() => import('@/pages/tenants/TenantDetailPage'));
const EditTenantPage = lazy(() => import('@/pages/tenants/EditTenantPage'));

const CreateBusinessLinePage = lazy(() => import('@/pages/business-lines/CreateBusinessLinePage'));

const CreateBranchPage = lazy(() => import('@/pages/branches/CreateBranchPage'));

const CreateUserPage = lazy(() => import('@/pages/users/CreateUserPage'));
const SystemCreateUserPage = lazy(() => import('@/pages/system/SystemCreateUserPage'));
const RolePermissionsPage = lazy(() => import('@/pages/admin/RolePermissionsPage'));
const UserRoleAssignmentPage = lazy(() => import('@/pages/admin/UserRoleAssignmentPage'));

const NotFoundPage = lazy(() => import('@/pages/not-found/NotFoundPage'));

const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <LoginPage />
          </Suspense>
        ),
      },
    ],
  },

  {
    path: '/',
    element: <ScopeRedirect />,
  },

  {
    path: '/system',
    element: (
      <ProtectedRoute allowedScopes={['system']} />
    ),
    children: [
      {
        element: (
          <PermissionProvider>
            <SystemAdminLayout />
          </PermissionProvider>
        ),
        children: [
          {
            index: true,
            element: <Navigate to="/system/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: (
              <Suspense fallback={<DarkLoadingFallback />}>
                <SystemDashboard />
              </Suspense>
            ),
          },
          {
            path: 'tenants',
            element: (
              <Suspense fallback={<DarkLoadingFallback />}>
                <SystemTenantsPage />
              </Suspense>
            ),
          },
          {
            path: 'tenants/create',
            element: (
              <Suspense fallback={<DarkLoadingFallback />}>
                <CreateTenantPage />
              </Suspense>
            ),
          },
          {
            path: 'tenants/:tenantId',
            element: (
              <Suspense fallback={<DarkLoadingFallback />}>
                <TenantDetailPage />
              </Suspense>
            ),
          },
          {
            path: 'tenants/:tenantId/edit',
            element: (
              <Suspense fallback={<DarkLoadingFallback />}>
                <EditTenantPage />
              </Suspense>
            ),
          },
          {
            path: 'users',
            element: (
              <Suspense fallback={<DarkLoadingFallback />}>
                <SystemUsersPage />
              </Suspense>
            ),
          },
          {
            path: 'users/create',
            element: (
              <Suspense fallback={<DarkLoadingFallback />}>
                <SystemCreateUserPage />
              </Suspense>
            ),
          },
          {
            path: 'users/:userId/roles',
            element: (
              <Suspense fallback={<DarkLoadingFallback />}>
                <UserRoleAssignmentPage />
              </Suspense>
            ),
          },
          {
            path: 'roles',
            element: (
              <Suspense fallback={<DarkLoadingFallback />}>
                <SystemRolesPage />
              </Suspense>
            ),
          },
          {
            path: 'roles/:roleId/permissions',
            element: (
              <Suspense fallback={<DarkLoadingFallback />}>
                <RolePermissionsPage />
              </Suspense>
            ),
          },
          {
            path: 'dpf',
            element: (
              <Suspense fallback={<DarkLoadingFallback />}>
                <SystemDPFPage />
              </Suspense>
            ),
          },
          {
            path: 'metrics',
            element: (
              <Suspense fallback={<DarkLoadingFallback />}>
                <SystemMetricsPage />
              </Suspense>
            ),
          },
          {
            path: 'settings',
            element: (
              <Suspense fallback={<DarkLoadingFallback />}>
                <SystemSettingsPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },

  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedScopes={['tenant', 'system']} />
    ),
    children: [
      {
        element: (
          <PermissionProvider>
            <TenantAdminLayout />
          </PermissionProvider>
        ),
        children: [
          {
            index: true,
            element: <Navigate to="/admin/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <AdminDashboard />
              </Suspense>
            ),
          },
          {
            path: 'business-lines',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <AdminBusinessLinesPage />
              </Suspense>
            ),
          },
          {
            path: 'business-lines/create',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreateBusinessLinePage />
              </Suspense>
            ),
          },
          {
            path: 'branches',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <AdminBranchesPage />
              </Suspense>
            ),
          },
          {
            path: 'branches/create',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreateBranchPage />
              </Suspense>
            ),
          },
          {
            path: 'users',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <AdminUsersPage />
              </Suspense>
            ),
          },
          {
            path: 'users/create',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreateUserPage />
              </Suspense>
            ),
          },
          {
            path: 'users/:userId/roles',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <UserRoleAssignmentPage />
              </Suspense>
            ),
          },
          {
            path: 'roles',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <AdminRolesPage />
              </Suspense>
            ),
          },
          {
            path: 'roles/:roleId/permissions',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <RolePermissionsPage />
              </Suspense>
            ),
          },
          {
            path: 'settings',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <AdminSettingsPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },

  {
    path: '/app',
    element: (
      <ProtectedRoute allowedScopes={['business_line', 'branch', 'mixed', 'tenant', 'system']} />
    ),
    children: [
      {
        element: (
          <PermissionProvider>
            <UserAppLayout />
          </PermissionProvider>
        ),
        children: [
          {
            index: true,
            element: <Navigate to="/app/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <AppDashboard />
              </Suspense>
            ),
          },
          {
            path: 'appointments',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <AppAppointmentsPage />
              </Suspense>
            ),
          },
          {
            path: 'patients',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <AppPatientsPage />
              </Suspense>
            ),
          },
          {
            path: 'tasks',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <AppTasksPage />
              </Suspense>
            ),
          },
          {
            path: 'reports',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <AppReportsPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },

  {
    path: '/dashboard',
    element: (
      <ProtectedRoute />
    ),
    children: [
      {
        element: (
          <PermissionProvider>
            <DashboardLayout />
          </PermissionProvider>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <DashboardHomePage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },

  {
    path: '/tenants',
    element: <LegacyRedirect baseFrom="/tenants" resource="tenants" />,
  },
  {
    path: '/tenants/*',
    element: <LegacyRedirect baseFrom="/tenants" resource="tenants" />,
  },
  {
    path: '/business-lines',
    element: <LegacyRedirect baseFrom="/business-lines" resource="business-lines" />,
  },
  {
    path: '/business-lines/*',
    element: <LegacyRedirect baseFrom="/business-lines" resource="business-lines" />,
  },
  {
    path: '/branches',
    element: <LegacyRedirect baseFrom="/branches" resource="branches" />,
  },
  {
    path: '/branches/*',
    element: <LegacyRedirect baseFrom="/branches" resource="branches" />,
  },
  {
    path: '/users',
    element: <LegacyRedirect baseFrom="/users" resource="users" />,
  },
  {
    path: '/users/*',
    element: <LegacyRedirect baseFrom="/users" resource="users" />,
  },
  {
    path: '/roles',
    element: <LegacyRedirect baseFrom="/roles" resource="roles" />,
  },
  {
    path: '/roles/*',
    element: <LegacyRedirect baseFrom="/roles" resource="roles" />,
  },

  {
    path: '*',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
