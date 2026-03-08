/**
 * System AI Configuration Page
 * Platform-wide AI settings and configuration
 */

import { useState } from 'react';
import {
  Cpu,
  Settings,
  Shield,
  Zap,
  Loader2,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/components/ui/toast';
import { useSystemAiConfig, useUpdateSystemAiConfig, useSystemAiHealth } from '@/hooks/useSystemAgi';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';

// Screen code for permission checking (SAP B1 Style)
const SCREEN_CODE = 'SYS_AI_CONFIG';

export default function SystemAiConfigPage() {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  // Permission checks (SAP B1 Style)
  const { canAccessScreen, canModifyScreen, loading: permissionsLoading } = usePermissions();
  const canAccess = canAccessScreen(SCREEN_CODE);
  const canEdit = canModifyScreen(SCREEN_CODE);
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();

  // Data fetching
  const { data: config, isLoading: configLoading, refetch: refetchConfig } = useSystemAiConfig();
  const { data: health, isLoading: healthLoading } = useSystemAiHealth();
  const updateConfig = useUpdateSystemAiConfig();

  // Local form state
  const [formState, setFormState] = useState({
    isAiEnabled: config?.isAiEnabled ?? true,
    defaultModel: config?.defaultModel ?? 'claude-sonnet-4-20250514',
    fallbackModel: config?.fallbackModel ?? 'pattern-matching',
    allowTenantCustomPrompts: config?.allowTenantCustomPrompts ?? true,
    allowVoiceCommandsGlobally: config?.allowVoiceCommandsGlobally ?? false,
    maxTokensPerRequest: config?.maxTokensPerRequest ?? 4096,
    globalRateLimitPerMinute: config?.globalRateLimitPerMinute ?? 100,
    enableDetailedLogging: config?.enableDetailedLogging ?? true,
    logRetentionDays: config?.logRetentionDays ?? 90,
  });

  // Update form state when config loads
  useState(() => {
    if (config) {
      setFormState({
        isAiEnabled: config.isAiEnabled,
        defaultModel: config.defaultModel,
        fallbackModel: config.fallbackModel,
        allowTenantCustomPrompts: config.allowTenantCustomPrompts,
        allowVoiceCommandsGlobally: config.allowVoiceCommandsGlobally,
        maxTokensPerRequest: config.maxTokensPerRequest,
        globalRateLimitPerMinute: config.globalRateLimitPerMinute,
        enableDetailedLogging: config.enableDetailedLogging,
        logRetentionDays: config.logRetentionDays,
      });
    }
  });

  const handleSave = async () => {
    try {
      await updateConfig.mutateAsync(formState);
      showToast('success', 'Settings Saved', 'AI configuration has been updated successfully.');
      setIsEditing(false);
    } catch (error) {
      showToast('error', 'Failed to save AI configuration.');
    }
  };

  const handleCancel = () => {
    if (config) {
      setFormState({
        isAiEnabled: config.isAiEnabled,
        defaultModel: config.defaultModel,
        fallbackModel: config.fallbackModel,
        allowTenantCustomPrompts: config.allowTenantCustomPrompts,
        allowVoiceCommandsGlobally: config.allowVoiceCommandsGlobally,
        maxTokensPerRequest: config.maxTokensPerRequest,
        globalRateLimitPerMinute: config.globalRateLimitPerMinute,
        enableDetailedLogging: config.enableDetailedLogging,
        logRetentionDays: config.logRetentionDays,
      });
    }
    setIsEditing(false);
  };

  // Show loading while checking permissions
  if (permissionsLoading || configLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  // Access control
  if (!canAccess) {
    return <Navigate to="/system" replace />;
  }

  const healthStatus = health?.status ?? 'DOWN';
  const healthColors = {
    HEALTHY: 'bg-green-500',
    DEGRADED: 'bg-yellow-500',
    DOWN: 'bg-red-500',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text)] flex items-center gap-3"><Cpu className="w-8 h-8 text-[var(--color-accent)]" /> AI Configuration</h1>
            <p className="text-[var(--color-text-secondary)]">
              Configure platform-wide AI settings and behavior
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchConfig()}
              disabled={configLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${configLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {canEdit && !isEditing && (
              <Button onClick={() => setIsEditing(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Edit Settings
              </Button>
            )}
          </div>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      {/* Health Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${healthColors[healthStatus]} animate-pulse`} />
              <CardTitle className="text-lg">AI Service Status</CardTitle>
            </div>
            <Badge
              variant={healthStatus === 'HEALTHY' ? 'default' : 'destructive'}
              className="flex items-center gap-1"
            >
              {healthStatus === 'HEALTHY' ? (
                <CheckCircle className="h-3 w-3" />
              ) : healthStatus === 'DEGRADED' ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              {healthStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-[var(--color-text-muted)]">Claude API:</span>
              <span className="ml-2 font-medium">
                {health?.claudeAvailable ? (
                  <span className="text-green-500">Available</span>
                ) : (
                  <span className="text-yellow-500">Limited Mode</span>
                )}
              </span>
            </div>
            <div>
              <span className="text-[var(--color-text-muted)]">Mode:</span>
              <span className="ml-2 font-medium">
                {health?.claudeAvailable ? 'Full AI' : 'Pattern Matching'}
              </span>
            </div>
            <div>
              <span className="text-[var(--color-text-muted)]">API Key:</span>
              <span className="ml-2 font-medium">
                {config?.apiKeyConfigured ? (
                  <span className="text-green-500">Configured</span>
                ) : (
                  <span className="text-red-500">Not Set</span>
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Settings */}
      <div className="grid grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-[var(--ai-coral)]" />
              General Settings
            </CardTitle>
            <CardDescription>Core AI configuration options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AI Enabled Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label>AI Enabled</Label>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Master switch for all AI features
                </p>
              </div>
              <Switch
                checked={formState.isAiEnabled}
                onCheckedChange={(v) => setFormState({ ...formState, isAiEnabled: v })}
                disabled={!isEditing}
              />
            </div>

            {/* Default Model */}
            <div className="space-y-2">
              <Label>Default Model</Label>
              <Input
                value={formState.defaultModel}
                onChange={(e) => setFormState({ ...formState, defaultModel: e.target.value })}
                disabled={!isEditing}
                placeholder="claude-sonnet-4-20250514"
              />
            </div>

            {/* Fallback Model */}
            <div className="space-y-2">
              <Label>Fallback Model</Label>
              <Input
                value={formState.fallbackModel}
                onChange={(e) => setFormState({ ...formState, fallbackModel: e.target.value })}
                disabled={!isEditing}
                placeholder="pattern-matching"
              />
              <p className="text-xs text-[var(--color-text-muted)]">
                Used when Claude API is unavailable
              </p>
            </div>

            {/* Max Tokens */}
            <div className="space-y-2">
              <Label>Max Tokens Per Request</Label>
              <Input
                type="number"
                value={formState.maxTokensPerRequest}
                onChange={(e) =>
                  setFormState({ ...formState, maxTokensPerRequest: parseInt(e.target.value) || 0 })
                }
                disabled={!isEditing}
                min={100}
                max={100000}
              />
            </div>
          </CardContent>
        </Card>

        {/* Feature Flags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[var(--ai-coral)]" />
              Feature Flags
            </CardTitle>
            <CardDescription>Enable or disable AI features platform-wide</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tenant Custom Prompts */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Tenant Custom Prompts</Label>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Let tenants customize AI behavior
                </p>
              </div>
              <Switch
                checked={formState.allowTenantCustomPrompts}
                onCheckedChange={(v) =>
                  setFormState({ ...formState, allowTenantCustomPrompts: v })
                }
                disabled={!isEditing}
              />
            </div>

            {/* Voice Commands */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Voice Commands</Label>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Enable voice input for AI assistant
                </p>
              </div>
              <Switch
                checked={formState.allowVoiceCommandsGlobally}
                onCheckedChange={(v) =>
                  setFormState({ ...formState, allowVoiceCommandsGlobally: v })
                }
                disabled={!isEditing}
              />
            </div>

            {/* Detailed Logging */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Detailed Logging</Label>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Log all AI operations for audit
                </p>
              </div>
              <Switch
                checked={formState.enableDetailedLogging}
                onCheckedChange={(v) => setFormState({ ...formState, enableDetailedLogging: v })}
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Rate Limiting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[var(--ai-coral)]" />
              Rate Limiting
            </CardTitle>
            <CardDescription>Control API usage and prevent abuse</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Global Rate Limit */}
            <div className="space-y-2">
              <Label>Global Rate Limit (per minute)</Label>
              <Input
                type="number"
                value={formState.globalRateLimitPerMinute}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    globalRateLimitPerMinute: parseInt(e.target.value) || 0,
                  })
                }
                disabled={!isEditing}
                min={0}
              />
              <p className="text-xs text-[var(--color-text-muted)]">
                0 = unlimited (not recommended)
              </p>
            </div>

            {/* Log Retention */}
            <div className="space-y-2">
              <Label>Log Retention (days)</Label>
              <Input
                type="number"
                value={formState.logRetentionDays}
                onChange={(e) =>
                  setFormState({ ...formState, logRetentionDays: parseInt(e.target.value) || 30 })
                }
                disabled={!isEditing}
                min={7}
                max={365}
              />
            </div>
          </CardContent>
        </Card>

        {/* API Key Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[var(--ai-coral)]" />
              API Configuration
            </CardTitle>
            <CardDescription>Claude API connection status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-[var(--color-surface-hover)] rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {config?.apiKeyConfigured ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span className="font-medium">
                    {config?.apiKeyConfigured
                      ? 'API Key Configured'
                      : 'API Key Not Configured'}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {config?.apiKeyConfigured
                    ? 'Claude API is ready to use. The key is securely stored in environment variables.'
                    : 'Set CLAUDE_API_KEY in your environment variables to enable full AI features.'}
                </p>
              </div>

              {!config?.apiKeyConfigured && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-sm text-[var(--color-text-warning)]">
                    Without an API key, the system will use pattern matching for basic commands.
                    Complex queries will not be available.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateConfig.isPending}>
            {updateConfig.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
