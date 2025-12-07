import { Users, GitBranch, Briefcase, TrendingUp, Calendar, Loader2, AlertTriangle } from 'lucide-react';
import { useAllBusinessLines, useAllBranchesNoFilter, useAllUsers } from '@/hooks/useHierarchy';

export default function AdminDashboard() {
  const { data: businessLines, isLoading: loadingBusinessLines } = useAllBusinessLines();
  const { data: branches, isLoading: loadingBranches } = useAllBranchesNoFilter();
  const { data: users, isLoading: loadingUsers } = useAllUsers();

  const stats = [
    {
      title: 'Business Lines',
      value: businessLines?.length?.toString() || '0',
      icon: Briefcase,
      description: 'Active business units',
      colorVar: 'var(--tenant-accent)',
      loading: loadingBusinessLines
    },
    {
      title: 'Branches',
      value: branches?.length?.toString() || '0',
      icon: GitBranch,
      description: 'Physical locations',
      colorVar: 'var(--color-info)',
      loading: loadingBranches
    },
    {
      title: 'Users',
      value: users?.length?.toString() || '0',
      icon: Users,
      description: 'Team members',
      colorVar: 'var(--color-accent)',
      loading: loadingUsers
    },
    {
      title: 'Growth',
      value: '+12%',
      icon: TrendingUp,
      description: 'This month',
      colorVar: 'var(--color-success)',
      loading: false
    }
  ];

  const recentActivity = [
    { action: 'New user registered', user: 'Dr. Sarah Johnson', time: '2 hours ago' },
    { action: 'Branch settings updated', user: 'Admin', time: '5 hours ago' },
    { action: 'New role created', user: 'System', time: '1 day ago' },
    { action: 'User permissions modified', user: 'Admin', time: '2 days ago' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--tenant-text)' }}>
          Admin Dashboard
        </h1>
        <p className="mt-2" style={{ color: 'var(--tenant-text-secondary)' }}>
          Welcome back! Here's an overview of your organization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.title} 
              className="rounded-xl border p-6 transition-shadow hover:shadow-lg"
              style={{ backgroundColor: 'var(--tenant-surface)', borderColor: 'var(--tenant-border)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium" style={{ color: 'var(--tenant-text-secondary)' }}>
                  {stat.title}
                </span>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `color-mix(in srgb, ${stat.colorVar} 15%, transparent)` }}
                >
                  <Icon className="w-5 h-5" style={{ color: stat.colorVar }} />
                </div>
              </div>
              <div className="text-3xl font-bold" style={{ color: 'var(--tenant-text)' }}>
                {stat.loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: stat.colorVar }} />
                ) : (
                  stat.value
                )}
              </div>
              <p className="text-sm mt-1" style={{ color: 'var(--tenant-text-secondary)' }}>
                {stat.description}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div 
          className="rounded-xl border p-6"
          style={{ backgroundColor: 'var(--tenant-surface)', borderColor: 'var(--tenant-border)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5" style={{ color: 'var(--tenant-accent)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--tenant-text)' }}>
              Recent Activity
            </h2>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--tenant-text-secondary)' }}>
            Latest actions in your organization
          </p>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-3 rounded-lg"
                style={{ backgroundColor: 'var(--tenant-surface-hover)' }}
              >
                <div 
                  className="w-2 h-2 rounded-full mt-2"
                  style={{ backgroundColor: 'var(--tenant-accent)' }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--tenant-text)' }}>
                    {activity.action}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--tenant-text-secondary)' }}>
                    {activity.user} • {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div 
          className="rounded-xl border p-6"
          style={{ backgroundColor: 'var(--tenant-surface)', borderColor: 'var(--tenant-border)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--tenant-text)' }}>
              Team Overview
            </h2>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--tenant-text-secondary)' }}>
            Quick stats about your team
          </p>
          <div className="space-y-3">
            <div 
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ backgroundColor: 'var(--tenant-surface-hover)' }}
            >
              <span style={{ color: 'var(--tenant-text-secondary)' }}>Active Users</span>
              <span className="font-semibold" style={{ color: 'var(--tenant-success)' }}>
                {users?.filter(u => u.isActive).length || 0}
              </span>
            </div>
            <div 
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ backgroundColor: 'var(--tenant-surface-hover)' }}
            >
              <span style={{ color: 'var(--tenant-text-secondary)' }}>Inactive Users</span>
              <span className="font-semibold" style={{ color: 'var(--tenant-text-muted)' }}>
                {users?.filter(u => !u.isActive).length || 0}
              </span>
            </div>
            <div 
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ backgroundColor: 'var(--tenant-surface-hover)' }}
            >
              <span style={{ color: 'var(--tenant-text-secondary)' }}>Managers</span>
              <span className="font-semibold" style={{ color: 'var(--tenant-accent)' }}>
                {users?.filter(u => u.role === 'manager' || u.role === 'admin').length || 0}
              </span>
            </div>
            <div 
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ backgroundColor: 'var(--tenant-surface-hover)' }}
            >
              <span style={{ color: 'var(--tenant-text-secondary)' }}>Staff</span>
              <span className="font-semibold" style={{ color: 'var(--color-accent)' }}>
                {users?.filter(u => u.role === 'staff').length || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div 
        className="rounded-xl border p-6"
        style={{ backgroundColor: 'var(--tenant-surface)', borderColor: 'var(--tenant-border)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5" style={{ color: 'var(--tenant-warning)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--tenant-text)' }}>
            Tenant Limits
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            className="p-4 rounded-lg"
            style={{ backgroundColor: 'var(--tenant-surface-hover)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--tenant-text-secondary)' }}>
                Business Lines
              </span>
              <Briefcase className="w-4 h-4" style={{ color: 'var(--tenant-accent)' }} />
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--tenant-text)' }}>
              {businessLines?.length || 0} / 5
            </div>
            <div className="w-full h-2 rounded-full mt-2" style={{ backgroundColor: 'var(--tenant-border)' }}>
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${Math.min(((businessLines?.length || 0) / 5) * 100, 100)}%`,
                  backgroundColor: 'var(--tenant-accent)'
                }}
              />
            </div>
          </div>
          <div 
            className="p-4 rounded-lg"
            style={{ backgroundColor: 'var(--tenant-surface-hover)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--tenant-text-secondary)' }}>
                Branches
              </span>
              <GitBranch className="w-4 h-4" style={{ color: 'var(--color-info)' }} />
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--tenant-text)' }}>
              {branches?.length || 0} / 10
            </div>
            <div className="w-full h-2 rounded-full mt-2" style={{ backgroundColor: 'var(--tenant-border)' }}>
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${Math.min(((branches?.length || 0) / 10) * 100, 100)}%`,
                  backgroundColor: 'var(--color-info)'
                }}
              />
            </div>
          </div>
          <div 
            className="p-4 rounded-lg"
            style={{ backgroundColor: 'var(--tenant-surface-hover)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--tenant-text-secondary)' }}>
                Users
              </span>
              <Users className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--tenant-text)' }}>
              {users?.length || 0} / 50
            </div>
            <div className="w-full h-2 rounded-full mt-2" style={{ backgroundColor: 'var(--tenant-border)' }}>
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${Math.min(((users?.length || 0) / 50) * 100, 100)}%`,
                  backgroundColor: 'var(--color-accent)'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
