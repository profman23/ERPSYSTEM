import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import AuthLayout from '@/layouts/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import ProtectedRoute from '@/routes/ProtectedRoute';
import { PermissionProvider } from '@/contexts/PermissionContext';

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

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const DashboardHomePage = lazy(() => import('@/pages/dashboard/DashboardHomePage'));

const TenantsListPage = lazy(() => import('@/pages/tenants/TenantsListPage'));
const CreateTenantPage = lazy(() => import('@/pages/tenants/CreateTenantPage'));
const TenantDetailPage = lazy(() => import('@/pages/tenants/TenantDetailPage'));
const EditTenantPage = lazy(() => import('@/pages/tenants/EditTenantPage'));

const BusinessLinesListPage = lazy(() => import('@/pages/business-lines/BusinessLinesListPage'));
const CreateBusinessLinePage = lazy(() => import('@/pages/business-lines/CreateBusinessLinePage'));

const BranchesListPage = lazy(() => import('@/pages/branches/BranchesListPage'));
const CreateBranchPage = lazy(() => import('@/pages/branches/CreateBranchPage'));

const UsersListPage = lazy(() => import('@/pages/users/UsersListPage'));
const CreateUserPage = lazy(() => import('@/pages/users/CreateUserPage'));

const RolesPage = lazy(() => import('@/pages/roles/RolesPage'));
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
    element: (
      <ProtectedRoute>
        <PermissionProvider>
          <DashboardLayout />
        </PermissionProvider>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <DashboardHomePage />
          </Suspense>
        ),
      },
      
      {
        path: 'tenants',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <TenantsListPage />
          </Suspense>
        ),
      },
      {
        path: 'tenants/create',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <CreateTenantPage />
          </Suspense>
        ),
      },
      {
        path: 'tenants/:tenantId',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <TenantDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'tenants/:tenantId/edit',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <EditTenantPage />
          </Suspense>
        ),
      },

      {
        path: 'business-lines',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <BusinessLinesListPage />
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
            <BranchesListPage />
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
            <UsersListPage />
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
            <RolesPage />
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
    ],
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
