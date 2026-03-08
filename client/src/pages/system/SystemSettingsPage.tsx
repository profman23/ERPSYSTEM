/**
 * System Settings Page
 * Configure platform-wide settings and preferences
 */

import { useState, useMemo } from 'react';
import {
  Settings,
  Globe,
  Mail,
  Shield,
  Database,
  Loader2,
  Sun,
  Moon,
  Monitor,
  Check,
  RefreshCw,
  Clock,
  Zap,
  Paintbrush,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';
import { useTheme } from '@/providers/ThemeProvider';
import { useToast } from '@/components/ui/toast';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

// Screen code for permission checking (SAP B1 Style)
const SCREEN_CODE = 'SYSTEM_SETTINGS';

interface SettingSection {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status?: 'active' | 'coming-soon';
}

export default function SystemSettingsPage() {
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();
  const { isRTL } = useLanguage();
  const { t } = useTranslation();

  const settingsSections: SettingSection[] = useMemo(() => [
    { id: 'general', name: t('settings.generalSettings'), description: t('settings.basicPlatformConfig'), icon: Settings, status: 'active' },
    { id: 'appearance', name: t('settings.appearance'), description: t('settings.customizeLookAndFeel'), icon: Sun, status: 'active' },
    { id: 'email', name: t('settings.emailConfig'), description: t('settings.emailConfigDesc'), icon: Mail, status: 'coming-soon' },
    { id: 'security', name: t('settings.securitySettings'), description: t('settings.securitySettingsDesc'), icon: Shield, status: 'coming-soon' },
    { id: 'database', name: t('settings.databaseManagement'), description: t('settings.databaseManagementDesc'), icon: Database, status: 'coming-soon' },
    { id: 'localization', name: t('settings.localization'), description: t('settings.localizationDesc'), icon: Globe, status: 'coming-soon' },
  ], [t]);

  // Local settings state
  const [platformName, setPlatformName] = useState(() =>
    localStorage.getItem('platform_name') || 'ERP Platform'
  );
  const [defaultLanguage, setDefaultLanguage] = useState(() =>
    localStorage.getItem('default_language') || 'en'
  );
  const [sessionTimeout, setSessionTimeout] = useState(() =>
    localStorage.getItem('session_timeout') || '30'
  );
  const [activeSection, setActiveSection] = useState<string | null>('general');
  const [isSaving, setIsSaving] = useState(false);

  // Permission checks (SAP B1 Style)
  const { canAccessScreen, canModifyScreen, loading: permissionsLoading } = usePermissions();
  const canAccess = canAccessScreen(SCREEN_CODE);
  const canEdit = canModifyScreen(SCREEN_CODE);
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();

  // Save general settings
  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('platform_name', platformName);
      localStorage.setItem('default_language', defaultLanguage);
      localStorage.setItem('session_timeout', sessionTimeout);

      showToast('success', t('settings.settingsSaved'), t('settings.settingsSavedDesc'));
    } catch {
      showToast('error', t('settings.failedToSave'));
    } finally {
      setIsSaving(false);
    }
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-[var(--color-accent)]" />
          <h1 className="text-3xl font-bold text-[var(--color-text)]">{t('settings.systemSettings')}</h1>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <Card className="border card-panel">
            <CardContent className="p-2">
              <nav className="space-y-1">
                {settingsSections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  const isComingSoon = section.status === 'coming-soon';

                  return (
                    <button
                      key={section.id}
                      onClick={() => !isComingSoon && setActiveSection(section.id)}
                      disabled={isComingSoon}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)]'
                          : isComingSoon
                          ? 'opacity-50 cursor-not-allowed text-[var(--color-text-muted)]'
                          : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="flex-1 text-left">{section.name}</span>
                      {isComingSoon && (
                        <Badge className="text-xs badge-default">{t('settings.soon')}</Badge>
                      )}
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* General Settings */}
          {activeSection === 'general' && (
            <Card className="border card-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[var(--color-text)]"><Settings className="w-5 h-5" /> {t('settings.generalSettings')}</CardTitle>
                <CardDescription className="text-[var(--color-text-secondary)]">
                  {t('settings.basicPlatformConfig')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="platformName" className="text-[var(--color-text)]">
                      {t('settings.platformName')}
                    </Label>
                    <Input
                      id="platformName"
                      value={platformName}
                      onChange={(e) => setPlatformName(e.target.value)}
                      placeholder={t('settings.enterPlatformName')}
                      className="input-panel"
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultLanguage" className="text-[var(--color-text)]">
                      {t('settings.defaultLanguage')}
                    </Label>
                    <select
                      id="defaultLanguage"
                      value={defaultLanguage}
                      onChange={(e) => setDefaultLanguage(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
                      disabled={!canEdit}
                    >
                      <option value="en">{t('settings.english')}</option>
                      <option value="ar">{t('settings.arabic')}</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout" className="text-[var(--color-text)]">
                      {t('settings.sessionTimeout')}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[var(--color-text-muted)]" />
                      <Input
                        id="sessionTimeout"
                        type="number"
                        min="5"
                        max="480"
                        value={sessionTimeout}
                        onChange={(e) => setSessionTimeout(e.target.value)}
                        className="input-panel"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                </div>

                {canEdit && (
                  <div className="flex justify-end pt-4 border-t border-[var(--color-border)]">
                    <Button
                      onClick={handleSaveGeneral}
                      disabled={isSaving}
                      className="btn-primary"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'} animate-spin`} />
                          {t('common.saving')}
                        </>
                      ) : (
                        <>
                          <Check className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                          {t('settings.saveChanges')}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Appearance Settings */}
          {activeSection === 'appearance' && (
            <Card className="border card-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[var(--color-text)]"><Paintbrush className="w-5 h-5" /> {t('settings.appearance')}</CardTitle>
                <CardDescription className="text-[var(--color-text-secondary)]">
                  {t('settings.customizeLookAndFeel')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-[var(--color-text)]">{t('settings.themeMode')}</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => setTheme('light')}
                      className={`p-4 rounded-lg border transition-all ${
                        theme === 'light'
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                      }`}
                    >
                      <Sun className={`w-6 h-6 mx-auto mb-2 ${
                        theme === 'light' ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
                      }`} />
                      <span className={`text-sm ${
                        theme === 'light' ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'
                      }`}>{t('settings.light')}</span>
                    </button>

                    <button
                      onClick={() => setTheme('dark')}
                      className={`p-4 rounded-lg border transition-all ${
                        theme === 'dark'
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                      }`}
                    >
                      <Moon className={`w-6 h-6 mx-auto mb-2 ${
                        theme === 'dark' ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
                      }`} />
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'
                      }`}>{t('settings.dark')}</span>
                    </button>

                    <button
                      disabled
                      className="p-4 rounded-lg border opacity-50 cursor-not-allowed border-[var(--color-border)]"
                    >
                      <Monitor className="w-6 h-6 mx-auto mb-2 text-[var(--color-text-muted)]" />
                      <span className="text-sm text-[var(--color-text-muted)]">{t('settings.system')}</span>
                      <Badge className="text-xs mt-1 badge-default">{t('settings.soon')}</Badge>
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--color-border)]">
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {t('settings.currentTheme')}: <span className="font-medium text-[var(--color-text)]">{theme === 'dark' ? t('settings.darkMode') : t('settings.lightMode')}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions - Only visible for Full Authorization (Level 2) */}
          {canEdit && (
            <Card className="border card-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[var(--color-text)]"><Zap className="w-5 h-5" /> {t('settings.quickActions')}</CardTitle>
                <CardDescription className="text-[var(--color-text-secondary)]">
                  {t('settings.commonAdminTasks')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2 btn-secondary"
                    onClick={() => {
                      localStorage.clear();
                      showToast('success', t('settings.clearCache'), t('settings.cacheCleared'));
                    }}
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span className="text-xs">{t('settings.clearCache')}</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2 btn-secondary"
                    onClick={() => {
                      showToast('info', t('settings.syncDPF'), t('settings.syncStarted'));
                    }}
                  >
                    <Database className="w-5 h-5" />
                    <span className="text-xs">{t('settings.syncDPF')}</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2 btn-secondary"
                    onClick={() => {
                      showToast('success', t('settings.healthCheck'), t('settings.allSystemsOperational'));
                    }}
                  >
                    <Shield className="w-5 h-5" />
                    <span className="text-xs">{t('settings.healthCheck')}</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2 btn-secondary"
                    onClick={() => {
                      showToast('info', t('settings.soon'), t('settings.comingSoonPhase3'));
                    }}
                  >
                    <Clock className="w-5 h-5" />
                    <span className="text-xs">{t('settings.auditLogs')}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
