/**
 * System AI Monitoring Page
 * Platform-wide AI usage monitoring and statistics
 */

import { useState } from 'react';
import {
  Cpu,
  Activity,
  Users,
  Zap,
  Loader2,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';
import { useSystemAiMonitoring, useSystemAiHealth } from '@/hooks/useSystemAgi';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';

// Screen code for permission checking (SAP B1 Style)
const SCREEN_CODE = 'SYS_AI_MONITORING';

export default function SystemAiMonitoringPage() {
  // Permission checks (SAP B1 Style)
  const { canAccessScreen, loading: permissionsLoading } = usePermissions();
  const canAccess = canAccessScreen(SCREEN_CODE);
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();

  // Data fetching
  const {
    data: monitoring,
    isLoading: monitoringLoading,
    refetch: refetchMonitoring,
  } = useSystemAiMonitoring();
  const { data: health } = useSystemAiHealth();

  // Show loading while checking permissions
  if (permissionsLoading || monitoringLoading) {
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

  const healthStatus = health?.status ?? 'DOWN';
  const healthColors = {
    HEALTHY: 'bg-green-500',
    DEGRADED: 'bg-yellow-500',
    DOWN: 'bg-red-500',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text)] flex items-center gap-3"><Activity className="w-8 h-8 text-[var(--color-accent)]" /> AI Monitoring</h1>
            <p className="text-[var(--color-text-secondary)]">
              Monitor AI usage and performance across all tenants
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${healthColors[healthStatus]} animate-pulse`} />
              <span className="text-sm text-[var(--color-text-secondary)]">{healthStatus}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchMonitoring()}
              disabled={monitoringLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${monitoringLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Total Tenants</p>
                <p className="text-2xl font-bold text-[var(--color-text)]">
                  {monitoring?.totalTenants ?? 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-[var(--ai-coral)] opacity-80" />
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-2">
              {monitoring?.tenantsWithAiEnabled ?? 0} with AI enabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Today's Requests</p>
                <p className="text-2xl font-bold text-[var(--color-text)]">
                  {monitoring?.todayRequests?.toLocaleString() ?? 0}
                </p>
              </div>
              <Zap className="h-8 w-8 text-[var(--ai-coral)] opacity-80" />
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-2">
              {monitoring?.todayTokens?.toLocaleString() ?? 0} tokens used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Month Requests</p>
                <p className="text-2xl font-bold text-[var(--color-text)]">
                  {monitoring?.monthRequests?.toLocaleString() ?? 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-[var(--ai-coral)] opacity-80" />
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-2">
              {monitoring?.monthTokens?.toLocaleString() ?? 0} tokens used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Est. Monthly Cost</p>
                <p className="text-2xl font-bold text-[var(--color-text)]">
                  ${(monitoring?.monthCost ?? 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-[var(--ai-coral)] opacity-80" />
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-2">
              Based on current usage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Health & Performance */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[var(--ai-coral)]" />
              API Health
            </CardTitle>
            <CardDescription>Current API status and performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-[var(--color-surface-hover)] rounded-lg">
                <div className="flex items-center gap-3">
                  {monitoring?.apiStatus === 'HEALTHY' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : monitoring?.apiStatus === 'DEGRADED' ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">API Status</span>
                </div>
                <Badge
                  variant={
                    monitoring?.apiStatus === 'HEALTHY'
                      ? 'default'
                      : monitoring?.apiStatus === 'DEGRADED'
                      ? 'secondary'
                      : 'destructive'
                  }
                >
                  {monitoring?.apiStatus ?? 'UNKNOWN'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[var(--color-surface-hover)] rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-[var(--color-text-muted)]" />
                    <span className="text-sm text-[var(--color-text-muted)]">Avg Response Time</span>
                  </div>
                  <p className="text-xl font-bold text-[var(--color-text)]">
                    {monitoring?.avgResponseTimeMs ?? 0}ms
                  </p>
                </div>

                <div className="p-3 bg-[var(--color-surface-hover)] rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-[var(--color-text-muted)]" />
                    <span className="text-sm text-[var(--color-text-muted)]">Error Rate</span>
                  </div>
                  <p className="text-xl font-bold text-[var(--color-text)]">
                    {monitoring?.errorRate ?? 0}%
                  </p>
                </div>
              </div>

              <div className="p-3 bg-[var(--color-surface-hover)] rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Cpu className="h-4 w-4 text-[var(--color-text-muted)]" />
                  <span className="text-sm text-[var(--color-text-muted)]">Today's Errors</span>
                </div>
                <p className="text-xl font-bold text-[var(--color-text)]">
                  {monitoring?.todayErrors ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Tenants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[var(--ai-coral)]" />
              Top Tenants by Usage
            </CardTitle>
            <CardDescription>Highest AI consumers this month</CardDescription>
          </CardHeader>
          <CardContent>
            {monitoring?.topTenantsByUsage && monitoring.topTenantsByUsage.length > 0 ? (
              <div className="space-y-3">
                {monitoring.topTenantsByUsage.map((tenant, index) => (
                  <div
                    key={tenant.tenantId}
                    className="flex items-center justify-between p-3 bg-[var(--color-surface-hover)] rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center bg-[var(--ai-coral)] text-white text-xs font-bold rounded-full">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-[var(--color-text)]">{tenant.tenantName}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {tenant.tokens?.toLocaleString() ?? 0} tokens
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[var(--color-text)]">
                        {tenant.requests?.toLocaleString() ?? 0}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">requests</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-[var(--color-text-muted)]">
                <Activity className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">No usage data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common monitoring tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <a href="/system/ai/logs">View All Logs</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/system/ai/config">Configure AI</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
