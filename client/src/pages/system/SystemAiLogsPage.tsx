/**
 * System AI Logs Page
 * Platform-wide AI audit logs
 */

import { useState } from 'react';
import {
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select-advanced';
import { usePermissions } from '@/hooks/usePermissions';
import { useSystemAiLogs } from '@/hooks/useSystemAgi';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';

// Screen code for permission checking (SAP B1 Style)
const SCREEN_CODE = 'SYS_AI_LOGS';

export default function SystemAiLogsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    tenantId: '',
  });

  // Permission checks (SAP B1 Style)
  const { canAccessScreen, loading: permissionsLoading } = usePermissions();
  const canAccess = canAccessScreen(SCREEN_CODE);
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();

  // Data fetching
  const {
    data: logsData,
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = useSystemAiLogs({
    page,
    limit: 50,
    status: filters.status || undefined,
    tenantId: filters.tenantId || undefined,
  });

  // Show loading while checking permissions
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  // Access control
  if (!canAccess) {
    return <Navigate to="/system" replace />;
  }

  const statusColors: Record<string, string> = {
    SUCCESS: 'bg-green-500/10 text-green-500 border-green-500/30',
    FAILED: 'bg-red-500/10 text-red-500 border-red-500/30',
    REQUIRES_APPROVAL: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    DENIED: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'REQUIRES_APPROVAL':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'DENIED':
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text)] flex items-center gap-3"><FileText className="w-8 h-8 text-[var(--color-accent)]" /> AI System Logs</h1>
            <p className="text-[var(--color-text-secondary)]">
              View platform-wide AI operation audit logs
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchLogs()}
            disabled={logsLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${logsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Select
                value={filters.status}
                onValueChange={(value) => {
                  setFilters({ ...filters, status: value });
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="SUCCESS">Success</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="REQUIRES_APPROVAL">Requires Approval</SelectItem>
                  <SelectItem value="DENIED">Denied</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Input
                placeholder="Filter by Tenant ID..."
                value={filters.tenantId}
                onChange={(e) => {
                  setFilters({ ...filters, tenantId: e.target.value });
                  setPage(1);
                }}
              />
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setFilters({ status: '', tenantId: '' });
                setPage(1);
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[var(--ai-coral)]" />
              Audit Logs
            </CardTitle>
            {logsData?.pagination && (
              <span className="text-sm text-[var(--color-text-muted)]">
                {logsData.pagination.total} total logs
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-muted)]" />
            </div>
          ) : logsData?.data && logsData.data.length > 0 ? (
            <div className="space-y-2">
              {/* Table Header */}
              <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto_auto] gap-4 px-4 py-2 bg-[var(--color-surface-hover)] rounded-lg text-sm font-medium text-[var(--color-text-muted)]">
                <span className="w-8">Status</span>
                <span>Operation</span>
                <span>User</span>
                <span>Tenant</span>
                <span>Time</span>
                <span className="w-24 text-right">Details</span>
              </div>

              {/* Table Body */}
              {logsData.data.map((log: any) => (
                <div
                  key={log.id}
                  className="grid grid-cols-[auto_1fr_1fr_1fr_auto_auto] gap-4 px-4 py-3 border border-[var(--color-border)] rounded-lg items-center hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <span className="w-8">
                    <StatusIcon status={log.status} />
                  </span>
                  <span className="font-medium text-[var(--color-text)]">
                    {log.agiOperation}
                  </span>
                  <span className="text-sm text-[var(--color-text-secondary)] truncate">
                    {log.userId ? log.userId.slice(0, 8) + '...' : '-'}
                  </span>
                  <span className="text-sm text-[var(--color-text-secondary)] truncate">
                    {log.tenantId ? log.tenantId.slice(0, 8) + '...' : '-'}
                  </span>
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                  <span className="w-24 text-right">
                    <Badge className={statusColors[log.status] || ''}>
                      {log.status}
                    </Badge>
                  </span>
                </div>
              ))}

              {/* Pagination */}
              {logsData.pagination && logsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
                  <span className="text-sm text-[var(--color-text-muted)]">
                    Page {logsData.pagination.page} of {logsData.pagination.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(logsData.pagination.totalPages, p + 1))}
                      disabled={page === logsData.pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-muted)]">
              <FileText className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">No logs found</p>
              <p className="text-sm">AI operation logs will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
