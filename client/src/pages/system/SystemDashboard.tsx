import { Building2, Users, GitBranch, Loader2, LayoutDashboard, HeartPulse } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenants, useAllBranchesNoFilter, useAllUsers, useAllBusinessLines } from '@/hooks/useHierarchy';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useTranslation } from 'react-i18next';

export default function SystemDashboard() {
  const { t } = useTranslation();
  const { data: tenants, isLoading: loadingTenants } = useTenants();
  const { data: businessLines, isLoading: loadingBusinessLines } = useAllBusinessLines();
  const { data: branches, isLoading: loadingBranches } = useAllBranchesNoFilter();
  const { data: users, isLoading: loadingUsers } = useAllUsers();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();

  const stats = [
    {
      key: 'tenants',
      title: t('system.totalTenants'),
      value: tenants?.length?.toString() || '0',
      icon: Building2,
      description: t('system.activeOrganizations'),
      colorVar: 'var(--color-accent)',
      loading: loadingTenants
    },
    {
      key: 'businessLines',
      title: t('system.businessLines'),
      value: businessLines?.length?.toString() || '0',
      icon: GitBranch,
      description: t('system.acrossAllTenants'),
      colorVar: 'var(--color-warning)',
      loading: loadingBusinessLines
    },
    {
      key: 'branches',
      title: t('system.totalBranches'),
      value: branches?.length?.toString() || '0',
      icon: Building2,
      description: t('system.physicalLocations'),
      colorVar: 'var(--color-success)',
      loading: loadingBranches
    },
    {
      key: 'users',
      title: t('system.platformUsers'),
      value: users?.length?.toString() || '0',
      icon: Users,
      description: t('system.registeredUsers'),
      colorVar: 'var(--color-info)',
      loading: loadingUsers
    }
  ];

  const systemMetrics = [
    { name: t('system.apiUptime'), value: '99.99%', status: 'healthy' },
    { name: t('system.database'), value: t('system.connected'), status: 'healthy' },
    { name: t('system.redisCache'), value: t('system.degraded'), status: 'warning' },
    { name: t('system.webSocket'), value: t('system.active'), status: 'healthy' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-[var(--color-accent)]" />
          <h1 className="text-3xl font-bold text-[var(--color-text)]">{t('nav.systemDashboard')}</h1>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.key}
              className="card-panel border transition-colors"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-[var(--color-text-secondary)]">{stat.title}</CardDescription>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `color-mix(in srgb, ${stat.colorVar} 15%, transparent)` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: stat.colorVar }} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[var(--color-text)]">
                  {stat.loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: stat.colorVar }} />
                  ) : (
                    stat.value
                  )}
                </div>
                <p className="text-sm mt-1 text-[var(--color-text-muted)]">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-panel border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--color-text)]">
              <HeartPulse className="w-5 h-5 text-[var(--color-accent)]" />
              {t('system.systemHealth')}
            </CardTitle>
            <CardDescription className="text-[var(--color-text-secondary)]">
              {t('system.realtimeStatus')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemMetrics.map((metric) => (
                <div
                  key={metric.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg)]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: metric.status === 'healthy' ? 'var(--color-success)' :
                          metric.status === 'warning' ? 'var(--color-warning)' : 'var(--color-danger)'
                      }}
                    />
                    <span className="text-[var(--color-text-secondary)]">{metric.name}</span>
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: metric.status === 'healthy' ? 'var(--color-success)' :
                        metric.status === 'warning' ? 'var(--color-warning)' : 'var(--color-danger)'
                    }}
                  >
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-panel border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--color-text)]">
              <Building2 className="w-5 h-5 text-[var(--color-info)]" />
              {t('system.recentTenants')}
            </CardTitle>
            <CardDescription className="text-[var(--color-text-secondary)]">
              {t('system.latestOrganizations')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTenants ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-muted)]" />
              </div>
            ) : tenants && tenants.length > 0 ? (
              <div className="space-y-3">
                {tenants.slice(0, 5).map((tenant) => (
                  <div
                    key={tenant.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg)]"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-[var(--color-text-on-accent)]"
                        style={{ backgroundColor: tenant.primaryColor || 'var(--color-accent)' }}
                      >
                        {tenant.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--color-text)]">{tenant.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{tenant.code}</p>
                      </div>
                    </div>
                    <span
                      className="px-2 py-1 text-xs rounded"
                      style={{
                        backgroundColor: tenant.status === 'active'
                          ? 'var(--badge-success-bg)'
                          : 'var(--badge-default-bg)',
                        color: tenant.status === 'active' ? 'var(--badge-success-text)' : 'var(--badge-default-text)'
                      }}
                    >
                      {tenant.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[var(--color-text-muted)]">
                {t('system.noTenantsFound')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
