/**
 * AppRouter — 2-Panel Architecture: /system + /app
 *
 * CRITICAL SECURITY PATTERN:
 * ========================
 *
 * 1. ProtectedRoute is the ABSOLUTE GATEKEEPER for all panel routes
 * 2. EVERY route under /system/*, /app/* MUST pass through ProtectedRoute FIRST
 * 3. 404 pages are placed INSIDE each panel's children (after ProtectedRoute)
 * 4. This ensures scope validation happens BEFORE 404, never after
 *
 * Route Hierarchy:
 * ===============
 * /system/* → ProtectedRoute (allowedScopes=['system']) → SystemAdminLayout → [routes]
 * /app/*    → ProtectedRoute (allowedScopes=['tenant','business_line','branch','mixed','system']) → UnifiedTenantLayout → [routes]
 *
 * /app sub-structure:
 * /app/dashboard                          → UnifiedDashboard (conditional: AdminDashboard or AppDashboard)
 * /app/administration/business-lines/*    → Business Lines CRUD
 * /app/administration/branches/*          → Branches CRUD
 * /app/administration/users/*             → Users CRUD + Role Assignment
 * /app/administration/roles/*             → Roles + Permission Matrix
 * /app/administration/settings            → Tenant Settings
 * /app/appointments                       → Appointments
 * /app/patients                           → Patients
 * /app/tasks                              → Tasks
 * /app/reports                            → Reports
 *
 * Legacy Redirects:
 * /admin/* → /app/* (backward compatibility)
 */

import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import AuthLayout from '@/layouts/AuthLayout';
import { PermissionProvider } from '@/contexts/PermissionContext';
import { ErrorBoundary, SystemErrorFallback, AdminErrorFallback } from '@/components/ErrorBoundary';

import SystemAdminLayout from '@/layouts/SystemAdminLayout';
import UnifiedTenantLayout from '@/layouts/UnifiedTenantLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import ScopeRedirect from '@/components/routing/ScopeRedirect';
import ProtectedRoute from '@/components/routing/ProtectedRoute';
import LegacyRedirect from '@/components/routing/LegacyRedirect';

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="text-center space-y-4">
        <div
          className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto"
          style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
        />
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
      </div>
    </div>
  );
}

// Auth
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const BranchSelectorPage = lazy(() => import('@/pages/auth/BranchSelectorPage'));
const DashboardHomePage = lazy(() => import('@/pages/dashboard/DashboardHomePage'));

// System Panel
const SystemDashboard = lazy(() => import('@/pages/system/SystemDashboard'));
const SystemTenantsPage = lazy(() => import('@/pages/system/SystemTenantsPage'));
const SystemUsersPage = lazy(() => import('@/pages/system/SystemUsersPage'));
const SystemRolesPage = lazy(() => import('@/pages/system/SystemRolesPage'));
const SystemDPFPage = lazy(() => import('@/pages/system/SystemDPFPage'));
const SystemMetricsPage = lazy(() => import('@/pages/system/SystemMetricsPage'));
const SystemSettingsPage = lazy(() => import('@/pages/system/SystemSettingsPage'));
const SystemCreateRolePage = lazy(() => import('@/pages/system/SystemCreateRolePage'));
const SystemEditRolePage = lazy(() => import('@/pages/system/SystemEditRolePage'));
const SystemAiConfigPage = lazy(() => import('@/pages/system/SystemAiConfigPage'));
const SystemAiMonitoringPage = lazy(() => import('@/pages/system/SystemAiMonitoringPage'));
const SystemAiLogsPage = lazy(() => import('@/pages/system/SystemAiLogsPage'));

// Unified App Panel — Dashboard
const UnifiedDashboard = lazy(() => import('@/pages/app/UnifiedDashboard'));

// Unified App Panel — Administration
const AdminBusinessLinesPage = lazy(() => import('@/pages/admin/AdminBusinessLinesPage'));
const AdminBranchesPage = lazy(() => import('@/pages/admin/AdminBranchesPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminRolesPage = lazy(() => import('@/pages/admin/AdminRolesPage'));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage'));
const MyProfilePage = lazy(() => import('@/pages/profile/MyProfilePage'));

