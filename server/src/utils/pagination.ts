/**
 * Pagination Utilities - Enhanced for 3000+ Tenants
 *
 * Standardized pagination and sorting with security limits
 * Includes field whitelisting and cursor-based pagination
 */

import { SQL, asc, desc } from 'drizzle-orm';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

// Maximum items per page (hard limit for security/performance)
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;
export const MIN_PAGE_SIZE = 1;

// Sortable fields whitelist per entity (prevents SQL injection via sort)
export const SORTABLE_FIELDS: Record<string, readonly string[]> = {
  users: ['createdAt', 'updatedAt', 'name', 'email', 'status', 'lastLoginAt', 'created_at', 'updated_at'],
  tenants: ['createdAt', 'updatedAt', 'name', 'subscriptionPlan', 'status', 'subdomain', 'created_at', 'updated_at'],
  roles: ['createdAt', 'updatedAt', 'name', 'level', 'isSystemRole', 'created_at', 'updated_at'],
  branches: ['createdAt', 'updatedAt', 'name', 'code', 'status', 'created_at', 'updated_at'],
  businessLines: ['createdAt', 'updatedAt', 'name', 'code', 'status', 'created_at', 'updated_at'],
  permissions: ['createdAt', 'permissionCode', 'name', 'moduleId', 'created_at'],
  modules: ['createdAt', 'name', 'moduleCode', 'sortOrder', 'created_at'],
  auditLogs: ['createdAt', 'action', 'userId', 'entityType', 'created_at'],
} as const;

export type SortableEntity = keyof typeof SORTABLE_FIELDS;
export type SortOrder = 'asc' | 'desc';

// ═══════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ParsedPaginationParams {
  page: number;
  limit: number;
  offset: number;
  sortBy: string;
  sortOrder: SortOrder;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  sort?: {
    field: string;
    order: SortOrder;
  };
}

export interface CursorPaginationParams {
  cursor?: string;
  limit: number;
  direction: 'forward' | 'backward';
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
}

// ═══════════════════════════════════════════════════════════════
// OFFSET PAGINATION
// ═══════════════════════════════════════════════════════════════

/**
 * Parse and validate pagination parameters from query string
 * Returns safe, bounded values with security limits enforced
 */
export function getPaginationParams(query: any): Required<PaginationParams> {
  // Parse page with bounds (1-indexed)
  const page = Math.max(1, parseInt(query.page as string) || 1);

  // Parse limit with hard maximum for security
  let limit = parseInt(query.limit as string) || DEFAULT_PAGE_SIZE;
  limit = Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, limit));

  // Sort defaults
  const sortBy = (query.sortBy as string) || 'created_at';
  const sortOrder = (query.sortOrder as 'asc' | 'desc') || 'desc';

  return { page, limit, sortBy, sortOrder };
}

/**
 * Parse pagination with entity-specific sort field validation
 */
export function getPaginationParamsWithValidation(
  query: any,
  entity: SortableEntity
): ParsedPaginationParams {
  const allowedFields = SORTABLE_FIELDS[entity] || [];

  // Parse page with bounds
  const page = Math.max(1, parseInt(query.page as string) || 1);

  // Parse limit with security limits
  let limit = parseInt(query.limit as string) || DEFAULT_PAGE_SIZE;
  limit = Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, limit));

  // Calculate offset
  const offset = (page - 1) * limit;

  // Validate sortBy against whitelist
  const requestedSort = (query.sortBy as string) || 'created_at';
  const sortBy = allowedFields.includes(requestedSort) ? requestedSort : 'created_at';

  // Validate sortOrder
  const requestedOrder = (query.sortOrder as string)?.toLowerCase();
  const sortOrder: SortOrder = requestedOrder === 'asc' ? 'asc' : 'desc';

  return { page, limit, offset, sortBy, sortOrder };
}

/**
 * Calculate offset from page and limit
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Create paginated response with metadata
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  sortBy?: string,
  sortOrder?: SortOrder
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);

  const response: PaginatedResponse<T> = {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };

  if (sortBy) {
    response.sort = {
      field: sortBy,
      order: sortOrder || 'desc',
    };
  }

  return response;
}

/**
 * Get Drizzle sort order helper
 */
export function getSortOrder(column: any, order: 'asc' | 'desc'): SQL {
  return order === 'asc' ? asc(column) : desc(column);
}

// ═══════════════════════════════════════════════════════════════
// CURSOR PAGINATION (for large datasets)
// ═══════════════════════════════════════════════════════════════

/**
 * Parse cursor pagination params
 * More efficient than offset for deep pages
 */
export function getCursorPaginationParams(query: any): CursorPaginationParams {
  // Parse limit
  let limit = parseInt(query.first || query.last || String(DEFAULT_PAGE_SIZE), 10);
  limit = Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, limit));

  // Parse cursor
  const cursor = query.after || query.before
    ? String(query.after || query.before)
    : undefined;

  // Direction based on query params
  const direction: 'forward' | 'backward' = query.before ? 'backward' : 'forward';

  return { cursor, limit, direction };
}

/**
 * Encode cursor (ID + timestamp for stable ordering)
 */
export function encodeCursor(id: string, timestamp: Date): string {
  return Buffer.from(`${id}:${timestamp.toISOString()}`).toString('base64url');
}

/**
 * Decode cursor
 */
export function decodeCursor(cursor: string): { id: string; timestamp: Date } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf-8');
    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) return null;

    const id = decoded.substring(0, colonIndex);
    const isoDate = decoded.substring(colonIndex + 1);

    return { id, timestamp: new Date(isoDate) };
  } catch {
    return null;
  }
}

/**
 * Build cursor-paginated response
 */
export function createCursorPaginatedResponse<T extends { id: string; createdAt: Date }>(
  data: T[],
  hasMore: boolean,
  direction: 'forward' | 'backward'
): CursorPaginatedResponse<T> {
  const startCursor = data.length > 0
    ? encodeCursor(data[0].id, data[0].createdAt)
    : null;

  const endCursor = data.length > 0
    ? encodeCursor(data[data.length - 1].id, data[data.length - 1].createdAt)
    : null;

  return {
    data,
    pageInfo: {
      hasNextPage: direction === 'forward' ? hasMore : data.length > 0,
      hasPreviousPage: direction === 'backward' ? hasMore : data.length > 0,
      startCursor,
      endCursor,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// SECURITY UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Sanitize search query (prevent regex DOS)
 */
export function sanitizeSearchQuery(search: string | undefined): string | undefined {
  if (!search) return undefined;

  // Limit search length
  const maxLength = 100;
  let sanitized = search.slice(0, maxLength);

  // Remove special regex characters that could cause DOS
  sanitized = sanitized.replace(/[.*+?^${}()|[\]\\]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized.length > 0 ? sanitized : undefined;
}

/**
 * Validate sort field against entity whitelist
 */
export function isValidSortField(entity: SortableEntity, field: string): boolean {
  const allowed = SORTABLE_FIELDS[entity];
  return allowed ? allowed.includes(field) : false;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
  // Constants
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
  MIN_PAGE_SIZE,
  SORTABLE_FIELDS,

  // Offset pagination
  getPaginationParams,
  getPaginationParamsWithValidation,
  calculateOffset,
  createPaginatedResponse,
  getSortOrder,

  // Cursor pagination
  getCursorPaginationParams,
  encodeCursor,
  decodeCursor,
  createCursorPaginatedResponse,

  // Security
  sanitizeSearchQuery,
  isValidSortField,
};
