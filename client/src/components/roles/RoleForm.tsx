/**
 * RoleForm — SAP B1 Style Role Form
 *
 * Compact single-card form for creating/editing roles with screen-level authorizations.
 * Used by both system and tenant create/edit role pages.
 *
 * Authorization levels: 0=None (hidden), 1=Read Only, 2=Full
 * Module-level bulk buttons inherit to all child screens.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Shield, PenLine, FileText } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { apiClient } from '@/lib/api';
import ScreenAuthorizationGrid, { getAllModuleScreens } from './ScreenAuthorizationGrid';
import type { ModuleDefinition } from './ScreenAuthorizationGrid';
import type { RoleListItem, CreateRoleInput } from '@types/dpf';

interface RoleFormProps {
  mode: 'create' | 'edit';
  role?: RoleListItem | null;
  existingAuthorizations?: Record<string, number>;
  onSubmit: (data: CreateRoleInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  modules: ModuleDefinition[];
  isSystem?: boolean;
}

export function RoleForm({
  mode,
  role,
  existingAuthorizations = {},
  onSubmit,
  onCancel,
  isLoading = false,
  modules,
  isSystem = false,
}: RoleFormProps) {
  const { t } = useTranslation();
  const [roleCode, setRoleCode] = useState('');
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [screenAuthorizations, setScreenAuthorizations] = useState<Record<string, number>>({});
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  const generateRoleCode = useCallback(async () => {
    if (mode === 'edit') return;
    setIsGeneratingCode(true);
    try {
      const response = await apiClient.get('/tenant/roles/generate-code');
      if (response.data?.success && response.data?.data?.code) {
        setRoleCode(response.data.data.code);
      }
    } catch {
      const prefix = isSystem ? 'SYS_ROLE' : 'ROLE';
      const timestamp = Date.now().toString(36).toUpperCase();
      setRoleCode(`${prefix}_${timestamp}`);
    } finally {
      setIsGeneratingCode(false);
    }
  }, [mode, isSystem]);

  // Initialize form on mode/role change
  useEffect(() => {
    if (mode === 'edit' && role) {
      setRoleCode(role.roleCode);
      setRoleName(role.roleName);
      setDescription(role.description || '');
    } else if (mode === 'create') {
      setRoleName('');
      setDescription('');
      setScreenAuthorizations({});
      generateRoleCode();
    }
  }, [mode, role, generateRoleCode]);

  // Load existing authorizations for edit mode
  const authKey = JSON.stringify(existingAuthorizations);
  useEffect(() => {
    if (mode === 'edit') {
      setScreenAuthorizations(existingAuthorizations || {});
    }
  }, [mode, authKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAuthLevelChange = useCallback((screenCode: string, level: number) => {
    setScreenAuthorizations(prev => ({ ...prev, [screenCode]: level }));
  }, []);

  const handleModuleLevelChange = useCallback((moduleCode: string, level: number) => {
    const mod = modules.find(m => m.moduleCode === moduleCode);
    if (!mod) return;
    setScreenAuthorizations(prev => {
      const updated = { ...prev };
      getAllModuleScreens(mod).forEach(s => { updated[s.screenCode] = level; });
      return updated;
    });
  }, [modules]);

  const handleSubmit = async () => {
    if (!roleName.trim() || !roleCode.trim()) return;
    await onSubmit({
      roleCode: roleCode.toUpperCase().replace(/\s+/g, '_'),
      roleName,
      description: description || undefined,
      ...(isSystem && { isSystemRole: true }),
      screenAuthorizations,
    });
  };

  const isProtected = mode === 'edit' && role?.isProtected === 'true';
  const titlePrefix = isSystem ? t('roles.systemRolePrefix') : t('roles.rolePrefix');
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();

  return (
    <div className="space-y-4">
      {/* ═══ Page Header ═══ */}
      <div>
        <div className="flex items-center gap-3">
          {mode === 'create'
            ? <StyledIcon icon={Shield} emoji="🛡️" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
            : <StyledIcon icon={PenLine} emoji="✏️" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          }
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {mode === 'create' ? `${t('common.create')} ${titlePrefix}` : t('roles.editRoleTitle', { name: role?.roleName })}
          </h1>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* Protected role warning */}
      {isProtected && (
        <div
          className="flex items-center gap-2 p-3 rounded-lg border"
          style={{ backgroundColor: 'var(--badge-warning-bg)', borderColor: 'var(--badge-warning-border)' }}
        >
          <StyledIcon icon={Lock} emoji="🔒" className="w-4 h-4" style={{ color: 'var(--color-text-warning)' }} />
          <span className="text-sm" style={{ color: 'var(--color-text-warning)' }}>
            {t('roles.protectedWarning')}
          </span>
        </div>
      )}

      {/* ═══ Single Form Card ═══ */}
      <div
        className="rounded-lg border"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {/* Role Details Section */}
        <div className="px-5 py-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={Shield} emoji="🛡️" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('roles.roleName')} *
              </Label>
              <Input
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder={isSystem ? t('roles.systemRoleNamePlaceholder') : t('roles.roleNamePlaceholder')}
                disabled={isProtected}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <StyledIcon icon={FileText} emoji="📄" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                {t('roles.description')}
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('roles.descriptionPlaceholder')}
                disabled={isProtected}
                className="h-9"
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--color-border)' }} />

        {/* Screen Authorizations Section */}
        <div className="px-5 py-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <StyledIcon icon={Lock} emoji="🔒" className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              {t('roles.screenAuthorizations')}
            </h3>
          </div>

          <ScreenAuthorizationGrid
            modules={modules}
            screenAuthorizations={screenAuthorizations}
            onAuthLevelChange={handleAuthLevelChange}
            onModuleLevelChange={handleModuleLevelChange}
            isDisabled={isProtected}
          />
        </div>

        {/* Footer: Actions */}
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <Button
            onClick={handleSubmit}
            disabled={isLoading || isGeneratingCode || !roleName.trim() || !roleCode.trim() || isProtected}
            className="btn-primary"
          >
            {(isLoading || isGeneratingCode) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? t('roles.createRole') : t('roles.saveChanges')}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}
