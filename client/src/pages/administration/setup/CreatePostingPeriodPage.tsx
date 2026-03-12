/**
 * Create Posting Period Page
 *
 * Route: /app/administration/setup/posting-periods/create
 * Single-card form: Fiscal Year → auto-fills start/end dates.
 * Shows preview of 12 sub-periods that will be created.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, Loader2 } from 'lucide-react';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useScopePath } from '@/hooks/useScopePath';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/toast';
import { extractApiError } from '@/lib/apiError';
import { useCreatePostingPeriod } from '@/hooks/usePostingPeriods';

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export default function CreatePostingPeriodPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { getPath } = useScopePath();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { showToast } = useToast();

  const listPath = getPath('administration/setup/posting-periods');
  const createMutation = useCreatePostingPeriod();

  const currentYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(String(currentYear + 1));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const isSaving = createMutation.isPending;

  const yearNum = parseInt(fiscalYear, 10);
  const isValidYear = !isNaN(yearNum) && yearNum >= 2000 && yearNum <= 9999;

  const startDate = isValidYear ? `${yearNum}-01-01` : '';
  const endDate = isValidYear ? `${yearNum}-12-31` : '';

  // Preview sub-periods
  const previewPeriods = useMemo(() => {
    if (!isValidYear) return [];
    const months = isRTL ? MONTHS_AR : MONTHS_EN;
    return months.map((name, i) => {
      const mm = String(i + 1).padStart(2, '0');
      const lastDay = getLastDayOfMonth(yearNum, i);
      return {
        code: `FY-${yearNum}-${mm}`,
        name,
        startDate: `${yearNum}-${mm}-01`,
        endDate: `${yearNum}-${mm}-${String(lastDay).padStart(2, '0')}`,
      };
    });
  }, [yearNum, isValidYear, isRTL]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitError('');

    if (!isValidYear) {
      setErrors({ fiscalYear: isRTL ? 'السنة المالية يجب أن تكون بين 2000 و 9999' : 'Fiscal year must be between 2000 and 9999' });
      return;
    }

    try {
      await createMutation.mutateAsync({
        fiscalYear: yearNum,
        startDate,
        endDate,
      });
      showToast('success', isRTL ? 'تم إنشاء فترة الترحيل بنجاح' : 'Posting period created successfully');
      navigate(listPath);
    } catch (err) {
      const apiError = extractApiError(err);
      if (Object.keys(apiError.fieldErrors).length > 0) {
        setErrors(apiError.fieldErrors);
      }
      setSubmitError(apiError.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <StyledIcon icon={Calendar} emoji="📅" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {isRTL ? 'فترة ترحيل جديدة' : 'New Posting Period'}
          </h1>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border max-w-2xl"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {submitError && (
          <div
            className="px-5 py-3 text-sm border-b"
            style={{
              backgroundColor: 'var(--badge-danger-bg)',
              borderColor: 'var(--badge-danger-border)',
              color: 'var(--color-text-danger)',
            }}
          >
            {submitError}
          </div>
        )}

        <div className="px-5 py-5 space-y-4">
          {/* Fiscal Year */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <StyledIcon icon={Calendar} emoji="📅" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
              {isRTL ? 'السنة المالية' : 'Fiscal Year'} *
            </Label>
            <Input
              type="number"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              className="h-9 font-mono max-w-[200px]"
              min={2000}
              max={9999}
              error={!!errors.fiscalYear}
            />
            {errors.fiscalYear && (
              <p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>{errors.fiscalYear}</p>
            )}
          </div>

          {/* Auto-calculated dates */}
          {isValidYear && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Calendar} emoji="📆" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {isRTL ? 'تاريخ البداية' : 'Start Date'}
                </Label>
                <Input value={startDate} disabled className="h-9 font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={Calendar} emoji="📆" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {isRTL ? 'تاريخ النهاية' : 'End Date'}
                </Label>
                <Input value={endDate} disabled className="h-9 font-mono" />
              </div>
            </div>
          )}

          {/* Preview of 12 sub-periods */}
          {previewPeriods.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                {isRTL ? 'معاينة الفترات الفرعية (12 شهر)' : 'Sub-Periods Preview (12 Months)'}
              </Label>
              <div
                className="rounded-md border overflow-hidden text-xs"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
                      <th className="px-3 py-2 text-start font-medium" style={{ color: 'var(--color-text-secondary)' }}>#</th>
                      <th className="px-3 py-2 text-start font-medium" style={{ color: 'var(--color-text-secondary)' }}>{isRTL ? 'الرمز' : 'Code'}</th>
                      <th className="px-3 py-2 text-start font-medium" style={{ color: 'var(--color-text-secondary)' }}>{isRTL ? 'الشهر' : 'Month'}</th>
                      <th className="px-3 py-2 text-start font-medium" style={{ color: 'var(--color-text-secondary)' }}>{isRTL ? 'من' : 'From'}</th>
                      <th className="px-3 py-2 text-start font-medium" style={{ color: 'var(--color-text-secondary)' }}>{isRTL ? 'إلى' : 'To'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewPeriods.map((p, i) => (
                      <tr
                        key={p.code}
                        style={{ borderTop: '1px solid var(--color-border)' }}
                      >
                        <td className="px-3 py-1.5 font-mono" style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                        <td className="px-3 py-1.5 font-mono">{p.code}</td>
                        <td className="px-3 py-1.5">{p.name}</td>
                        <td className="px-3 py-1.5 font-mono" style={{ color: 'var(--color-text-secondary)' }}>{p.startDate}</td>
                        <td className="px-3 py-1.5 font-mono" style={{ color: 'var(--color-text-secondary)' }}>{p.endDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 flex items-center justify-end gap-3 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Button type="button" variant="ghost" onClick={() => navigate(listPath)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {isRTL ? 'إنشاء' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  );
}
