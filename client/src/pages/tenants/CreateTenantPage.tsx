import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Globe, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * CreateTenantPage - Form to create a new tenant organization
 * 
 * Phase 1: UI placeholder form (no submission logic)
 * Phase 3+: Real form validation, API integration, Zod schemas
 */
export default function CreateTenantPage() {
  const [isRTL, setIsRTL] = useState(false);
  const navigate = useNavigate();

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // UI ONLY - No API call
    console.log('Form submitted (UI only - no backend)');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page Header */}
      <div className={isRTL ? 'text-right' : 'text-left'}>
        <Link
          to="/tenants"
          className={`inline-flex items-center gap-2 text-sm mb-4 hover:text-[#2563EB] transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          {isRTL ? 'العودة إلى القائمة' : 'Back to Tenants'}
        </Link>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
          {isRTL ? 'إضافة عميل جديد' : 'Create New Tenant'}
        </h1>
        <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
          {isRTL ? 'إضافة منظمة جديدة إلى النظام' : 'Add a new organization to the system'}
        </p>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className={isRTL ? 'text-right' : 'text-left'}>
            {isRTL ? 'معلومات المنظمة' : 'Organization Information'}
          </CardTitle>
          <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
            {isRTL ? 'أدخل تفاصيل المنظمة الأساسية' : 'Enter the basic organization details'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tenant Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className={isRTL ? 'text-right' : 'text-left'}>
                {isRTL ? 'اسم المنظمة' : 'Organization Name'}
              </Label>
              <div className="relative">
                <Building2 className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4`} style={{ color: '#9CA3AF' }} />
                <Input
                  id="name"
                  placeholder={isRTL ? 'أدخل اسم المنظمة' : 'Enter organization name'}
                  className={isRTL ? 'pr-10' : 'pl-10'}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
            </div>

            {/* Tenant Code */}
            <div className="space-y-2">
              <Label htmlFor="code" className={isRTL ? 'text-right' : 'text-left'}>
                {isRTL ? 'رمز المنظمة' : 'Organization Code'}
              </Label>
              <Input
                id="code"
                placeholder={isRTL ? 'مثال: CLINIC001' : 'e.g., CLINIC001'}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>

            {/* Country */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="country" className={isRTL ? 'text-right' : 'text-left'}>
                  {isRTL ? 'الدولة' : 'Country'}
                </Label>
                <div className="relative">
                  <Globe className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4`} style={{ color: '#9CA3AF' }} />
                  <Input
                    id="country"
                    placeholder={isRTL ? 'اختر الدولة' : 'Select country'}
                    className={isRTL ? 'pr-10' : 'pl-10'}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone" className={isRTL ? 'text-right' : 'text-left'}>
                  {isRTL ? 'المنطقة الزمنية' : 'Timezone'}
                </Label>
                <div className="relative">
                  <MapPin className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4`} style={{ color: '#9CA3AF' }} />
                  <Input
                    id="timezone"
                    placeholder={isRTL ? 'مثال: Asia/Dubai' : 'e.g., UTC, Asia/Dubai'}
                    className={isRTL ? 'pr-10' : 'pl-10'}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className={`flex gap-4 pt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Button type="submit" className="bg-[#2563EB] hover:bg-[#1E40AF]">
                {isRTL ? 'إنشاء المنظمة' : 'Create Tenant'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/tenants')}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>

            {/* Phase Info */}
            <div className="text-sm p-4 rounded-lg" style={{ backgroundColor: '#F3F4F6', color: 'var(--color-text-secondary)' }}>
              <p className={isRTL ? 'text-right' : 'text-left'}>
                {isRTL 
                  ? '📝 المرحلة 1: واجهة فقط - لا يوجد منطق خلفي حتى الآن' 
                  : '📝 Phase 1: UI Only - No backend logic yet'}
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
