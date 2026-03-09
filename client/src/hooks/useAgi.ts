/**
 * AGI Hooks - React Query hooks for AI features (Tenant Panel)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type {
  AgiSettings,
  UpdateAgiSettingsInput,
  AgiChatRequest,
  AgiChatResponse,
  AgiApproval,
  AgiUsageStats,
  AgiAnalytics,
  PaginatedAgiResponse,
} from '@shared/agi';

// ═══════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════

export const agiKeys = {
  all: ['agi'] as const,
  settings: () => [...agiKeys.all, 'settings'] as const,
  status: () => [...agiKeys.all, 'status'] as const,
  usage: () => [...agiKeys.all, 'usage'] as const,
  analytics: (startDate?: string, endDate?: string) =>
    [...agiKeys.all, 'analytics', { startDate, endDate }] as const,
  approvals: () => [...agiKeys.all, 'approvals'] as const,
  approvalsList: (page: number, limit: number) =>
    [...agiKeys.approvals(), 'list', { page, limit }] as const,
  approvalCount: () => [...agiKeys.approvals(), 'count'] as const,
  approval: (id: string) => [...agiKeys.approvals(), id] as const,
  logs: (filters?: Record<string, unknown>) => [...agiKeys.all, 'logs', filters] as const,
};

// ═══════════════════════════════════════════════════════════════
// STATUS & SETTINGS HOOKS
// ═══════════════════════════════════════════════════════════════

interface AgiStatus {
  isEnabled: boolean;
  claudeAvailable: boolean;
  mode: 'FULL' | 'LIMITED';
  pendingApprovals: number;
}

/**
 * Get AI status for the tenant
 */
export function useAgiStatus() {
  return useQuery({
    queryKey: agiKeys.status(),
    queryFn: async (): Promise<AgiStatus> => {
      const response = await apiClient.get('/tenant/ai/status');
      return response.data.data;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get AI settings for the tenant
 */
export function useAgiSettings() {
  return useQuery({
    queryKey: agiKeys.settings(),
    queryFn: async (): Promise<AgiSettings & { claudeAvailable: boolean }> => {
      const response = await apiClient.get('/tenant/ai/settings');
      return response.data.data;
    },
  });
}

/**
 * Update AI settings
 */
export function useUpdateAgiSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateAgiSettingsInput): Promise<AgiSettings> => {
      const response = await apiClient.put('/tenant/ai/settings', input);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agiKeys.settings() });
      queryClient.invalidateQueries({ queryKey: agiKeys.status() });
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// CHAT HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Send a chat message to the AI
 */
export function useAgiChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: AgiChatRequest): Promise<AgiChatResponse> => {
      const response = await apiClient.post('/tenant/ai/chat', request);
      return response.data;
    },
    onSuccess: (data) => {
      // If an approval was created, refresh the approvals list
      if (data.requiresApproval) {
        queryClient.invalidateQueries({ queryKey: agiKeys.approvals() });
      }
    },
  });
}

/**
 * Stream chat response (returns an async generator)
 */
export async function* streamAgiChat(
  request: AgiChatRequest
): AsyncGenerator<{ type: string; content?: string; error?: string }> {
  const response = await fetch('/api/tenant/ai/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No reader available');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE events
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        try {
          yield JSON.parse(data);
        } catch {
          // Ignore parse errors
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// APPROVALS HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Get pending approvals
 */
export function useAgiApprovals(page = 1, limit = 20) {
  return useQuery({
    queryKey: agiKeys.approvalsList(page, limit),
    queryFn: async (): Promise<PaginatedAgiResponse<AgiApproval>> => {
      const response = await apiClient.get('/tenant/ai/approvals', {
        params: { page, limit },
      });
      return response.data;
    },
  });
}

/**
 * Get pending approval count
 */
export function useAgiApprovalCount() {
  return useQuery({
    queryKey: agiKeys.approvalCount(),
    queryFn: async (): Promise<number> => {
      const response = await apiClient.get('/tenant/ai/approvals/count');
      return response.data.data.count;
    },
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  });
}

/**
 * Get a specific approval
 */
export function useAgiApproval(id: string) {
  return useQuery({
    queryKey: agiKeys.approval(id),
    queryFn: async (): Promise<AgiApproval> => {
      const response = await apiClient.get(`/tenant/ai/approvals/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

/**
 * Approve an action
 */
export function useApproveAgiOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (approvalId: string): Promise<AgiApproval> => {
      const response = await apiClient.post(`/tenant/ai/approvals/${approvalId}/approve`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agiKeys.approvals() });
    },
  });
}

/**
 * Reject an action
 */
export function useRejectAgiOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      approvalId,
      reason,
    }: {
      approvalId: string;
      reason?: string;
    }): Promise<AgiApproval> => {
      const response = await apiClient.post(`/tenant/ai/approvals/${approvalId}/reject`, {
        reason,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agiKeys.approvals() });
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// USAGE & ANALYTICS HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Get current usage stats
 */
export function useAgiUsage() {
  return useQuery({
    queryKey: agiKeys.usage(),
    queryFn: async (): Promise<AgiUsageStats> => {
      const response = await apiClient.get('/tenant/ai/usage');
      return response.data.data;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Get analytics for a date range
 */
export function useAgiAnalytics(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: agiKeys.analytics(startDate, endDate),
    queryFn: async (): Promise<AgiAnalytics> => {
      const response = await apiClient.get('/tenant/ai/analytics', {
        params: { startDate, endDate },
      });
      return response.data.data;
    },
    enabled: true,
  });
}

// ═══════════════════════════════════════════════════════════════
// LOGS HOOKS
// ═══════════════════════════════════════════════════════════════

interface LogFilters {
  userId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Get AI logs
 */
export function useAgiLogs(filters: LogFilters = {}) {
  const { page = 1, limit = 50, ...rest } = filters;

  return useQuery({
    queryKey: agiKeys.logs({ page, limit, ...rest }),
    queryFn: async () => {
      const response = await apiClient.get('/tenant/ai/logs', {
        params: { page, limit, ...rest },
      });
      return response.data;
    },
  });
}
