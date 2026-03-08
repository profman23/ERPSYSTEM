/**
 * UnifiedDashboard — Conditional dashboard for /app panel
 *
 * Shows AdminDashboard for tenant/system scope users (management view)
 * Shows AppDashboard for branch/business_line/mixed scope users (clinical view)
 */

import { useAuth } from '@/contexts/AuthContext';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AppDashboard from '@/pages/app/AppDashboard';

export default function UnifiedDashboard() {
  const { user } = useAuth();
  const scope = user?.accessScope || 'branch';

  if (scope === 'tenant' || scope === 'system') {
    return <AdminDashboard />;
  }

  return <AppDashboard />;
}
