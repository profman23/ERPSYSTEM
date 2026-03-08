/**
 * RolePermissionsPage — Legacy redirect
 * Old permission matrix page now redirects to the unified roles page
 * which includes SAP B1 screen authorization management.
 */

import { Navigate } from 'react-router-dom';

export default function RolePermissionsPage() {
  return <Navigate to="/app/administration/roles" replace />;
}
