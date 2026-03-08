/**
 * Clients (Pet Owners) Routes
 *
 * Endpoints:
 *   GET    /api/v1/tenant/clients              → List (paginated, searchable)
 *   GET    /api/v1/tenant/clients/:id          → Get by ID
 *   POST   /api/v1/tenant/clients              → Create (auto-generates code)
 *   PUT    /api/v1/tenant/clients/:id          → Update
 *   DELETE /api/v1/tenant/clients/:id          → Soft delete
 *   GET    /api/v1/tenant/clients/:id/patients → List patients for a client
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { ClientService } from '../../services/ClientService';
import { PatientService } from '../../services/PatientService';
import {
  createClientSchema,
  updateClientSchema,
  listClientsSchema,
} from '../../validations/clientValidation';
import { listPatientsSchema } from '../../validations/patientValidation';

const router = Router();

// ─── LIST ────────────────────────────────────────────────────────────────────
router.get(
  '/',
  BaseController.handlePaginated(async ({ tenantId, query }) => {
    const params = listClientsSchema.parse(query);
    return ClientService.list(tenantId, params);
  }),
);

// ─── GET BY ID ───────────────────────────────────────────────────────────────
router.get(
  '/:id',
  BaseController.handle(async ({ tenantId, params }) => {
    return ClientService.getById(tenantId, params.id);
  }),
);

// ─── CREATE ──────────────────────────────────────────────────────────────────
router.post(
  '/',
  BaseController.handle(
    async ({ tenantId, validated }) => {
      return ClientService.create(tenantId, validated);
    },
    { bodySchema: createClientSchema, statusCode: 201 },
  ),
);

// ─── UPDATE ──────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      return ClientService.update(tenantId, params.id, validated);
    },
    { bodySchema: updateClientSchema },
  ),
);

// ─── DELETE (soft) ───────────────────────────────────────────────────────────
router.delete(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params }) => {
      await ClientService.remove(tenantId, params.id);
      return null;
    },
    { statusCode: 204 },
  ),
);

// ─── LIST PATIENTS FOR CLIENT ────────────────────────────────────────────────
router.get(
  '/:id/patients',
  BaseController.handlePaginated(async ({ tenantId, params: routeParams, query }) => {
    const listParams = listPatientsSchema.parse({ ...query, clientId: routeParams.id });
    return PatientService.list(tenantId, listParams);
  }),
);

export default router;
