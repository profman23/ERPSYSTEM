/**
 * System DPF Manager Page
 * Dynamic Permission Fabric - Module, Screen & Action Management
 */

import { useState, useMemo } from 'react';
import { Database, Layers, Shield, Loader2, Search, ChevronRight, ChevronDown, Monitor, Zap } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { StatsSkeleton, ListSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useTranslation } from 'react-i18next';

// Screen code for permission checking (SAP B1 Style)
const SCREEN_CODE = 'SYSTEM_DPF_MANAGER';

interface DPFModule {
  id: string;
  tenantId: string;
  moduleCode: string;
  moduleName: string;
  moduleNameAr?: string;
  description?: string;
  descriptionAr?: string;
  category?: string;
  moduleLevel: string;
  icon?: string;
  route?: string;
  sortOrder: string;
  isActive: string;
  isSystemModule: string;
  requiredAgiLevel?: string;
  metadata?: unknown;
  createdAt: string;
  updatedAt: string;
}

interface DPFScreen {
  id: string;
  tenantId: string;
  moduleId: string;
  screenCode: string;
  screenName: string;
  screenNameAr?: string;
  description?: string;
  descriptionAr?: string;
  route?: string;
  icon?: string;
  sortOrder: string;
  isActive: string;
  isSystemScreen: string;
  requiredAgiLevel?: string;
  metadata?: unknown;
  createdAt: string;
  updatedAt: string;
}

