/**
 * System AGI Hooks - React Query hooks for System Panel AI management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type {
  SystemAiConfig,
  UpdateSystemAiConfigInput,
  SystemAiMonitoring,
} from '@shared/agi';

// ═══════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════

export const systemAgiKeys = {
  all: ['system-agi'] as const,
  config: () => [...systemAgiKeys.all, 'config'] as const,
  monitoring: () => [...systemAgiKeys.all, 'monitoring'] as const,
  health: () => [...systemAgiKeys.all, 'health'] as const,
  logs: (filters?: Record<string, unknown>) => [...systemAgiKeys.all, 'logs', filters] as const,
};

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Get system-wide AI configuration
 */
export function useSystemAiConfig() {
  return useQuery({
    queryKey: systemAgiKeys.config(),
    queryFn: async (): Promise<SystemAiConfig> => {
      const response = await apiClient.get('/system/ai/config');
      return response.data.data;
    },
  });
}

/**
 * Update system-wide AI configuration
 */
export function useUpdateSystemAiConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateSystemAiConfigInput): Promise<SystemAiConfig> => {
      const response = await apiClient.put('/system/ai/config', input);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemAgiKeys.config() });
      queryClient.invalidateQueries({ queryKey: systemAgiKeys.monitoring() });
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// MONITORING HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Get system-wide AI monitoring data
 */
export function useSystemAiMonitoring() {
  return useQuery({
    queryKey: systemAgiKeys.monitoring(),
    queryFn: async (): Promise<SystemAiMonitoring> => {
      const response = await apiClient.get('/system/ai/monitoring');
      return response.data.data;
    },
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

/**
 * Get AI health status
 */
export function useSystemAiHealth() {
  return useQuery({
    queryKey: systemAgiKeys.health(),
    queryFn: async (): Promise<{
      status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
      claudeAvailable: boolean;
      lastCheck: Date;
    }> => {
      const response = await apiClient.get('/system/ai/health');
      return response.data.data;
    },
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
    retry: 1,
  });
}

// ═══════════════════════════════════════════════════════════════
// LOGS HOOKS
// ═══════════════════════════════════════════════════════════════

interface SystemLogFilters {
  tenantId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Get system-wide AI logs
 */
export function useSystemAiLogs(filters: SystemLogFilters = {}) {
  const { page = 1, limit = 100, ...rest } = filters;

  return useQuery({
    queryKey: systemAgiKeys.logs({ page, limit, ...rest }),
    queryFn: async () => {
      const response = await apiClient.get('/system/ai/logs', {
        params: { page, limit, ...rest },
      });
      return response.data;
    },
  });
}

/**
 * Get system log statistics
 */
export function useSystemAiLogStats(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [...systemAgiKeys.logs(), 'stats', { startDate, endDate }],
    queryFn: async (): Promise<{
      totalLogs: number;
      byStatus: Record<string, number>;
      byCategory: Record<string, number>;
      errorRate: number;
    }> => {
      const response = await apiClient.get('/system/ai/logs/stats', {
        params: { startDate, endDate },
      });
      return response.data.data;
    },
  });
}