// Unified App Panel — Financial
const ChartOfAccountsPage = lazy(() => import('@/pages/finance/ChartOfAccountsPage'));
const JournalEntriesListPage = lazy(() => import('@/pages/finance/JournalEntriesListPage'));
const CreateJournalEntryPage = lazy(() => import('@/pages/finance/CreateJournalEntryPage'));
const JournalEntryDetailPage = lazy(() => import('@/pages/finance/JournalEntryDetailPage'));
const TrialBalancePage = lazy(() => import('@/pages/finance/TrialBalancePage'));
const AccountLedgerPage = lazy(() => import('@/pages/finance/AccountLedgerPage'));

// Unified App Panel — Administration > Setup
const TaxCodesListPage = lazy(() => import('@/pages/administration/setup/TaxCodesListPage'));
const CreateTaxCodePage = lazy(() => import('@/pages/administration/setup/CreateTaxCodePage'));
const WarehousesListPage = lazy(() => import('@/pages/administration/setup/WarehousesListPage'));
const CreateWarehousePage = lazy(() => import('@/pages/administration/setup/CreateWarehousePage'));
const ItemGroupsListPage = lazy(() => import('@/pages/administration/setup/ItemGroupsListPage'));
const CreateItemGroupPage = lazy(() => import('@/pages/administration/setup/CreateItemGroupPage'));
const UnitsOfMeasureListPage = lazy(() => import('@/pages/administration/setup/UnitsOfMeasureListPage'));
const CreateUnitOfMeasurePage = lazy(() => import('@/pages/administration/setup/CreateUnitOfMeasurePage'));
const PostingPeriodsListPage = lazy(() => import('@/pages/administration/setup/PostingPeriodsListPage'));
const CreatePostingPeriodPage = lazy(() => import('@/pages/administration/setup/CreatePostingPeriodPage'));
const PostingPeriodSubPeriodsPage = lazy(() => import('@/pages/administration/setup/PostingPeriodSubPeriodsPage'));
const DocumentNumberSeriesListPage = lazy(() => import('@/pages/administration/setup/DocumentNumberSeriesListPage'));
const EditDocumentNumberSeriesPage = lazy(() => import('@/pages/administration/setup/EditDocumentNumberSeriesPage'));

// Unified App Panel — Inventory
const ItemsListPage = lazy(() => import('@/pages/inventory/ItemsListPage'));
const CreateItemPage = lazy(() => import('@/pages/inventory/CreateItemPage'));

// Unified App Panel — Clinical & Operations
const AppAppointmentsPage = lazy(() => import('@/pages/app/AppAppointmentsPage'));
const AppTasksPage = lazy(() => import('@/pages/app/AppTasksPage'));
const AppReportsPage = lazy(() => import('@/pages/app/AppReportsPage'));

// Clinical — Patients
const PatientsListPage = lazy(() => import('@/pages/patients/PatientsListPage'));
const CreatePatientPage = lazy(() => import('@/pages/patients/CreatePatientPage'));
const PatientDetailPage = lazy(() => import('@/pages/patients/PatientDetailPage'));

// System — Tenant Management
const SystemCreateTenantPage = lazy(() => import('@/pages/system/SystemCreateTenantPage'));
// TenantDetailPage removed — all tenant views now use SystemCreateTenantPage (edit form)
// EditTenantPage removed — SystemCreateTenantPage handles both create and edit via tenantId param

// Shared — Business Lines, Branches, Users, Roles
const CreateBusinessLinePage = lazy(() => import('@/pages/business-lines/CreateBusinessLinePage'));
const EditBusinessLinePage = lazy(() => import('@/pages/business-lines/EditBusinessLinePage'));
const CreateBranchPage = lazy(() => import('@/pages/branches/CreateBranchPage'));
const CreateUserPage = lazy(() => import('@/pages/users/CreateUserPage'));
const SystemCreateUserPage = lazy(() => import('@/pages/system/SystemCreateUserPage'));
const CreateRolePage = lazy(() => import('@/pages/roles/CreateRolePage'));
const EditRolePage = lazy(() => import('@/pages/roles/EditRolePage'));
const RolePermissionsPage = lazy(() => import('@/pages/admin/RolePermissionsPage'));
const UserRoleAssignmentPage = lazy(() => import('@/pages/admin/UserRoleAssignmentPage'));