export default function SystemDPFPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const { t } = useTranslation();

  // Permission checks (SAP B1 Style)
  const { canAccessScreen, loading: permissionsLoading } = usePermissions();
  const canAccess = canAccessScreen(SCREEN_CODE);

  // Fetch DPF modules - only when permissions are loaded and access is granted
  const { data: modulesData, isLoading: modulesLoading, error: modulesError } = useQuery({
    queryKey: ['dpf-modules'],
    queryFn: async () => {
      const response = await apiClient.get('/system/dpf/modules');
      return response.data;
    },
    enabled: !permissionsLoading && canAccess,
  });

  // Fetch DPF screens - only when permissions are loaded and access is granted
  const { data: screensData, isLoading: screensLoading, error: screensError } = useQuery({
    queryKey: ['dpf-screens'],
    queryFn: async () => {
      const response = await apiClient.get('/system/dpf/screens');
      return response.data;
    },
    enabled: !permissionsLoading && canAccess,
  });

  const modules: DPFModule[] = modulesData?.data || [];
  const screens: DPFScreen[] = screensData?.data || [];

  // Group screens by module
  const screensByModule = useMemo(() => {
    const map: Record<string, DPFScreen[]> = {};
    screens.forEach(screen => {
      if (!map[screen.moduleId]) {
        map[screen.moduleId] = [];
      }
      map[screen.moduleId].push(screen);
    });
    return map;
  }, [screens]);

  // Filter modules by search
  const filteredModules = useMemo(() => {
    if (!searchQuery) return modules;
    const query = searchQuery.toLowerCase();
    return modules.filter(
      mod =>
        mod.moduleName.toLowerCase().includes(query) ||
        mod.moduleCode.toLowerCase().includes(query) ||
        mod.description?.toLowerCase().includes(query)
    );
  }, [modules, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    totalModules: modules.length,
    totalScreens: screens.length,
    activeModules: modules.filter(m => m.isActive === 'true').length,
    activeScreens: screens.filter(s => s.isActive === 'true').length,
  }), [modules, screens]);

  // Toggle module expansion
  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  // Show loading while checking permissions
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  // Redirect if no access (Level 0)
  if (!canAccess) {
    return <Navigate to="/system/dashboard" replace />;
  }

  const isLoading = modulesLoading || screensLoading;
  const error = modulesError || screensError;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-[var(--color-accent)]" />
          <h1 className="text-3xl font-bold text-[var(--color-text)]">{t('dpf.title')}</h1>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <StatsSkeleton cards={4} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border card-panel">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[var(--color-accent-light)]">
                  <Layers className="w-6 h-6 text-[var(--color-accent)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--color-text)]">{stats.totalModules}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('dpf.totalModules')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border card-panel">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[var(--badge-info-bg)]">
                  <Monitor className="w-6 h-6 text-[var(--color-info)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--color-text)]">{stats.totalScreens}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('dpf.totalScreens')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border card-panel">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[var(--badge-success-bg)]">
                  <Zap className="w-6 h-6 text-[var(--color-success)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--color-text)]">{stats.activeModules}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('dpf.activeModules')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border card-panel">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[var(--badge-warning-bg)]">
                  <Shield className="w-6 h-6 text-[var(--color-warning)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--color-text)]">{stats.activeScreens}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('dpf.activeScreens')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <Card className="border card-panel">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <Input
              placeholder={t('dpf.searchModules')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 input-panel"
            />
          </div>
        </CardContent>
      </Card>

      {/* Modules List */}
      <Card className="border card-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--color-text)]"><Database className="w-5 h-5" /> {t('dpf.permissionModules')}</CardTitle>
          <CardDescription className="text-[var(--color-text-secondary)]">
            {t('dpf.registeredModules')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ListSkeleton items={6} showAvatar showAction={false} />
          ) : error ? (
            <ErrorState
              title={t('dpf.errorLoadingDPF')}
              message={t('dpf.failedToLoadDPF')}
              retryAction={() => window.location.reload()}
              variant="inline"
            />
          ) : filteredModules.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-text-muted)]">
              {searchQuery ? t('dpf.noModulesMatch') : t('dpf.noModulesFound')}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredModules.map((module) => {
                const moduleScreens = screensByModule[module.id] || [];
                const isExpanded = expandedModules.has(module.id);

                return (
                  <div key={module.id} className="border rounded-lg border-[var(--color-border)] overflow-hidden">
                    {/* Module Header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer transition-colors bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)]"
                      onClick={() => toggleModule(module.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold bg-[var(--color-accent)] text-[var(--color-text-on-accent)]">
                          {module.moduleName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-[var(--color-text)]">{module.moduleName}</p>
                            <Badge className="text-xs" variant={module.moduleLevel === 'SYSTEM' ? 'default' : 'secondary'}>
                              {module.moduleLevel}
                            </Badge>
                          </div>
                          <p className="text-sm text-[var(--color-text-muted)]">
                            {module.moduleCode} • {moduleScreens.length} screen{moduleScreens.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={module.isActive === 'true' ? 'badge-success' : 'badge-default'}>
                          {module.isActive === 'true' ? t('common.active') : t('common.inactive')}
                        </Badge>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-[var(--color-text-muted)]" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)]" />
                        )}
                      </div>
                    </div>

                    {/* Screens List (Expanded) */}
                    {isExpanded && moduleScreens.length > 0 && (
                      <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
                        {moduleScreens.map((screen, idx) => (
                          <div
                            key={screen.id}
                            className={`flex items-center justify-between px-4 py-3 ${
                              idx !== moduleScreens.length - 1 ? 'border-b border-[var(--color-border)]' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3 pl-14">
                              <Monitor className="w-4 h-4 text-[var(--color-text-muted)]" />
                              <div>
                                <p className="text-sm font-medium text-[var(--color-text)]">{screen.screenName}</p>
                                <p className="text-xs text-[var(--color-text-muted)]">
                                  {screen.screenCode}
                                  {screen.route && ` • ${screen.route}`}
                                </p>
                              </div>
                            </div>
                            <Badge className={screen.isActive === 'true' ? 'badge-success' : 'badge-default'} variant="outline">
                              {screen.isActive === 'true' ? t('common.active') : t('common.inactive')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Empty Screens Message */}
                    {isExpanded && moduleScreens.length === 0 && (
                      <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
                        {t('dpf.noScreensRegistered')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
