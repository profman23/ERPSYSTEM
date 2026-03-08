import { z } from 'zod';

/**
 * List Query Schema - for filtering and pagination
 */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().optional(), // Search in moduleCode, moduleName
  isActive: z.enum(['true', 'false']).optional(),
  category: z.enum(['CLINICAL', 'FINANCE', 'ADMIN', 'OPERATIONS', 'AI_AGI']).optional(),
  sortBy: z.enum(['moduleCode', 'moduleName', 'sortOrder', 'createdAt']).optional().default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

/**
 * Create Module Schema
 */
export const createModuleSchema = z.object({
  moduleCode: z.string()
    .min(2, 'Module code must be at least 2 characters')
    .max(100, 'Module code must not exceed 100 characters')
    .regex(/^[A-Z0-9_]+$/, 'Module code must be uppercase alphanumeric with underscores'),

  moduleName: z.string()
    .min(2, 'Module name must be at least 2 characters')
    .max(255, 'Module name must not exceed 255 characters'),

  moduleNameAr: z.string()
    .min(2, 'Arabic name must be at least 2 characters')
    .max(255, 'Arabic name must not exceed 255 characters')
    .optional(),

  description: z.string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional(),

  descriptionAr: z.string()
    .max(1000, 'Arabic description must not exceed 1000 characters')
    .optional(),

  category: z.enum(['CLINICAL', 'FINANCE', 'ADMIN', 'OPERATIONS', 'AI_AGI'], {
    errorMap: () => ({ message: 'Category must be one of: CLINICAL, FINANCE, ADMIN, OPERATIONS, AI_AGI' }),
  }).optional(),

  icon: z.string()
    .max(100, 'Icon must not exceed 100 characters')
    .optional(),

  route: z.string()
    .max(255, 'Route must not exceed 255 characters')
    .regex(/^\/[a-z0-9\-\/]*$/, 'Route must start with / and contain only lowercase, numbers, hyphens, and slashes')
    .optional(),

  sortOrder: z.string()
    .max(50, 'Sort order must not exceed 50 characters')
    .optional()
    .default('0'),

  isActive: z.enum(['true', 'false'])
    .optional()
    .default('true'),

  requiredAgiLevel: z.enum(['NO_ACCESS', 'READ_ONLY', 'SUGGEST', 'AUTOMATE', 'AUTONOMOUS'])
    .optional(),

  metadata: z.record(z.any())
    .optional(),
});

/**
 * Update Module Schema - all fields optional except none can be empty strings
 */
export const updateModuleSchema = z.object({
  moduleName: z.string()
    .min(2, 'Module name must be at least 2 characters')
    .max(255, 'Module name must not exceed 255 characters')
    .optional(),

  moduleNameAr: z.string()
    .min(2, 'Arabic name must be at least 2 characters')
    .max(255, 'Arabic name must not exceed 255 characters')
    .optional(),

  description: z.string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional(),

  descriptionAr: z.string()
    .max(1000, 'Arabic description must not exceed 1000 characters')
    .optional(),

  category: z.enum(['CLINICAL', 'FINANCE', 'ADMIN', 'OPERATIONS', 'AI_AGI'])
    .optional(),

  icon: z.string()
    .max(100, 'Icon must not exceed 100 characters')
    .optional(),

  route: z.string()
    .max(255, 'Route must not exceed 255 characters')
    .regex(/^\/[a-z0-9\-\/]*$/, 'Route must start with / and contain only lowercase, numbers, hyphens, and slashes')
    .optional(),

  sortOrder: z.string()
    .max(50, 'Sort order must not exceed 50 characters')
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
  id: z.string().uuid('Invalid module ID format'),
});

/**
 * Type Exports
 */
export type ListQueryInput = z.infer<typeof listQuerySchema>;
export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
export type IdParamInput = z.infer<typeof idParamSchema>;
