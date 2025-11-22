import { useEffect, useState } from 'react';
import { Users, Plus, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * UsersListPage - List all users in the system
 * 
 * Phase 1: UI placeholder with empty state
 * Phase 3+: Real data from API, role filtering, permissions, multi-tenant
 */
export default function UsersListPage() {
  const [isRTL, setIsRTL] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {isRTL ? 'المستخدمين' : 'Users'}
          </h1>
          <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            {isRTL ? 'إدارة مستخدمي النظام والأدوار' : 'Manage system users and roles'}
          </p>
        </div>
        <Button className="bg-[#2563EB] hover:bg-[#1E40AF]">
          <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {isRTL ? 'إضافة مستخدم' : 'Add User'}
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="flex-1 relative">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4`} style={{ color: '#9CA3AF' }} />
              <Input
                placeholder={isRTL ? 'البحث عن المستخدمين...' : 'Search users...'}
                className={isRTL ? 'pr-10' : 'pl-10'}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
            <Button variant="outline">
              <Filter className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {isRTL ? 'تصفية' : 'Filter'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users List - Empty State */}
      <Card>
        <CardHeader>
          <CardTitle className={isRTL ? 'text-right' : 'text-left'}>
            {isRTL ? 'قائمة المستخدمين' : 'Users List'}
          </CardTitle>
          <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
            {isRTL ? 'جميع المستخدمين المسجلين في النظام' : 'All registered users in the system'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
            <Users className="w-16 h-16 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
              {isRTL ? 'لا يوجد مستخدمين' : 'No Users Yet'}
            </h3>
            <p className="mb-6">
              {isRTL ? 'سيتم تنفيذ إدارة المستخدمين في المرحلة 3' : 'User management will be implemented in Phase 3'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
