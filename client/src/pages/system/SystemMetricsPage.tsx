/**
 * System Platform Metrics Page
 * Real-time system performance and usage statistics
 */

import { useMemo } from 'react';
import {
  Activity,
  Users,
  Building2,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Database,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  CreditCard,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';
import { useTenants, useAllUsers } from '@/hooks/useHierarchy';
import { useSystemRoles } from '@/hooks/useSystemRoles';
import { StatsSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useTranslation } from 'react-i18next';

// Screen code for permission checking (SAP B1 Style)
const SCREEN_CODE = 'SYSTEM_METRICS';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  iconBgClass?: string;
  iconColorClass?: string;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  iconBgClass = 'bg-[var(--color-accent-light)]',
  iconColorClass = 'text-[var(--color-accent)]',
}: MetricCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColorClass =
    trend === 'up'
      ? 'text-[var(--color-success)]'
      : trend === 'down'
      ? 'text-[var(--color-danger)]'
      : 'text-[var(--color-text-muted)]';

  return (
    <Card className="border card-panel">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconBgClass}`}>
            <Icon className={`w-6 h-6 ${iconColorClass}`} />
          </div>
          {trend && trendValue && (
            <div className={`flex items-center gap-1 text-sm ${trendColorClass}`}>
              <TrendIcon className="w-4 h-4" />
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <p className="text-3xl font-bold text-[var(--color-text)]">{value}</p>
        <p className="text-sm mt-1 text-[var(--color-text-secondary)]">{title}</p>
        {subtitle && (
          <p className="text-xs mt-1 text-[var(--color-text-muted)]">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function SystemMetricsPage() {
  // Permission checks (SAP B1 Style)
  const { canAccessScreen, loading: permissionsLoading } = usePermissions();
  const canAccess = canAccessScreen(SCREEN_CODE);
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { t } = useTranslation();

  // Fetch data
  const { data: tenants, isLoading: tenantsLoading } = useTenants();
  const { data: users, isLoading: usersLoading } = useAllUsers();
  const { data: rolesData, isLoading: rolesLoading } = useSystemRoles({ limit: 100 });

  const isLoading = tenantsLoading || usersLoading || rolesLoading;

  // Calculate metrics
  const metrics = useMemo(() => {
    const tenantList = tenants || [];
    const userList = users || [];
    const roleList = rolesData?.data || [];

    // Tenant stats
    const activeTenants = tenantList.filter((t: any) => t.status === 'active').length;
    const pendingTenants = tenantList.filter((t: any) => t.status === 'pending').length;
    const suspendedTenants = tenantList.filter((t: any) => t.status === 'suspended').length;

    // User stats
    const activeUsers = userList.filter((u: any) => u.status === 'active').length;
    const systemUsers = userList.filter((u: any) => u.accessScope === 'system').length;
    const tenantAdmins = userList.filter((u: any) => u.accessScope === 'tenant').length;

    // Role stats
    const protectedRoles = roleList.filter((r: any) => r.isProtected === 'true').length;
    const customRoles = roleList.length - protectedRoles;

    // Plan distribution
    const planCounts: Record<string, number> = {};
    tenantList.forEach((t: any) => {
      const plan = t.subscriptionPlan || 'standard';
      planCounts[plan] = (planCounts[plan] || 0) + 1;
    });

    return {
      totalTenants: tenantList.length,
      activeTenants,
      pendingTenants,
      suspendedTenants,
      totalUsers: userList.length,
      activeUsers,
      systemUsers,
      tenantAdmins,
      totalRoles: roleList.length,
      protectedRoles,
      customRoles,
      planCounts,
    };
  }, [tenants, users, rolesData]);

  // Show loading while checking permissions
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  // Redirect if no access (Level 0)
  if (!canAccess) {
    return <Navigate to="/system/dashboard" replace />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-[var(--color-accent)]" />
          <h1 className="text-3xl font-bold text-[var(--color-text)]">{t('metrics.title')}</h1>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* Main Stats */}
      {isLoading ? (
        <StatsSkeleton cards={4} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title={t('metrics.totalTenants')}
            value={metrics.totalTenants}
            subtitle={`${metrics.activeTenants} ${t('common.active').toLowerCase()}`}
            icon={Building2}
            trend="stable"
            iconBgClass="bg-[var(--color-accent-light)]"
            iconColorClass="text-[var(--color-accent)]"
          />
          <MetricCard
            title={t('metrics.totalUsers')}
            value={metrics.totalUsers}
            subtitle={`${metrics.activeUsers} ${t('common.active').toLowerCase()}`}
            icon={Users}
            trend="up"
            trendValue="+12%"
            iconBgClass="bg-[var(--badge-info-bg)]"
            iconColorClass="text-[var(--color-info)]"
          />
          <MetricCard
            title={t('metrics.systemRoles')}
            value={metrics.totalRoles}
            subtitle={`${metrics.customRoles} ${t('roles.custom').toLowerCase()}`}
            icon={Shield}
            trend="stable"
            iconBgClass="bg-[var(--badge-success-bg)]"
            iconColorClass="text-[var(--color-success)]"
          />
          <MetricCard
            title={t('metrics.activeRate')}
            value={`${metrics.totalUsers > 0 ? Math.round((metrics.activeUsers / metrics.totalUsers) * 100) : 0}%`}
            subtitle={t('metrics.userActivity')}
            icon={Activity}
            trend="up"
            trendValue="+5%"
            iconBgClass="bg-[var(--badge-warning-bg)]"
            iconColorClass="text-[var(--color-warning)]"
          />
        </div>
      )}

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenant Distribution */}
        {isLoading ? (
          <CardSkeleton lines={4} />
        ) : (
          <Card className="border card-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[var(--color-text)]"><BarChart3 className="w-5 h-5" /> {t('metrics.tenantStatusDist')}</CardTitle>
              <CardDescription className="text-[var(--color-text-secondary)]">
                {t('metrics.currentStatusAllTenants')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />
                    <span className="text-[var(--color-text)]">{t('metrics.activeTenants')}</span>
                  </div>
                  <Badge className="badge-success">{metrics.activeTenants}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[var(--color-warning)]" />
                    <span className="text-[var(--color-text)]">{t('metrics.pendingTenants')}</span>
                  </div>
                  <Badge className="badge-warning">{metrics.pendingTenants}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-[var(--color-danger)]" />
                    <span className="text-[var(--color-text)]">{t('metrics.suspendedTenants')}</span>
                  </div>
                  <Badge className="badge-danger">{metrics.suspendedTenants}</Badge>
                </div>

                {/* Progress bar */}
                <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                  <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-[var(--color-surface-hover)]">
                    {metrics.activeTenants > 0 && (
                      <div
                        className="bg-[var(--color-success)] transition-all"
                        style={{ width: `${(metrics.activeTenants / metrics.totalTenants) * 100}%` }}
                      />
                    )}
                    {metrics.pendingTenants > 0 && (
                      <div
                        className="bg-[var(--color-warning)] transition-all"
                        style={{ width: `${(metrics.pendingTenants / metrics.totalTenants) * 100}%` }}
                      />
                    )}
                    {metrics.suspendedTenants > 0 && (
                      <div
                        className="bg-[var(--color-danger)] transition-all"
                        style={{ width: `${(metrics.suspendedTenants / metrics.totalTenants) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Distribution */}
        {isLoading ? (
          <CardSkeleton lines={4} />
        ) : (
          <Card className="border card-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[var(--color-text)]"><Users className="w-5 h-5" /> {t('metrics.userDistribution')}</CardTitle>
              <CardDescription className="text-[var(--color-text-secondary)]">
                {t('metrics.usersByScope')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-[var(--color-accent)]" />
                    <span className="text-[var(--color-text)]">{t('metrics.systemUsers')}</span>
                  </div>
                  <Badge variant="default">{metrics.systemUsers}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-[var(--color-info)]" />
                    <span className="text-[var(--color-text)]">{t('metrics.tenantAdmins')}</span>
                  </div>
                  <Badge className="badge-info">{metrics.tenantAdmins}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-[var(--color-text-muted)]" />
                    <span className="text-[var(--color-text)]">{t('metrics.branchUsers')}</span>
                  </div>
                  <Badge className="badge-default">
                    {metrics.totalUsers - metrics.systemUsers - metrics.tenantAdmins}
                  </Badge>
                </div>

                {/* Progress bar */}
                <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                  <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-[var(--color-surface-hover)]">
                    {metrics.systemUsers > 0 && (
                      <div
                        className="bg-[var(--color-accent)] transition-all"
                        style={{ width: `${(metrics.systemUsers / metrics.totalUsers) * 100}%` }}
                      />
                    )}
                    {metrics.tenantAdmins > 0 && (
                      <div
                        className="bg-[var(--color-info)] transition-all"
                        style={{ width: `${(metrics.tenantAdmins / metrics.totalUsers) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Subscription Plans */}
      {isLoading ? (
        <CardSkeleton lines={3} />
      ) : (
        <Card className="border card-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--color-text)]"><CreditCard className="w-5 h-5" /> {t('metrics.subscriptionPlans')}</CardTitle>
            <CardDescription className="text-[var(--color-text-secondary)]">
              {t('metrics.tenantDistByPlan')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['trial', 'standard', 'professional', 'enterprise'].map((plan) => {
                const count = metrics.planCounts[plan] || 0;
                const percentage = metrics.totalTenants > 0 ? Math.round((count / metrics.totalTenants) * 100) : 0;
                const colors: Record<string, { bg: string; text: string }> = {
                  trial: { bg: 'bg-[var(--badge-default-bg)]', text: 'text-[var(--color-text-secondary)]' },
                  standard: { bg: 'bg-[var(--badge-info-bg)]', text: 'text-[var(--color-info)]' },
                  professional: { bg: 'bg-[var(--color-accent-light)]', text: 'text-[var(--color-accent)]' },
                  enterprise: { bg: 'bg-[var(--badge-warning-bg)]', text: 'text-[var(--color-warning)]' },
                };

                return (
                  <div
                    key={plan}
                    className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium capitalize ${colors[plan].text}`}>
                        {plan}
                      </span>
                      <Database className={`w-4 h-4 ${colors[plan].text}`} />
                    </div>
                    <p className="text-2xl font-bold text-[var(--color-text)]">{count}</p>
                    <div className="mt-2 h-2 rounded-full bg-[var(--color-surface-hover)] overflow-hidden">
                      <div
                        className={`h-full ${colors[plan].bg} transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs mt-1 text-[var(--color-text-muted)]">{percentage}% {t('metrics.ofTotal')}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
