import { Building2, Users, GitBranch, Activity, Server, Database, Loader2 } from 'lucide-react';
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
      color: '#EF4444',
      loading: loadingTenants
    },
    {
      title: 'Business Lines',
      value: businessLines?.length?.toString() || '0',
      icon: GitBranch,
      description: 'Across all tenants',
      color: '#F97316',
      loading: loadingBusinessLines
    },
    {
      title: 'Total Branches',
      value: branches?.length?.toString() || '0',
      icon: Building2,
      description: 'Physical locations',
      color: '#EAB308',
      loading: loadingBranches
    },
    {
      title: 'Platform Users',
      value: users?.length?.toString() || '0',
      icon: Users,
      description: 'Registered users',
      color: '#22C55E',
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
        <h1 className="text-3xl font-bold text-white">System Dashboard</h1>
        <p className="mt-2 text-gray-400">
          Platform-wide overview and system health monitoring
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-[#1E293B] border-[#334155] hover:border-[#475569] transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-gray-400">{stat.title}</CardDescription>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${stat.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: stat.color }} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {stat.loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: stat.color }} />
                  ) : (
                    stat.value
                  )}
                </div>
                <p className="text-sm mt-1 text-gray-500">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#1E293B] border-[#334155]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-500" />
              System Health
            </CardTitle>
            <CardDescription className="text-gray-400">
              Real-time infrastructure status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemMetrics.map((metric) => (
                <div key={metric.name} className="flex items-center justify-between p-3 rounded-lg bg-[#0F172A]">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      metric.status === 'healthy' ? 'bg-green-500' : 
                      metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className="text-gray-300">{metric.name}</span>
                  </div>
                  <span className={`text-sm font-medium ${
                    metric.status === 'healthy' ? 'text-green-400' : 
                    metric.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1E293B] border-[#334155]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-500" />
              Recent Tenants
            </CardTitle>
            <CardDescription className="text-gray-400">
              Latest organizations on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTenants ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : tenants && tenants.length > 0 ? (
              <div className="space-y-3">
                {tenants.slice(0, 5).map((tenant) => (
                  <div key={tenant.id} className="flex items-center justify-between p-3 rounded-lg bg-[#0F172A]">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: tenant.primaryColor || '#2563EB' }}
                      >
                        {tenant.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-gray-200 font-medium">{tenant.name}</p>
                        <p className="text-xs text-gray-500">{tenant.code}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      tenant.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {tenant.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No tenants found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
