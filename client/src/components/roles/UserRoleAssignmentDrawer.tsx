import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, X, Sparkles, Search, Check } from 'lucide-react';
import { RoleImpactPreview } from './RoleImpactPreview';
import { useToast } from '@/components/ui/toast';
import type { DPFRole, DPFPermission } from '@types/dpf';
import type { User } from '@/hooks/useUserRoles';

interface UserRoleAssignmentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  currentRoles: DPFRole[];
  allRoles: DPFRole[];
  allPermissions: DPFPermission[];
  currentPermissions: DPFPermission[];
  onSave: (selectedRoleIds: string[]) => Promise<void>;
  isSaving: boolean;
}

export function UserRoleAssignmentDrawer({
  open,
  onOpenChange,
  user,
  currentRoles,
  allRoles,
  allPermissions,
  currentPermissions,
  onSave,
  isSaving,
}: UserRoleAssignmentDrawerProps) {
  const { showToast } = useToast();
  // ONE ROLE PER USER - single selection instead of Set
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [agiCommand, setAgiCommand] = useState('');
  const [isProcessingAgi, setIsProcessingAgi] = useState(false);

  // Convert single role to Set for compatibility with RoleImpactPreview
  const selectedRoleIds = useMemo(() => {
    return selectedRoleId ? new Set([selectedRoleId]) : new Set<string>();
  }, [selectedRoleId]);

  useEffect(() => {
    if (open && currentRoles) {
      // ONE ROLE PER USER - take only the first role if exists
      setSelectedRoleId(currentRoles.length > 0 ? currentRoles[0].id : null);
    }
  }, [open, currentRoles]);

  const filteredRoles = useMemo(() => {
    if (!searchQuery) return allRoles;
    const query = searchQuery.toLowerCase();
    return allRoles.filter(
      r =>
        r.roleName.toLowerCase().includes(query) ||
        r.roleCode.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query)
    );
  }, [allRoles, searchQuery]);

  const hasChanges = useMemo(() => {
    const currentRoleId = currentRoles.length > 0 ? currentRoles[0].id : null;
    return selectedRoleId !== currentRoleId;
  }, [currentRoles, selectedRoleId]);

  const handleSelectRole = (roleId: string) => {
    // Toggle: if already selected, deselect; otherwise select
    setSelectedRoleId(prev => prev === roleId ? null : roleId);
  };

  const handleReset = () => {
    setSelectedRoleId(currentRoles.length > 0 ? currentRoles[0].id : null);
    setSearchQuery('');
    setAgiCommand('');
  };

  const handleSave = async () => {
    try {
      await onSave(selectedRoleId ? [selectedRoleId] : []);
      showToast('success', selectedRoleId ? 'User role updated successfully' : 'User role removed successfully');
      onOpenChange(false);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to update user role');
    }
  };

  const interpretAgiCommand = async () => {
    const trimmedCommand = agiCommand.trim();

    if (!trimmedCommand.startsWith('/agi ')) {
      showToast('warning', 'Invalid command', 'AGI commands must start with "/agi ". Example: "/agi make admin"');
      return;
    }

    const command = trimmedCommand.slice(5).trim();
    if (!command) {
      showToast('warning', 'No command', 'Please provide a command after "/agi"');
      return;
    }

    setIsProcessingAgi(true);

    try {
      const commandLower = command.toLowerCase();
      const isArabic = /[\u0600-\u06FF]/.test(command);

      // ONE ROLE PER USER - find first matching role
      let matchedRole: typeof allRoles[0] | null = null;
      let matchDescription = '';

      if ((commandLower.includes('finance') || commandLower.includes('مالي')) ||
          (isArabic && command.includes('مالي'))) {
        matchedRole = allRoles.find(r =>
          r.roleCode.toLowerCase().includes('finance') ||
          r.roleName.toLowerCase().includes('finance') ||
          r.roleNameAr?.includes('مالي')
        ) || null;
        matchDescription = 'finance role';
      } else if ((commandLower.includes('admin') || commandLower.includes('مدير')) ||
                 (isArabic && (command.includes('مدير') || command.includes('إداري')))) {
        matchedRole = allRoles.find(r =>
          r.roleCode.toLowerCase().includes('admin') ||
          r.roleName.toLowerCase().includes('admin') ||
          r.roleNameAr?.includes('مدير') ||
          r.roleNameAr?.includes('إداري')
        ) || null;
        matchDescription = 'admin role';
      } else if (commandLower.includes('remove') || commandLower.includes('clear') || commandLower.includes('none') ||
                 (isArabic && (command.includes('أزل') || command.includes('احذف')))) {
        setSelectedRoleId(null);
        showToast('info', 'AGI Interpreted', 'Role removed');
        setAgiCommand('');
        setIsProcessingAgi(false);
        return;
      } else if (commandLower.includes('readonly') || commandLower.includes('read-only') || commandLower.includes('view') ||
                 (isArabic && (command.includes('قراءة') || command.includes('عرض')))) {
        matchedRole = allRoles.find(r =>
          r.roleCode.toLowerCase().includes('view') ||
          r.roleCode.toLowerCase().includes('read') ||
          r.roleName.toLowerCase().includes('viewer') ||
          r.roleNameAr?.includes('قراءة') ||
          r.roleNameAr?.includes('عرض')
        ) || null;
        matchDescription = 'read-only role';
      } else if (commandLower.includes('manager') || commandLower.includes('supervisor') ||
                 (isArabic && (command.includes('مشرف') || command.includes('مسؤول')))) {
        matchedRole = allRoles.find(r =>
          r.roleCode.toLowerCase().includes('manager') ||
          r.roleName.toLowerCase().includes('manager') ||
          r.roleName.toLowerCase().includes('supervisor') ||
          r.roleNameAr?.includes('مشرف') ||
          r.roleNameAr?.includes('مسؤول')
        ) || null;
        matchDescription = 'manager role';
      } else {
        matchedRole = allRoles.find(r =>
          r.roleName.toLowerCase().includes(commandLower) ||
          r.roleCode.toLowerCase().includes(commandLower) ||
          r.roleNameAr?.includes(command)
        ) || null;
        matchDescription = 'matching role';
      }

      if (matchedRole) {
        setSelectedRoleId(matchedRole.id);
        showToast('info', 'AGI Interpreted', `Selected ${matchDescription}: ${matchedRole.roleName}`);
      } else {
        showToast('warning', 'No matches', 'Could not find a matching role. Try "/agi admin" or "/agi مدير"');
      }

      setAgiCommand('');
    } catch (error) {
      showToast('error', 'Failed to process AI command');
    } finally {
      setIsProcessingAgi(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Roles for {user.firstName} {user.lastName}</DialogTitle>
          <DialogDescription>
            {user.email}
            <Badge variant={user.status === 'active' ? 'success' : 'default'} className="ml-2">
              {user.status}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                <Input
                  placeholder="Search roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div 
              className="rounded-lg border p-4"
              style={{
                backgroundColor: 'var(--alert-info-bg)',
                borderColor: 'var(--alert-info-border)',
              }}
            >
              <div className="flex items-start gap-2 mb-2">
                <Sparkles 
                  className="h-4 w-4 mt-0.5"
                  style={{ color: 'var(--color-info)' }}
                />
                <div className="flex-1">
                  <p 
                    className="text-sm font-semibold mb-1"
                    style={{ color: 'var(--alert-info-text)' }}
                  >
                    AI Command Interpreter
                  </p>
                  <Input
                    placeholder='Try: "Give all finance permissions" or "Make admin"'
                    value={agiCommand}
                    onChange={(e) => setAgiCommand(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') interpretAgiCommand();
                    }}
                  />
                </div>
              </div>
              <Button
                size="sm"
                onClick={interpretAgiCommand}
                disabled={isProcessingAgi || !agiCommand.trim()}
                className="w-full"
              >
                {isProcessingAgi ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Interpret AI Command
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                Select Role ({filteredRoles.length} available)
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {selectedRoleId ? '1 role selected' : 'No role selected'}
              </p>
            </div>

            <div
              className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {filteredRoles.length === 0 ? (
                <p
                  className="text-sm text-center py-4"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  No roles found
                </p>
              ) : (
                filteredRoles.map((role) => {
                  const isSelected = selectedRoleId === role.id;
                  return (
                    <div
                      key={role.id}
                      className="flex items-start gap-3 p-3 rounded cursor-pointer transition-all border-2"
                      style={{
                        backgroundColor: isSelected ? 'var(--color-surface-hover)' : 'transparent',
                        borderColor: isSelected ? 'var(--color-primary)' : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      onClick={() => handleSelectRole(role.id)}
                    >
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0"
                        style={{
                          borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                          backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                        }}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                            {role.roleName}
                          </p>
                          {role.isProtected === 'true' && (
                            <Badge variant="warning" className="text-xs">Protected</Badge>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {role.roleCode}
                        </p>
                        {role.description && (
                          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                            {role.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <RoleImpactPreview
            currentRoles={currentRoles}
            selectedRoleIds={selectedRoleIds}
            allRoles={allRoles}
            allPermissions={allPermissions}
            currentPermissions={currentPermissions}
          />
        </div>

        <DialogFooter className="mt-6 gap-2 flex-row justify-end">
          <Button variant="outline" onClick={handleReset} disabled={isSaving || !hasChanges}>
            <X className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
