/**
 * Chart of Accounts Page — SAP B1 Style Layout (Responsive)
 *
 * Layout:
 *   Full-width search + filters (top bar)
 *   Desktop:  [Sidebar Drawers] [Tree Panel 50%] [Detail Panel 50%]
 *   Tablet:   [Horizontal Filters] → [Tree Panel] [Detail Panel]
 *   Mobile:   [Horizontal Filters] → [Tree Full Width] → Detail as overlay
 *
 * Route: /app/finance/chart-of-accounts
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ListTree, Plus, Folder, FileText, ChevronsUpDown, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { Button } from '@/components/ui/button';
import { SimpleSelect } from '@/components/ui/select-advanced';
import { SearchField } from '@/components/ui/SearchField';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useScopePath } from '@/hooks/useScopePath';
import { useScreenPermission } from '@/hooks/useScreenPermission';
import { useLanguage } from '@/contexts/LanguageContext';
import { useResponsive } from '@/hooks/useResponsive';
import {
  useChartOfAccountsTree,
  useChartOfAccountDetail,
  type ChartOfAccount,
} from '@/hooks/useChartOfAccounts';
import {
  AccountDetailPanel,
  type DetailPanelMode,
} from '@/components/finance/AccountDetailPanel';
import { AccountDrawerSidebar } from '@/components/finance/AccountDrawerSidebar';
import { AccountTreePanel, collectAllIds } from '@/components/finance/AccountTreePanel';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const SCREEN_CODE = 'CHART_OF_ACCOUNTS';

const POSTABLE_OPTIONS_EN = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Postable' },
  { value: 'false', label: 'Group' },
];

const POSTABLE_OPTIONS_AR = [
  { value: '', label: 'الكل' },
  { value: 'true', label: 'قابل للترحيل' },
  { value: 'false', label: 'مجموعة' },
];

// ═══════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ChartOfAccountsPage() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { getPath } = useScopePath();
  const { canAccess, canModify, isLoading: permissionsLoading } = useScreenPermission(SCREEN_CODE);
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { isMobile, isDesktop } = useResponsive();

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [postableFilter, setPostableFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Drawer state — which account type is active (empty = show all)
  const [activeDrawer, setActiveDrawer] = useState<string>('');

  // Detail panel state
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<DetailPanelMode>('idle');
  const [createDefaults, setCreateDefaults] = useState<{ parentId?: string; accountType?: string } | undefined>();

  // Mobile detail overlay state
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // Expand all accounts on initial load
  const initialExpandDone = useRef(false);

  // Tree data — filter by activeDrawer type
  const { data: treeData, isLoading, error } = useChartOfAccountsTree(
    activeDrawer ? { accountType: activeDrawer } : undefined,
  );

  // Selected account detail
  const { data: selectedAccount } = useChartOfAccountDetail(selectedAccountId ?? undefined);

  // Full tree for total count (header badge)
  const { data: fullTreeData } = useChartOfAccountsTree();

  // Auto-expand all on first data load
  useEffect(() => {
    if (treeData?.tree && !initialExpandDone.current) {
      initialExpandDone.current = true;
      setExpanded(collectAllIds(treeData.tree));
    }
  }, [treeData]);

  const postableOptions = isRTL ? POSTABLE_OPTIONS_AR : POSTABLE_OPTIONS_EN;

  // Handlers
  const handleToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    if (treeData?.tree) setExpanded(collectAllIds(treeData.tree));
  }, [treeData]);

  const handleCollapseAll = useCallback(() => setExpanded(new Set()), []);

  const handleSelectRow = useCallback((account: ChartOfAccount) => {
    setSelectedAccountId(account.id);
    setPanelMode('view');
    setCreateDefaults(undefined);
    if (isMobile) setShowMobileDetail(true);
  }, [isMobile]);

  const handleAddAccount = useCallback(() => {
    setSelectedAccountId(null);
    setPanelMode('create');
    setCreateDefaults(activeDrawer ? { accountType: activeDrawer } : undefined);
    if (isMobile) setShowMobileDetail(true);
  }, [activeDrawer, isMobile]);

  const handleDetailSuccess = useCallback((accountId?: string) => {
    if (accountId) setSelectedAccountId(accountId);
  }, []);

  const handleDrawerChange = useCallback((type: string) => {
    setActiveDrawer(type);
  }, []);

  const handleMobileBack = useCallback(() => {
    setShowMobileDetail(false);
    setPanelMode('idle');
  }, []);

  const isAllExpanded = treeData?.tree ? expanded.size >= (treeData.flatCount || 0) - 1 : false;

  // Permission loading
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  if (!canAccess) {
    return <Navigate to={getPath('dashboard')} replace />;
  }

  const panelHeight = isMobile ? 'calc(100vh - 160px)' : 'calc(100vh - 200px)';

  return (
    <div className="space-y-3">
      {/* ═══ HEADER ═══ */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StyledIcon icon={ListTree} emoji="📊" className={cn(isMobile ? 'w-6 h-6' : 'w-8 h-8')} style={{ color: 'var(--color-accent)' }} />
            <h1 className={cn(isMobile ? 'text-xl' : 'text-3xl', 'font-bold')} style={{ color: 'var(--color-text)' }}>
              {isRTL ? 'دليل الحسابات' : t('finance.chartOfAccounts', 'Chart of Accounts')}
            </h1>
            {treeData && (
              <span
                className="text-xs px-2.5 py-0.5 rounded-full border font-medium"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                {fullTreeData?.flatCount ?? treeData.flatCount}
              </span>
            )}
          </div>
          {canModify && (
            <Button size="sm" onClick={handleAddAccount}>
              <Plus className="w-4 h-4 me-1.5" />
              {isMobile ? (isRTL ? 'جديد' : 'New') : (isRTL ? 'حساب جديد' : t('finance.addAccount', 'Add Account'))}
            </Button>
          )}
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-1.5">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* ═══ SEARCH + FILTERS ═══ */}
      <div
        className={cn(
          'flex gap-2 items-center px-3 py-2.5 rounded-lg border',
          isMobile && 'flex-wrap',
        )}
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by code or name..."
          placeholderAr="بحث بالرمز أو الاسم..."
          size="sm"
          className={isMobile ? 'w-full' : 'flex-1'}
        />
        <div className={cn('flex gap-2 items-center', isMobile && 'w-full')}>
          <div className={isMobile ? 'flex-1' : 'w-36'}>
            <SimpleSelect
              value={postableFilter}
              onValueChange={setPostableFilter}
              options={postableOptions}
              placeholder={isRTL ? 'الحالة' : 'Status'}
            />
          </div>
          <button
            type="button"
            onClick={isAllExpanded ? handleCollapseAll : handleExpandAll}
            className="inline-flex items-center gap-1 px-2 h-8 rounded-md border text-xs font-medium transition-colors shrink-0"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            title={isAllExpanded ? (isRTL ? 'طي الكل' : 'Collapse All') : (isRTL ? 'توسيع الكل' : 'Expand All')}
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div
        className="rounded-lg border flex flex-col"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', height: panelHeight, overflow: 'hidden' }}
      >
        {/* Section Headers — hidden on mobile */}
        {!isMobile && (
          <div className="flex items-stretch border-b shrink-0 bg-[var(--color-surface)]" style={{ borderColor: 'var(--color-border)' }}>
            {isDesktop && (
              <div className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-3 border-e" style={{ width: '80px', borderColor: 'var(--color-border)' }}>
                <StyledIcon icon={Folder} emoji="🗂️" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-secondary)' }} />
                <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{isRTL ? 'الأدراج' : 'Drawers'}</span>
              </div>
            )}
            <div className={cn('min-w-0 flex items-center gap-1.5 px-4 py-3 border-e', isDesktop ? 'flex-[5]' : 'flex-1')} style={{ borderColor: 'var(--color-border)' }}>
              <StyledIcon icon={ListTree} emoji="📊" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-secondary)' }} />
              <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{isRTL ? 'الحسابات' : 'Accounts'}</span>
            </div>
            <div className={cn('flex items-center gap-1.5 px-4 py-3', isDesktop ? 'flex-[3] min-w-[320px]' : 'flex-1 min-w-0')}>
              <StyledIcon icon={FileText} emoji="📝" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-secondary)' }} />
              <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
                {panelMode === 'edit' ? (isRTL ? 'تعديل الحساب' : 'Edit Account')
                  : panelMode === 'create' ? (isRTL ? 'حساب جديد' : 'New Account')
                  : (isRTL ? 'التفاصيل' : 'Details')}
              </span>
            </div>
          </div>
        )}

        {/* Panels */}
        <div className="flex flex-col flex-1 min-h-0">
          {/* Sidebar: horizontal strip on mobile/tablet */}
          {!isDesktop && (
            <AccountDrawerSidebar
              activeDrawer={activeDrawer}
              onDrawerChange={handleDrawerChange}
              isRTL={isRTL}
              layout="horizontal"
            />
          )}

          <div className="flex flex-1 min-h-0">
            {/* Sidebar: vertical column on desktop only */}
            {isDesktop && (
              <AccountDrawerSidebar
                activeDrawer={activeDrawer}
                onDrawerChange={handleDrawerChange}
                isRTL={isRTL}
                layout="vertical"
              />
            )}

            {/* Tree panel */}
            <AccountTreePanel
              tree={treeData?.tree}
              isLoading={isLoading}
              error={error as Error | null}
              expanded={expanded}
              debouncedSearch={searchQuery}
              postableFilter={postableFilter}
              activeDrawer={activeDrawer}
              selectedAccountId={selectedAccountId}
              canModify={canModify}
              isRTL={isRTL}
              isMobile={isMobile}
              onToggle={handleToggle}
              onSelectRow={handleSelectRow}
              onAddAccount={handleAddAccount}
            />

            {/* Detail panel — hidden on mobile (overlay instead) */}
            {!isMobile && (
              <div className={cn(
                'flex flex-col',
                isDesktop ? 'flex-[3] min-w-[320px]' : 'flex-1 min-w-0',
              )}>
                <AccountDetailPanel
                  selectedAccount={selectedAccount ?? null}
                  mode={panelMode}
                  onModeChange={setPanelMode}
                  createDefaults={createDefaults}
                  canModify={canModify}
                  isRTL={isRTL}
                  onSuccess={handleDetailSuccess}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ MOBILE DETAIL OVERLAY ═══ */}
      {isMobile && showMobileDetail && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          {/* Overlay header with back button */}
          <div
            className="flex items-center gap-2 px-4 py-3 border-b shrink-0"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <button
              type="button"
              onClick={handleMobileBack}
              className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
              aria-label={isRTL ? 'رجوع' : 'Back'}
            >
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--color-text)' }} />
            </button>
            <span className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              {panelMode === 'edit'
                ? (isRTL ? 'تعديل الحساب' : 'Edit Account')
                : panelMode === 'create'
                  ? (isRTL ? 'حساب جديد' : 'New Account')
                  : (isRTL ? 'التفاصيل' : 'Details')}
            </span>
          </div>
          {/* Overlay body */}
          <div className="flex-1 overflow-y-auto">
            <AccountDetailPanel
              selectedAccount={selectedAccount ?? null}
              mode={panelMode}
              onModeChange={setPanelMode}
              createDefaults={createDefaults}
              canModify={canModify}
              isRTL={isRTL}
              onSuccess={handleDetailSuccess}
            />
          </div>
        </div>
      )}
    </div>
  );
}
