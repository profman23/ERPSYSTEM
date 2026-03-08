/**
 * System Panel Routes - /api/v1/system/*
 *
 * All routes in this module:
 * - Require authentication (authMiddleware)
 * - Require system scope (requireSystemScope)
 * - Use SYSTEM_* screen codes for authorization
 *
 * Screen Authorization Levels (SAP B1 Style):
 * - 0: No Access
 * - 1: Read Only (view only)
 * - 2: Full Access (view + create + update)
 *
 * Available Screen Codes:
 * - SYSTEM_TENANT_LIST: Manage tenants
 * - SYSTEM_USER_LIST: Manage system users
 * - SYSTEM_ROLE_LIST: Manage system roles
 * - SYSTEM_DPF_MANAGER: Manage DPF structure
 */

import { Router } from 'express';
import rolesRoutes from './roles';
import usersRoutes from './users';
import tenantsRoutes from './tenants';
import dpfRoutes from './dpf';
import aiRoutes from './ai';

const router = Router();

// System Roles Management - SYSTEM_ROLE_LIST screen
router.use('/roles', rolesRoutes);

// System Users Management - SYSTEM_USER_LIST screen
router.use('/users', usersRoutes);

// System Tenants Management - SYSTEM_TENANT_LIST screen
router.use('/tenants', tenantsRoutes);

// DPF Structure Management - SYSTEM_DPF_MANAGER & SYSTEM_ROLE_LIST screens
router.use('/dpf', dpfRoutes);

// AI Management - SYS_AI_CONFIG, SYS_AI_MONITORING, SYS_AI_LOGS screens
router.use('/ai', aiRoutes);

export default router;
