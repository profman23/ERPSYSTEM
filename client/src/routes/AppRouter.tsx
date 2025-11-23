import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import AuthLayout from '@/layouts/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import ProtectedRoute from '@/routes/ProtectedRoute';

/**
 * Loading Fallback Component
 * Shown while lazy-loaded components are loading
 */
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

/**
 * Lazy-loaded Pages
 * Code-splitting for better performance
 */

// Auth Pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));

// Dashboard Pages
const DashboardHomePage = lazy(() => import('@/pages/dashboard/DashboardHomePage'));

// Tenant Pages
const TenantsListPage = lazy(() => import('@/pages/tenants/TenantsListPage'));
const CreateTenantPage = lazy(() => import('@/pages/tenants/CreateTenantPage'));

// Business Line Pages
const BusinessLinesListPage = lazy(() => import('@/pages/business-lines/BusinessLinesListPage'));

// Branch Pages
const BranchesListPage = lazy(() => import('@/pages/branches/BranchesListPage'));

// User Pages
const UsersListPage = lazy(() => import('@/pages/users/UsersListPage'));

// Role Pages (DPF-AGI)
const RolesPage = lazy(() => import('@/pages/roles/RolesPage'));

// Error Pages
const NotFoundPage = lazy(() => import('@/pages/not-found/NotFoundPage'));

/**
 * Router Configuration
 * 
 * Route Structure:
 * - Auth routes (AuthLayout): /login
 * - Protected routes (DashboardLayout): /dashboard, /tenants, /branches, /business-lines, /users
 * - Error routes: 404
 * 
 * Features:
 * - Lazy loading with Suspense
 * - Protected route wrapper (UI only)
 * - Separate layouts for auth and dashboard
 * - RTL support throughout
 */
const router = createBrowserRouter([
  // ==========================================
  // AUTH ROUTES (Public - AuthLayout)
  // ==========================================
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

  // ==========================================
  // PROTECTED ROUTES (DashboardLayout)
  // ==========================================
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      // Root redirect to dashboard
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      
      // ==========================================
      // DASHBOARD
      // ==========================================
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <DashboardHomePage />
          </Suspense>
        ),
      },
      
      // ==========================================
      // TENANTS MODULE
      // ==========================================
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

      // ==========================================
      // BUSINESS LINES MODULE
      // ==========================================
      {
        path: 'business-lines',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <BusinessLinesListPage />
          </Suspense>
        ),
      },

      // ==========================================
      // BRANCHES MODULE
      // ==========================================
      {
        path: 'branches',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <BranchesListPage />
          </Suspense>
        ),
      },

      // ==========================================
      // USERS MODULE
      // ==========================================
      {
        path: 'users',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <UsersListPage />
          </Suspense>
        ),
      },

      // ==========================================
      // ROLES & PERMISSIONS MODULE (DPF-AGI)
      // ==========================================
      {
        path: 'roles',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <RolesPage />
          </Suspense>
        ),
      },
    ],
  },

  // ==========================================
  // ERROR ROUTES
  // ==========================================
  {
    path: '*',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
]);

/**
 * AppRouter Component
 * Main router provider for the application
 */
export default function AppRouter() {
  return <RouterProvider router={router} />;
}
