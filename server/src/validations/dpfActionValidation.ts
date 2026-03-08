import { z } from 'zod';

/**
 * List Query Schema - for filtering and pagination
 */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().optional(), // Search in actionCode, actionName, apiEndpoint
  isActive: z.enum(['true', 'false']).optional(),
  moduleId: z.string().uuid('Invalid module ID').optional(),
  screenId: z.string().uuid('Invalid screen ID').optional(),
  actionType: z.enum(['CRUD', 'API', 'SOCKET', 'REPORT', 'EXPORT']).optional(),
  actionCategory: z.enum(['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXECUTE']).optional(),
  httpMethod: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  sortBy: z.enum(['actionCode', 'actionName', 'actionType', 'createdAt']).optional().default('actionName'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

/**
 * Create Action Schema
 */
export const createActionSchema = z.object({
  moduleId: z.string().uuid('Invalid module ID'),

  screenId: z.string().uuid('Invalid screen ID').optional(), // Null for API/Socket actions

  actionCode: z.string()
    .min(2, 'Action code must be at least 2 characters')
    .max(100, 'Action code must not exceed 100 characters')
    .regex(/^[A-Z0-9_]+$/, 'Action code must be uppercase alphanumeric with underscores'),

  actionName: z.string()
    .min(2, 'Action name must be at least 2 characters')
    .max(255, 'Action name must not exceed 255 characters'),

  actionNameAr: z.string()
    .min(2, 'Arabic name must be at least 2 characters')
    .max(255, 'Arabic name must not exceed 255 characters')
    .optional(),

  description: z.string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional(),

  descriptionAr: z.string()
    .max(1000, 'Arabic description must not exceed 1000 characters')
    .optional(),

  actionType: z.enum(['CRUD', 'API', 'SOCKET', 'REPORT', 'EXPORT'], {
    errorMap: () => ({ message: 'Action type must be one of: CRUD, API, SOCKET, REPORT, EXPORT' }),
  }),

  actionCategory: z.enum(['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXECUTE'], {
    errorMap: () => ({ message: 'Action category must be one of: CREATE, READ, UPDATE, DELETE, EXECUTE' }),
  }),

  httpMethod: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
    .optional(),

  apiEndpoint: z.string()
    .max(500, 'API endpoint must not exceed 500 characters')
    .regex(/^\/[a-zA-Z0-9\-\/:\{\}\*]*$/, 'API endpoint must start with / and be a valid path')
    .optional(),

  socketEvent: z.string()
    .max(100, 'Socket event must not exceed 100 characters')
    .regex(/^[a-z0-9\-:_]+$/, 'Socket event must be lowercase with hyphens, colons, or underscores')
    .optional(),

  requiredScope: z.enum(['SYSTEM', 'TENANT', 'BUSINESS_LINE', 'BRANCH'])
    .optional(),

  requiredAgiLevel: z.enum(['NO_ACCESS', 'READ_ONLY', 'SUGGEST', 'AUTOMATE', 'AUTONOMOUS'])
    .optional(),

  isDestructive: z.enum(['true', 'false'])
    .optional()
    .default('false'),

  isActive: z.enum(['true', 'false'])
    .optional()
    .default('true'),

  voiceCommandsEn: z.array(z.string())
    .optional(),

  voiceCommandsAr: z.array(z.string())
    .optional(),

  metadata: z.record(z.any())
    .optional(),
}).refine(
  (data) => {
    // If actionType is API, apiEndpoint and httpMethod are required
    if (data.actionType === 'API') {
      return !!data.apiEndpoint && !!data.httpMethod;
    }
    return true;
  },
  {
    message: 'API actions require both apiEndpoint and httpMethod',
    path: ['apiEndpoint'],
  }
).refine(
  (data) => {
    // If actionType is SOCKET, socketEvent is required
    if (data.actionType === 'SOCKET') {
      return !!data.socketEvent;
    }
    return true;
  },
  {
    message: 'SOCKET actions require socketEvent',
    path: ['socketEvent'],
  }
);

/**
 * Update Action Schema - all fields optional except none can be empty strings
 */
export const updateActionSchema = z.object({
  actionName: z.string()
    .min(2, 'Action name must be at least 2 characters')
    .max(255, 'Action name must not exceed 255 characters')
    .optional(),

  actionNameAr: z.string()
    .min(2, 'Arabic name must be at least 2 characters')
    .max(255, 'Arabic name must not exceed 255 characters')
    .optional(),

  description: z.string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional(),

  descriptionAr: z.string()
    .max(1000, 'Arabic description must not exceed 1000 characters')
    .optional(),

  actionType: z.enum(['CRUD', 'API', 'SOCKET', 'REPORT', 'EXPORT'])
    .optional(),

  actionCategory: z.enum(['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXECUTE'])
    .optional(),

  httpMethod: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
    .optional(),

  apiEndpoint: z.string()
    .max(500, 'API endpoint must not exceed 500 characters')
    .regex(/^\/[a-zA-Z0-9\-\/:\{\}\*]*$/, 'API endpoint must start with / and be a valid path')
    .optional(),

  socketEvent: z.string()
    .max(100, 'Socket event must not exceed 100 characters')
    .regex(/^[a-z0-9\-:_]+$/, 'Socket event must be lowercase with hyphens, colons, or underscores')
    .optional(),

  requiredScope: z.enum(['SYSTEM', 'TENANT', 'BUSINESS_LINE', 'BRANCH'])
    .optional(),

  requiredAgiLevel: z.enum(['NO_ACCESS', 'READ_ONLY', 'SUGGEST', 'AUTOMATE', 'AUTONOMOUS'])
    .optional(),

  isDestructive: z.enum(['true', 'false'])
    .optional(),

  isActive: z.enum(['true', 'false'])
    .optional(),

  voiceCommandsEn: z.array(z.string())
    .optional(),

  voiceCommandsAr: z.array(z.string())
    .optional(),

  metadata: z.record(z.any())
    .optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

/**
 * ID Parameter Schema (for route params)
 */
export const idParamSchema = z.object({
  id: z.string().uuid('Invalid action ID format'),
});

/**
 * Type Exports
 */
export type ListQueryInput = z.infer<typeof listQuerySchema>;
export type CreateActionInput = z.infer<typeof createActionSchema>;
export type UpdateActionInput = z.infer<typeof updateActionSchema>;
export type IdParamInput = z.infer<typeof idParamSchema>;
