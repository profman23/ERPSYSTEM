/**
 * useAuditTrail — React Query hook for resource audit trail
 *
 * Fetches audit log entries for a specific resource and transforms
 * them into HistoryEntry[] for DocumentHistoryDrawer.
 *
 * Usage:
 *   const { data: entries = [] } = useAuditTrail('species', id);
 *   <DocumentHistoryDrawer entries={entries} ... />
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { HistoryEntry, HistoryAction } from '@/components/document';

// ─── Types ──────────────────────────────────────────────────────────────

export interface AuditTrailEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  diff: Record<string, { old: unknown; new: unknown }> | null;
  createdAt: string;
}

// ─── Query Keys ─────────────────────────────────────────────────────────

export const auditTrailKeys = {
  all: ['auditTrail'] as const,
  resource: (type: string, id: string) => [...auditTrailKeys.all, type, id] as const,
};

// ─── Hook ───────────────────────────────────────────────────────────────

export function useAuditTrail(resourceType: string, resourceId: string | undefined) {
  return useQuery({
    queryKey: auditTrailKeys.resource(resourceType, resourceId!),
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/tenant/audit-trail/${resourceType}/${resourceId}`,
      );
      return data.data as AuditTrailEntry[];
    },
    enabled: !!resourceId && !!resourceType,
    staleTime: 5 * 60 * 1000,
    select: (entries) => entries.map(mapToHistoryEntry),
  });
}

// ─── Mappers ────────────────────────────────────────────────────────────

function mapAction(action: string): HistoryAction {
  switch (action) {
    case 'create':
      return 'CREATED';
    case 'update':
      return 'UPDATED';
    case 'delete':
      return 'DELETED';
    default:
      return 'UPDATED';
  }
}

function buildDetails(entry: AuditTrailEntry): string | undefined {
  if (!entry.diff) return undefined;
  const fields = Object.keys(entry.diff);
  if (fields.length === 0) return undefined;
  return `Changed: ${fields.join(', ')}`;
}

function mapToHistoryEntry(entry: AuditTrailEntry): HistoryEntry {
  return {
    action: mapAction(entry.action),
    userName: entry.userName || 'Unknown',
    userEmail: entry.userEmail || '',
    timestamp: entry.createdAt,
    details: buildDetails(entry),
  };
}
