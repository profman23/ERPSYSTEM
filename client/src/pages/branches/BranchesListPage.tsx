import { useEffect, useState } from 'react';
import { GitBranch, Plus, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * BranchesListPage - List all branches across all tenants
 * 
 * Phase 1: UI placeholder with empty state
 * Phase 3+: Real data from API, multi-tenant filtering, pagination
 */
export default function BranchesListPage() {
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
            {isRTL ? 'الفروع' : 'Branches'}
          </h1>
          <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            {isRTL ? 'إدارة الفروع عبر جميع المنظمات' : 'Manage branches across all organizations'}
          </p>
        </div>
        <Button className="bg-[#2563EB] hover:bg-[#1E40AF]">
          <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {isRTL ? 'إضافة فرع' : 'Add Branch'}
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4`} style={{ color: '#9CA3AF' }} />
            <Input
              placeholder={isRTL ? 'البحث عن الفروع...' : 'Search branches...'}
              className={isRTL ? 'pr-10' : 'pl-10'}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Branches List - Empty State */}
      <Card>
        <CardHeader>
          <CardTitle className={isRTL ? 'text-right' : 'text-left'}>
            {isRTL ? 'قائمة الفروع' : 'Branches List'}
          </CardTitle>
          <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
            {isRTL ? 'جميع الفروع المسجلة' : 'All registered branches'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
            <GitBranch className="w-16 h-16 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
              {isRTL ? 'لا توجد فروع' : 'No Branches Yet'}
            </h3>
            <p className="mb-6">
              {isRTL ? 'سيتم تنفيذ إدارة الفروع في المرحلة 3' : 'Branch management will be implemented in Phase 3'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
