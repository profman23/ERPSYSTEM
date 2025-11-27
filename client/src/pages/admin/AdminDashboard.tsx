import { Building2, Users, GitBranch, Briefcase, TrendingUp, Calendar, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAllBusinessLines, useAllBranchesNoFilter, useAllUsers } from '@/hooks/useHierarchy';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: businessLines, isLoading: loadingBusinessLines } = useAllBusinessLines();
  const { data: branches, isLoading: loadingBranches } = useAllBranchesNoFilter();
  const { data: users, isLoading: loadingUsers } = useAllUsers();

  const stats = [
    {
      title: 'Business Lines',
      value: businessLines?.length?.toString() || '0',
      icon: Briefcase,
      description: 'Active business units',
      color: '#2563EB',
      loading: loadingBusinessLines
    },
    {
      title: 'Branches',
      value: branches?.length?.toString() || '0',
      icon: GitBranch,
      description: 'Physical locations',
      color: '#0EA5E9',
      loading: loadingBranches
    },
    {
      title: 'Users',
      value: users?.length?.toString() || '0',
      icon: Users,
      description: 'Team members',
      color: '#14B8A6',
      loading: loadingUsers
    },
    {
      title: 'Growth',
      value: '+12%',
      icon: TrendingUp,
      description: 'This month',
      color: '#22C55E',
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
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
          Admin Dashboard
        </h1>
        <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
          Welcome back! Here's an overview of your organization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>{stat.title}</CardDescription>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${stat.color}15` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: stat.color }} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
                  {stat.loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: stat.color }} />
                  ) : (
                    stat.value
                  )}
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest actions in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      {activity.action}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {activity.user} • {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-500" />
              Team Overview
            </CardTitle>
            <CardDescription>
              Quick stats about your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <span style={{ color: 'var(--color-text-secondary)' }}>Active Users</span>
                <span className="font-semibold text-green-600">
                  {users?.filter(u => u.isActive).length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <span style={{ color: 'var(--color-text-secondary)' }}>Inactive Users</span>
                <span className="font-semibold text-gray-500">
                  {users?.filter(u => !u.isActive).length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <span style={{ color: 'var(--color-text-secondary)' }}>Managers</span>
                <span className="font-semibold text-blue-600">
                  {users?.filter(u => u.role === 'manager' || u.role === 'admin').length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <span style={{ color: 'var(--color-text-secondary)' }}>Staff</span>
                <span className="font-semibold text-teal-600">
                  {users?.filter(u => u.role === 'staff').length || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
