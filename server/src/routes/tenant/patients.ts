/**
 * Patients (Pets / Animals) Routes
 *
 * Endpoints:
 *   GET    /api/v1/tenant/patients           → List (paginated, searchable, filtered)
 *   GET    /api/v1/tenant/patients/:id       → Get by ID (with denormalized data)
 *   POST   /api/v1/tenant/patients           → Create (auto-generates code)
 *   PUT    /api/v1/tenant/patients/:id       → Update
 *   DELETE /api/v1/tenant/patients/:id       → Soft delete
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { PatientService } from '../../services/PatientService';
import {
  createPatientSchema,
  updatePatientSchema,
  listPatientsSchema,
} from '../../validations/patientValidation';

const router = Router();

// ─── LIST ────────────────────────────────────────────────────────────────────
router.get(
  '/',
  BaseController.handlePaginated(async ({ tenantId, query }) => {
    const params = listPatientsSchema.parse(query);
    return PatientService.list(tenantId, params);
  }),
);

// ─── GET BY ID ───────────────────────────────────────────────────────────────
router.get(
  '/:id',
  BaseController.handle(async ({ tenantId, params }) => {
    return PatientService.getById(tenantId, params.id);
  }),
);

// ─── CREATE ──────────────────────────────────────────────────────────────────
router.post(
  '/',
  BaseController.handle(
    async ({ tenantId, validated }) => {
      return PatientService.create(tenantId, validated);
    },
    { bodySchema: createPatientSchema, statusCode: 201 },
  ),
);

// ─── UPDATE ──────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      return PatientService.update(tenantId, params.id, validated);
    },
    { bodySchema: updatePatientSchema },
  ),
);

// ─── DELETE (soft) ───────────────────────────────────────────────────────────
router.delete(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params }) => {
      await PatientService.remove(tenantId, params.id);
      return null;
    },
    { statusCode: 204 },
  ),
);

export default router;