const NotFoundPage = lazy(() => import('@/pages/not-found/NotFoundPage'));

/**
 * Legacy Admin Redirect — Converts /admin/* paths to /app/* equivalents
 */
function AdminLegacyRedirect() {
  const pathname = window.location.pathname;
  const search = window.location.search;
  const hash = window.location.hash;

  let newPath = '/app/dashboard';

  if (pathname.startsWith('/admin/business-lines')) {
    newPath = pathname.replace('/admin/business-lines', '/app/administration/business-lines');
  } else if (pathname.startsWith('/admin/branches')) {
    newPath = pathname.replace('/admin/branches', '/app/administration/branches');
  } else if (pathname.startsWith('/admin/users')) {
    newPath = pathname.replace('/admin/users', '/app/administration/users');
  } else if (pathname.startsWith('/admin/roles')) {
    newPath = pathname.replace('/admin/roles', '/app/administration/roles');
  } else if (pathname.startsWith('/admin/settings')) {
    newPath = '/app/administration/settings';
  } else if (pathname.startsWith('/admin/dashboard')) {
    newPath = '/app/dashboard';
  } else if (pathname.startsWith('/admin/ai')) {
    newPath = pathname.replace('/admin/ai', '/app/ai');
  }

  return <Navigate to={`${newPath}${search}${hash}`} replace />;
}

