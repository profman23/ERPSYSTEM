export interface Tenant {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessLine {
  id: string;
  name: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Branch {
  id: string;
  name: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string;
  tenantId: string;
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
