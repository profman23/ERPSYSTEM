import { z } from 'zod';

/**
 * List Query Schema - for filtering and pagination
 */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().optional(), // Search in screenCode, screenName
  isActive: z.enum(['true', 'false']).optional(),
  moduleId: z.string().uuid('Invalid module ID').optional(), // Filter by module
  sortBy: z.enum(['screenCode', 'screenName', 'createdAt']).optional().default('screenName'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

/**
 * Create Screen Schema
 */
export const createScreenSchema = z.object({
  moduleId: z.string().uuid('Invalid module ID'),

  screenCode: z.string()
    .min(2, 'Screen code must be at least 2 characters')
    .max(100, 'Screen code must not exceed 100 characters')
    .regex(/^[A-Z0-9_]+$/, 'Screen code must be uppercase alphanumeric with underscores'),

  screenName: z.string()
    .min(2, 'Screen name must be at least 2 characters')
    .max(255, 'Screen name must not exceed 255 characters'),

  screenNameAr: z.string()
    .min(2, 'Arabic name must be at least 2 characters')
    .max(255, 'Arabic name must not exceed 255 characters')
    .optional(),

  description: z.string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional(),

  descriptionAr: z.string()
    .max(1000, 'Arabic description must not exceed 1000 characters')
    .optional(),

  route: z.string()
    .max(255, 'Route must not exceed 255 characters')
    .regex(/^\/[a-z0-9\-\/]*$/, 'Route must start with / and contain only lowercase, numbers, hyphens, and slashes')
    .optional(),

  componentPath: z.string()
    .max(500, 'Component path must not exceed 500 characters')
    .regex(/^[a-zA-Z0-9\/\.\-_]+$/, 'Component path must be a valid file path')
    .optional(),

  isActive: z.enum(['true', 'false'])
    .optional()
    .default('true'),

  requiredAgiLevel: z.enum(['NO_ACCESS', 'READ_ONLY', 'SUGGEST', 'AUTOMATE', 'AUTONOMOUS'])
    .optional(),

  metadata: z.record(z.any())
    .optional(),
});

/**
 * Update Screen Schema - all fields optional except none can be empty strings
 */
export const updateScreenSchema = z.object({
  screenName: z.string()
    .min(2, 'Screen name must be at least 2 characters')
    .max(255, 'Screen name must not exceed 255 characters')
    .optional(),

  screenNameAr: z.string()
    .min(2, 'Arabic name must be at least 2 characters')
    .max(255, 'Arabic name must not exceed 255 characters')
    .optional(),

  description: z.string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional(),

  descriptionAr: z.string()
    .max(1000, 'Arabic description must not exceed 1000 characters')
    .optional(),

  route: z.string()
    .max(255, 'Route must not exceed 255 characters')
    .regex(/^\/[a-z0-9\-\/]*$/, 'Route must start with / and contain only lowercase, numbers, hyphens, and slashes')
    .optional(),

  componentPath: z.string()
    .max(500, 'Component path must not exceed 500 characters')
    .regex(/^[a-zA-Z0-9\/\.\-_]+$/, 'Component path must be a valid file path')
    .optional(),

  isActive: z.enum(['true', 'false'])
    .optional(),

  requiredAgiLevel: z.enum(['NO_ACCESS', 'READ_ONLY', 'SUGGEST', 'AUTOMATE', 'AUTONOMOUS'])
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
  id: z.string().uuid('Invalid screen ID format'),
});

/**
 * Type Exports
 */
export type ListQueryInput = z.infer<typeof listQuerySchema>;
export type CreateScreenInput = z.infer<typeof createScreenSchema>;
export type UpdateScreenInput = z.infer<typeof updateScreenSchema>;
export type IdParamInput = z.infer<typeof idParamSchema>;
