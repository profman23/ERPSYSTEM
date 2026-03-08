import { LayoutDashboard, Building2, Users, GitBranch, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenants, useAllBranchesNoFilter, useAllUsers, useAllBusinessLines } from '@/hooks/useHierarchy';
import { LoadingState } from '@/components/ui/loading-state';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export default function DashboardHomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isSystemUser = user?.accessScope === 'system';

  const { data: tenants, isLoading: loadingTenants } = useTenants(isSystemUser);
  const { data: businessLines, isLoading: loadingBusinessLines } = useAllBusinessLines();
  const { data: branches, isLoading: loadingBranches } = useAllBranchesNoFilter();
  const { data: users, isLoading: loadingUsers } = useAllUsers();

  const stats = [
    {
      key: 'tenants',
      title: t('dashboard.totalTenants'),
      value: tenants?.length?.toString() || '0',
      icon: Building2,
      description: t('dashboard.activeOrganizations'),
      colorVar: '--color-accent',
      bgVar: '--color-accent-light',
      loading: loadingTenants
    },
    {
      key: 'businessLines',
      title: t('dashboard.businessLines'),
      value: businessLines?.length?.toString() || '0',
      icon: GitBranch,
      description: t('dashboard.acrossAllTenants'),
      colorVar: '--color-info',
      bgVar: '--badge-info-bg',
      loading: loadingBusinessLines
    },
    {
      key: 'branches',
      title: t('dashboard.totalBranches'),
      value: branches?.length?.toString() || '0',
      icon: Building2,
      description: t('dashboard.physicalLocations'),
      colorVar: '--color-success',
      bgVar: '--badge-success-bg',
      loading: loadingBranches
    },
    {
      key: 'users',
      title: t('dashboard.totalUsers'),
      value: users?.length?.toString() || '0',
      icon: Users,
      description: t('dashboard.platformUsers'),
      colorVar: '--color-warning',
      bgVar: '--badge-warning-bg',
      loading: loadingUsers
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-8 h-8 text-[var(--color-accent)]" />
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
          {t('dashboard.title')}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.key} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>{stat.title}</CardDescription>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `var(${stat.bgVar})` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: `var(${stat.colorVar})` }} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div>
                  <div className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
                    {stat.loading ? (
                      <LoadingState size="sm" />
                    ) : (
                      stat.value
                    )}
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {stat.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('dashboard.recentActivity')}
          </CardTitle>
          <CardDescription>
            {t('dashboard.comingSoon')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
            <LayoutDashboard className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
            <p>{t('dashboard.noDataToDisplay')}</p>
            <p className="text-sm mt-1">
              {t('dashboard.uiPlaceholder')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
