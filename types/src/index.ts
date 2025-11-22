export interface Tenant {
  id: string;
  code: string;
  name: string;
  defaultLanguage: 'en' | 'ar';
  country?: string;
  timezone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessLine {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Branch {
  id: string;
  tenantId: string;
  businessLineId: string;
  name: string;
  code: string;
  city: string;
  address?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface BranchCapacity {
  id: string;
  tenantId: string;
  businessLineId: string;
  branchId: string;
  allowedUsers: number;
}

export interface User {
  id: string;
  name: string;
  accessScope: 'system' | 'tenant' | 'business_line' | 'branch';
  tenantId?: string;
  businessLineId?: string;
  branchId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  name: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantBranding {
  primaryColor?: string;
  secondaryColor?: string;
  logo?: string;
  fontFamily?: string;
}

export interface APIResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