const router = createBrowserRouter([
  // ═══════════════════════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // BRANCH SELECTOR — /select-branch (protected, any scope)
  // Shown once per session for users with 2+ branches
  // ═══════════════════════════════════════════════════════════════
  {
    path: '/select-branch',
    element: (
      <ProtectedRoute allowedScopes={['tenant', 'business_line', 'branch', 'mixed', 'system']} />
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <BranchSelectorPage />
          </Suspense>
        ),
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // SYSTEM PANEL — /system/* (unchanged)
  // ═══════════════════════════════════════════════════════════════
  {
    path: '/system',
    element: (
      <ProtectedRoute allowedScopes={['system']} />
    ),
    children: [
      {
        element: (
          <ErrorBoundary fallback={<SystemErrorFallback />}>
            <PermissionProvider>
              <SystemAdminLayout />
            </PermissionProvider>
          </ErrorBoundary>
        ),
        children: [
          {
            index: true,
            element: <Navigate to="/system/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <SystemDashboard />
              </Suspense>
            ),
          },
          {
            path: 'tenants',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <SystemTenantsPage />
              </Suspense>
            ),
          },
          {
            path: 'tenants/create',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <SystemCreateTenantPage />
              </Suspense>
            ),
          },
          {
            path: 'tenants/:tenantId/edit',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <SystemCreateTenantPage />
              </Suspense>
            ),
          },
          // ADMINISTRATION Routes — /system/administration/*
          {
            path: 'administration/users',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <SystemUsersPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/users/create',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <SystemCreateUserPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/users/:userId/edit',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <SystemCreateUserPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/users/:userId/roles',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <UserRoleAssignmentPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/roles',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <SystemRolesPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/roles/create',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <SystemCreateRolePage />
              </Suspense>
            ),
          },
          {
            path: 'administration/roles/:roleId/edit',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <SystemEditRolePage />
              </Suspense>
            ),
          },
          {
            path: 'administration/roles/:roleId/permissions',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <RolePermissionsPage />
              </Suspense>
            ),
          },
          {
            path: 'dpf',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <SystemDPFPage />
              </Suspense>
            ),
          },
          {
            path: 'metrics',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <SystemMetricsPage />
              </Suspense>
            ),
          },
          {
            path: 'settings',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <SystemSettingsPage />
              </Suspense>
            ),
          },
          // AI Management Routes
          {
            path: 'ai',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <SystemAiConfigPage />
              </Suspense>
            ),
          },
          {
            path: 'ai/config',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <SystemAiConfigPage />
              </Suspense>
            ),
          },
          {
            path: 'ai/monitoring',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <SystemAiMonitoringPage />
              </Suspense>
            ),
          },
          {
            path: 'ai/logs',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <SystemAiLogsPage />
              </Suspense>
            ),
          },
          {
            path: '*',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <NotFoundPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // UNIFIED APP PANEL — /app/* (replaces both /admin and /app)
  // All authenticated users: tenant, business_line, branch, mixed, system
  // ═══════════════════════════════════════════════════════════════
  {
    path: '/app',
    element: (
      <ProtectedRoute allowedScopes={['tenant', 'business_line', 'branch', 'mixed', 'system']} />
    ),
    children: [
      {
        element: (
          <ErrorBoundary fallback={<AdminErrorFallback />}>
            <PermissionProvider>
              <UnifiedTenantLayout />
            </PermissionProvider>
          </ErrorBoundary>
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
                <UnifiedDashboard />
              </Suspense>
            ),
          },
          // ═══════════════════════════════════════════════════════
          // MY PROFILE — /app/my-profile
          // ═══════════════════════════════════════════════════════
          {
            path: 'my-profile',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <MyProfilePage />
              </Suspense>
            ),
          },
          // ═══════════════════════════════════════════════════════
          // ADMINISTRATION — /app/administration/*
          // Business Lines, Branches, Users, Roles, Settings
          // ═══════════════════════════════════════════════════════
          {
            path: 'administration/business-lines',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <AdminBusinessLinesPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/business-lines/create',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreateBusinessLinePage />
              </Suspense>
            ),
          },
          {
            path: 'administration/business-lines/:businessLineId/edit',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <EditBusinessLinePage />
              </Suspense>
            ),
          },
          {
            path: 'administration/branches',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <AdminBranchesPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/branches/create',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreateBranchPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/branches/:branchId/edit',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreateBranchPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/users',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <AdminUsersPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/users/create',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreateUserPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/users/:userId/edit',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreateUserPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/users/:userId/roles',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <UserRoleAssignmentPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/roles',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <AdminRolesPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/roles/create',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreateRolePage />
              </Suspense>
            ),
          },
          {
            path: 'administration/roles/:roleId/edit',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <EditRolePage />
              </Suspense>
            ),
          },
          {
            path: 'administration/roles/:roleId/permissions',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <RolePermissionsPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/settings',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <AdminSettingsPage />
              </Suspense>
            ),
          },
          // ── Administration > Setup ──
          {
            path: 'administration/setup/posting-periods',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <PostingPeriodsListPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/setup/posting-periods/create',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreatePostingPeriodPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/setup/posting-periods/:id/sub-periods',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <PostingPeriodSubPeriodsPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/setup/tax-codes',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <TaxCodesListPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/setup/tax-codes/create',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreateTaxCodePage />
              </Suspense>
            ),
          },
          {
            path: 'administration/setup/tax-codes/:id/edit',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreateTaxCodePage />
              </Suspense>
            ),
          },
          {
            path: 'administration/setup/warehouses',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <WarehousesListPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/setup/warehouses/create',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreateWarehousePage />
              </Suspense>
            ),
          },
          {
            path: 'administration/setup/warehouses/:id/edit',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreateWarehousePage />
              </Suspense>
            ),
          },
          {
            path: 'administration/setup/item-groups',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ItemGroupsListPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/setup/item-groups/create',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreateItemGroupPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/setup/item-groups/:id/edit',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreateItemGroupPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/setup/units-of-measure',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <UnitsOfMeasureListPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/setup/units-of-measure/create',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreateUnitOfMeasurePage />
              </Suspense>
            ),
          },
          {
            path: 'administration/setup/units-of-measure/:id/edit',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreateUnitOfMeasurePage />
              </Suspense>
            ),
          },
          {
            path: 'administration/setup/document-number-series',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <DocumentNumberSeriesListPage />
              </Suspense>
            ),
          },
          {
            path: 'administration/setup/document-number-series/:id/edit',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <EditDocumentNumberSeriesPage />
              </Suspense>
            ),
          },
          // ═══════════════════════════════════════════════════════
          // INVENTORY — /app/inventory/*
          // ═══════════════════════════════════════════════════════
          {
            path: 'inventory/items',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ItemsListPage />
              </Suspense>
            ),
          },
          {
            path: 'inventory/items/create',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreateItemPage />
              </Suspense>
            ),
          },
          {
            path: 'inventory/items/:id/edit',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreateItemPage />
              </Suspense>
            ),
          },
          // ═══════════════════════════════════════════════════════
          // FINANCIAL — /app/finance/*
          // ═══════════════════════════════════════════════════════
          {
            path: 'finance/chart-of-accounts',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <ChartOfAccountsPage />
              </Suspense>
            ),
          },
          {
            path: 'finance/journal-entries',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <JournalEntriesListPage />
              </Suspense>
            ),
          },
          {
            path: 'finance/journal-entries/create',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreateJournalEntryPage />
              </Suspense>
            ),
          },
          {
            path: 'finance/journal-entries/:id',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <JournalEntryDetailPage />
              </Suspense>
            ),
          },
          {
            path: 'finance/trial-balance',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <TrialBalancePage />
              </Suspense>
            ),
          },
          {
            path: 'finance/account-ledger',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <AccountLedgerPage />
              </Suspense>
            ),
          },
          // ── Legacy redirects (bookmarks / old URLs) ──
          {
            path: 'administration/tax-codes',
            element: <Navigate to="/app/administration/setup/tax-codes" replace />,
          },
          {
            path: 'inventory/warehouses',
            element: <Navigate to="/app/administration/setup/warehouses" replace />,
          },
          // ═══════════════════════════════════════════════════════
          // CLINICAL — /app/patients/*, /app/clients/*
          // ═══════════════════════════════════════════════════════
          {
            path: 'patients',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <PatientsListPage />
              </Suspense>
            ),
          },
          {
            path: 'patients/create',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreatePatientPage />
              </Suspense>
            ),
          },
          {
            path: 'patients/:patientId',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <PatientDetailPage />
              </Suspense>
            ),
          },
          {
            path: 'patients/:patientId/edit',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <CreatePatientPage />
              </Suspense>
            ),
          },
          // ═══════════════════════════════════════════════════════
          // OPERATIONS — /app/*
          // ═══════════════════════════════════════════════════════
          {
            path: 'appointments',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <AppAppointmentsPage />
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
          {
            path: '*',
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <NotFoundPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // DASHBOARD REDIRECT
  // ═══════════════════════════════════════════════════════════════
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute />
    ),
    children: [
      {
        element: (
          <ErrorBoundary>
            <PermissionProvider>
              <DashboardLayout />
            </PermissionProvider>
          </ErrorBoundary>
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

  // ═══════════════════════════════════════════════════════════════
  // LEGACY REDIRECTS — /admin/* → /app/*
  // ═══════════════════════════════════════════════════════════════
  {
    path: '/admin',
    element: <AdminLegacyRedirect />,
  },
  {
    path: '/admin/*',
    element: <AdminLegacyRedirect />,
  },

  // ═══════════════════════════════════════════════════════════════
  // LEGACY REDIRECTS — Bare resource paths
  // ═══════════════════════════════════════════════════════════════
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
    element: <LegacyRedirect baseFrom="/business-lines" resource="administration/business-lines" />,
  },
  {
    path: '/business-lines/*',
    element: <LegacyRedirect baseFrom="/business-lines" resource="administration/business-lines" />,
  },
  {
    path: '/branches',
    element: <LegacyRedirect baseFrom="/branches" resource="administration/branches" />,
  },
  {
    path: '/branches/*',
    element: <LegacyRedirect baseFrom="/branches" resource="administration/branches" />,
  },
  {
    path: '/users',
    element: <LegacyRedirect baseFrom="/users" resource="administration/users" />,
  },
  {
    path: '/users/*',
    element: <LegacyRedirect baseFrom="/users" resource="administration/users" />,
  },
  {
    path: '/roles',
    element: <LegacyRedirect baseFrom="/roles" resource="administration/roles" />,
  },
  {
    path: '/roles/*',
    element: <LegacyRedirect baseFrom="/roles" resource="administration/roles" />,
  },

  // ═══════════════════════════════════════════════════════════════
  // CATCH-ALL 404
  // ═══════════════════════════════════════════════════════════════
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
