import { SQL, and, eq } from 'drizzle-orm';

export interface AuthenticatedUser {
  id: string;
  role: string;
  accessScope: 'system' | 'tenant' | 'business_line' | 'branch';
  tenantId: string | null;
  businessLineId: string | null;
  branchId: string | null;
}

export function applyTenantScopeFilter(
  user: AuthenticatedUser,
  tenantIdColumn: any
): SQL | undefined {
  if (user.accessScope === 'system') {
    return undefined;
  }
  
  if (user.tenantId) {
    return eq(tenantIdColumn, user.tenantId);
  }
  
  return undefined;
}

export function applyBusinessLineScopeFilter(
  user: AuthenticatedUser,
  tenantIdColumn: any,
  businessLineIdColumn: any
): SQL | undefined {
  if (user.accessScope === 'system') {
    return undefined;
  }
  
  const filters: SQL[] = [];
  
  if (user.tenantId) {
    filters.push(eq(tenantIdColumn, user.tenantId));
  }
  
  if (user.accessScope === 'business_line' && user.businessLineId) {
    filters.push(eq(businessLineIdColumn, user.businessLineId));
  }
  
  return filters.length > 0 ? and(...filters) : undefined;
}

export function applyBranchScopeFilter(
  user: AuthenticatedUser,
  tenantIdColumn: any,
  businessLineIdColumn: any,
  branchIdColumn: any
): SQL | undefined {
  if (user.accessScope === 'system') {
    return undefined;
  }
  
  const filters: SQL[] = [];
  
  if (user.tenantId) {
    filters.push(eq(tenantIdColumn, user.tenantId));
  }
  
  if (user.accessScope === 'business_line' && user.businessLineId) {
    filters.push(eq(businessLineIdColumn, user.businessLineId));
  }
  
  if (user.accessScope === 'branch' && user.branchId) {
    filters.push(eq(branchIdColumn, user.branchId));
  }
  
  return filters.length > 0 ? and(...filters) : undefined;
}
