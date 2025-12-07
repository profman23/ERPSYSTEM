import { Building2, Users, GitBranch, Activity, Server, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenants, useAllBranchesNoFilter, useAllUsers, useAllBusinessLines } from '@/hooks/useHierarchy';

export default function SystemDashboard() {
  const { data: tenants, isLoading: loadingTenants } = useTenants();
  const { data: businessLines, isLoading: loadingBusinessLines } = useAllBusinessLines();
  const { data: branches, isLoading: loadingBranches } = useAllBranchesNoFilter();
  const { data: users, isLoading: loadingUsers } = useAllUsers();

  const stats = [
    {
      title: 'Total Tenants',
      value: tenants?.length?.toString() || '0',
      icon: Building2,
      description: 'Active organizations',
      colorVar: 'var(--sys-accent)',
      loading: loadingTenants
    },
    {
      title: 'Business Lines',
      value: businessLines?.length?.toString() || '0',
      icon: GitBranch,
      description: 'Across all tenants',
      colorVar: 'var(--color-warning)',
      loading: loadingBusinessLines
    },
    {
      title: 'Total Branches',
      value: branches?.length?.toString() || '0',
      icon: Building2,
      description: 'Physical locations',
      colorVar: 'var(--color-success)',
      loading: loadingBranches
    },
    {
      title: 'Platform Users',
      value: users?.length?.toString() || '0',
      icon: Users,
      description: 'Registered users',
      colorVar: 'var(--color-info)',
      loading: loadingUsers
    }
  ];

  const systemMetrics = [
    { name: 'API Uptime', value: '99.99%', status: 'healthy' },
    { name: 'Database', value: 'Connected', status: 'healthy' },
    { name: 'Redis Cache', value: 'Degraded', status: 'warning' },
    { name: 'WebSocket', value: 'Active', status: 'healthy' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--sys-text)' }}>System Dashboard</h1>
        <p className="mt-2" style={{ color: 'var(--sys-text-secondary)' }}>
          Platform-wide overview and system health monitoring
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={stat.title} 
              className="border transition-colors"
              style={{ 
                backgroundColor: 'var(--sys-surface)', 
                borderColor: 'var(--sys-border)' 
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription style={{ color: 'var(--sys-text-secondary)' }}>{stat.title}</CardDescription>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `color-mix(in srgb, ${stat.colorVar} 15%, transparent)` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: stat.colorVar }} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" style={{ color: 'var(--sys-text)' }}>
                  {stat.loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: stat.colorVar }} />
                  ) : (
                    stat.value
                  )}
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--sys-text-muted)' }}>{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card 
          className="border"
          style={{ backgroundColor: 'var(--sys-surface)', borderColor: 'var(--sys-border)' }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: 'var(--sys-text)' }}>
              <Activity className="w-5 h-5" style={{ color: 'var(--sys-accent)' }} />
              System Health
            </CardTitle>
            <CardDescription style={{ color: 'var(--sys-text-secondary)' }}>
              Real-time infrastructure status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemMetrics.map((metric) => (
                <div 
                  key={metric.name} 
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--sys-bg)' }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ 
                        backgroundColor: metric.status === 'healthy' ? 'var(--color-success)' : 
                          metric.status === 'warning' ? 'var(--color-warning)' : 'var(--color-danger)'
                      }}
                    />
                    <span style={{ color: 'var(--sys-text-secondary)' }}>{metric.name}</span>
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

        <Card 
          className="border"
          style={{ backgroundColor: 'var(--sys-surface)', borderColor: 'var(--sys-border)' }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: 'var(--sys-text)' }}>
              <Server className="w-5 h-5" style={{ color: 'var(--color-info)' }} />
              Recent Tenants
            </CardTitle>
            <CardDescription style={{ color: 'var(--sys-text-secondary)' }}>
              Latest organizations on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTenants ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--sys-text-muted)' }} />
              </div>
            ) : tenants && tenants.length > 0 ? (
              <div className="space-y-3">
                {tenants.slice(0, 5).map((tenant) => (
                  <div 
                    key={tenant.id} 
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: 'var(--sys-bg)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: tenant.primaryColor || 'var(--sys-accent)', color: 'var(--color-text-on-accent)' }}
                      >
                        {tenant.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: 'var(--sys-text)' }}>{tenant.name}</p>
                        <p className="text-xs" style={{ color: 'var(--sys-text-muted)' }}>{tenant.code}</p>
                      </div>
                    </div>
                    <span 
                      className="px-2 py-1 text-xs rounded"
                      style={{
                        backgroundColor: tenant.status === 'active' 
                          ? 'color-mix(in srgb, var(--color-success) 20%, transparent)' 
                          : 'color-mix(in srgb, var(--color-text-muted) 20%, transparent)',
                        color: tenant.status === 'active' ? 'var(--color-success)' : 'var(--color-text-muted)'
                      }}
                    >
                      {tenant.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: 'var(--sys-text-muted)' }}>
                No tenants found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
