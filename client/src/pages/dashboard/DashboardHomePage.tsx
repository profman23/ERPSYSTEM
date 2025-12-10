import { useEffect, useState } from 'react';
import { LayoutDashboard, Building2, Users, GitBranch } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenants, useAllBranchesNoFilter, useAllUsers, useAllBusinessLines } from '@/hooks/useHierarchy';
import { LoadingState } from '@/components/ui/loading-state';

export default function DashboardHomePage() {
  const [isRTL, setIsRTL] = useState(false);
  
  const { data: tenants, isLoading: loadingTenants } = useTenants();
  const { data: businessLines, isLoading: loadingBusinessLines } = useAllBusinessLines();
  const { data: branches, isLoading: loadingBranches } = useAllBranchesNoFilter();
  const { data: users, isLoading: loadingUsers } = useAllUsers();

  useEffect(() => {
    const checkRTL = () => {
      const dir = document.documentElement.getAttribute('dir') || 'ltr';
      const lang = document.documentElement.lang || 'en';
      setIsRTL(dir === 'rtl' || lang === 'ar');
    };

    checkRTL();

    const observer = new MutationObserver(checkRTL);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir', 'lang'],
    });

    return () => observer.disconnect();
  }, []);

  const stats = [
    {
      title: 'Total Tenants',
      titleAr: 'إجمالي العملاء',
      value: tenants?.length?.toString() || '0',
      icon: Building2,
      description: 'Active organizations',
      descriptionAr: 'المنظمات النشطة',
      colorVar: '--color-accent',
      bgVar: '--color-accent-light',
      loading: loadingTenants
    },
    {
      title: 'Business Lines',
      titleAr: 'خطوط الأعمال',
      value: businessLines?.length?.toString() || '0',
      icon: GitBranch,
      description: 'Across all tenants',
      descriptionAr: 'عبر جميع العملاء',
      colorVar: '--color-info',
      bgVar: '--badge-info-bg',
      loading: loadingBusinessLines
    },
    {
      title: 'Total Branches',
      titleAr: 'إجمالي الفروع',
      value: branches?.length?.toString() || '0',
      icon: Building2,
      description: 'Physical locations',
      descriptionAr: 'المواقع الفعلية',
      colorVar: '--color-success',
      bgVar: '--badge-success-bg',
      loading: loadingBranches
    },
    {
      title: 'Total Users',
      titleAr: 'إجمالي المستخدمين',
      value: users?.length?.toString() || '0',
      icon: Users,
      description: 'Platform users',
      descriptionAr: 'مستخدمو النظام',
      colorVar: '--color-warning',
      bgVar: '--badge-warning-bg',
      loading: loadingUsers
    }
  ];

  return (
    <div className="space-y-6">
      <div className={isRTL ? 'text-right' : 'text-left'}>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
          {isRTL ? 'لوحة التحكم' : 'Dashboard'}
        </h1>
        <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
          {isRTL ? 'مرحبًا بك في نظام ERP البيطري' : 'Welcome to Veterinary ERP System'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <CardDescription>{isRTL ? stat.titleAr : stat.title}</CardDescription>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `var(${stat.bgVar})` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: `var(${stat.colorVar})` }} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <div className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
                    {stat.loading ? (
                      <LoadingState size="sm" />
                    ) : (
                      stat.value
                    )}
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {isRTL ? stat.descriptionAr : stat.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className={isRTL ? 'text-right' : 'text-left'}>
            {isRTL ? 'النشاط الأخير' : 'Recent Activity'}
          </CardTitle>
          <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
            {isRTL ? 'سيتم تنفيذها في المرحلة 3' : 'Coming in Phase 3'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
            <LayoutDashboard className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
            <p>{isRTL ? 'لا توجد بيانات للعرض' : 'No data to display'}</p>
            <p className="text-sm mt-1">
              {isRTL ? 'هذا مكون توضيحي للواجهة فقط' : 'This is a UI placeholder component'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
