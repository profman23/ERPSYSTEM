/**
 * Patients (Pets / Animals) Hooks
 *
 * React Query hooks for patient CRUD operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Patient {
  id: string;
  tenantId?: string;
  code: string;
  name: string;
  nameAr?: string;
  gender: 'male' | 'female' | 'unknown';
  reproductiveStatus?: 'intact' | 'neutered' | 'spayed';
  color?: string;
  distinctiveMarks?: string;
  dateOfBirth?: string;
  ageYears?: number;
  ageMonths?: number;
  ageDays?: number;
  internalNotes?: string;
  passportSeries?: string;
  insuranceNumber?: string;
  microchipId?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  clientId: string;
  speciesId: string;
  breedId?: string;
  crossBreedId?: string;
  // Denormalized fields from JOIN
  ownerName?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  clientCode?: string;
  speciesName?: string;
  breedName?: string;
}

export interface PatientListParams {
  search?: string;
  clientId?: string;
  speciesId?: string;
  breedId?: string;
  gender?: 'male' | 'female' | 'unknown';
  page?: number;
  limit?: number;
  isActive?: string;
}

export interface CreatePatientInput {
  clientId: string;
  speciesId: string;
  breedId?: string | null;
  crossBreedId?: string | null;
  name: string;
  nameAr?: string;
  gender?: 'male' | 'female' | 'unknown';
  reproductiveStatus?: 'intact' | 'neutered' | 'spayed';
  color?: string;
  distinctiveMarks?: string;
  dateOfBirth?: string | null;
  ageYears?: number | null;
  ageMonths?: number | null;
  ageDays?: number | null;
  internalNotes?: string;
  passportSeries?: string;
  insuranceNumber?: string;
  microchipId?: string;
  metadata?: Record<string, unknown>;
}

export type UpdatePatientInput = Partial<CreatePatientInput>;

// ─── Query Keys ──────────────────────────────────────────────────────────────

const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (params: PatientListParams) => [...patientKeys.lists(), params] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function usePatientsList(params: PatientListParams = {}) {
  return useQuery({
    queryKey: patientKeys.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get('/tenant/patients', { params });
      return data.data as {
        data: Patient[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      };
    },
  });
}

export function usePatientDetail(id: string | undefined) {
  return useQuery({
    queryKey: patientKeys.detail(id!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenant/patients/${id}`);
      return data.data as Patient;
    },
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePatientInput) => {
      const { data } = await apiClient.post('/tenant/patients', input);
      return data.data as Patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdatePatientInput & { id: string }) => {
      const { data } = await apiClient.put(`/tenant/patients/${id}`, input);
      return data.data as Patient;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: patientKeys.detail(variables.id) });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/tenant/patients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}
