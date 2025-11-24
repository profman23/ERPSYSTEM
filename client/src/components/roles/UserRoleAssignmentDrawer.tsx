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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, X, Sparkles, Search } from 'lucide-react';
import { RoleImpactPreview } from './RoleImpactPreview';
import { useToast } from '@/hooks/use-toast';
import type { DPFRole, DPFPermission } from '../../../../types/dpf';
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
  const { toast } = useToast();
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [agiCommand, setAgiCommand] = useState('');
  const [isProcessingAgi, setIsProcessingAgi] = useState(false);

  useEffect(() => {
    if (open && currentRoles) {
      setSelectedRoleIds(new Set(currentRoles.map(r => r.id)));
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
    const currentIds = new Set(currentRoles.map(r => r.id));
    if (currentIds.size !== selectedRoleIds.size) return true;
    for (const id of selectedRoleIds) {
      if (!currentIds.has(id)) return true;
    }
    return false;
  }, [currentRoles, selectedRoleIds]);

  const handleToggleRole = (roleId: string) => {
    const newSet = new Set(selectedRoleIds);
    if (newSet.has(roleId)) {
      newSet.delete(roleId);
    } else {
      newSet.add(roleId);
    }
    setSelectedRoleIds(newSet);
  };

  const handleReset = () => {
    setSelectedRoleIds(new Set(currentRoles.map(r => r.id)));
    setSearchQuery('');
    setAgiCommand('');
  };

  const handleSave = async () => {
    try {
      await onSave(Array.from(selectedRoleIds));
      toast({
        title: 'Success',
        description: 'User roles updated successfully',
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update user roles',
        variant: 'destructive',
      });
    }
  };

  const interpretAgiCommand = async () => {
    const trimmedCommand = agiCommand.trim();
    
    if (!trimmedCommand.startsWith('/agi ')) {
      toast({
        title: 'Invalid command',
        description: 'AGI commands must start with "/agi ". Example: "/agi make admin"',
        variant: 'destructive',
      });
      return;
    }

    const command = trimmedCommand.slice(5).trim();
    if (!command) {
      toast({
        title: 'No command',
        description: 'Please provide a command after "/agi"',
      });
      return;
    }

    setIsProcessingAgi(true);
    
    try {
      const commandLower = command.toLowerCase();
      const newSelection = new Set(selectedRoleIds);

      const isArabic = /[\u0600-\u06FF]/.test(command);
      
      if ((commandLower.includes('all') && commandLower.includes('finance')) || 
          (isArabic && command.includes('كل') && command.includes('مالي'))) {
        const financeRoles = allRoles.filter(r =>
          r.roleCode.toLowerCase().includes('finance') ||
          r.roleName.toLowerCase().includes('finance') ||
          r.roleNameAr?.includes('مالي')
        );
        financeRoles.forEach(r => newSelection.add(r.id));
        toast({
          title: 'AGI Interpreted',
          description: `Added ${financeRoles.length} finance-related roles`,
        });
      } else if ((commandLower.includes('all') && commandLower.includes('admin')) ||
                 (isArabic && (command.includes('كل') || command.includes('جميع')) && (command.includes('مدير') || command.includes('إداري')))) {
        const adminRoles = allRoles.filter(r =>
          r.roleCode.toLowerCase().includes('admin') ||
          r.roleName.toLowerCase().includes('admin') ||
          r.roleNameAr?.includes('مدير') ||
          r.roleNameAr?.includes('إداري')
        );
        adminRoles.forEach(r => newSelection.add(r.id));
        toast({
          title: 'AGI Interpreted',
          description: `Added ${adminRoles.length} admin-related roles`,
        });
      } else if (commandLower.includes('remove all') || commandLower.includes('clear') ||
                 (isArabic && (command.includes('أزل') || command.includes('احذف')) && (command.includes('كل') || command.includes('جميع')))) {
        newSelection.clear();
        toast({
          title: 'AGI Interpreted',
          description: 'Removed all roles',
        });
      } else if (commandLower.includes('readonly') || commandLower.includes('read-only') || commandLower.includes('view only') ||
                 (isArabic && (command.includes('قراءة فقط') || command.includes('عرض فقط')))) {
        const viewOnlyRoles = allRoles.filter(r =>
          r.roleCode.toLowerCase().includes('view') ||
          r.roleCode.toLowerCase().includes('read') ||
          r.roleName.toLowerCase().includes('viewer') ||
          r.roleNameAr?.includes('قراءة') ||
          r.roleNameAr?.includes('عرض')
        );
        viewOnlyRoles.forEach(r => newSelection.add(r.id));
        toast({
          title: 'AGI Interpreted',
          description: `Added ${viewOnlyRoles.length} read-only roles`,
        });
      } else if (commandLower.includes('manager') || commandLower.includes('supervisor') ||
                 (isArabic && (command.includes('مشرف') || command.includes('مسؤول')))) {
        const managerRoles = allRoles.filter(r =>
          r.roleCode.toLowerCase().includes('manager') ||
          r.roleName.toLowerCase().includes('manager') ||
          r.roleName.toLowerCase().includes('supervisor') ||
          r.roleNameAr?.includes('مشرف') ||
          r.roleNameAr?.includes('مسؤول')
        );
        managerRoles.forEach(r => newSelection.add(r.id));
        toast({
          title: 'AGI Interpreted',
          description: `Added ${managerRoles.length} manager/supervisor roles`,
        });
      } else {
        const matchedRoles = allRoles.filter(r =>
          r.roleName.toLowerCase().includes(commandLower) ||
          r.roleCode.toLowerCase().includes(commandLower) ||
          r.roleNameAr?.includes(command)
        );
        if (matchedRoles.length > 0) {
          matchedRoles.forEach(r => newSelection.add(r.id));
          toast({
            title: 'AGI Interpreted',
            description: `Added ${matchedRoles.length} matching roles`,
          });
        } else {
          toast({
            title: 'No matches',
            description: 'Could not interpret command. Try "/agi all admin" or "/agi كل المديرين"',
          });
        }
      }

      setSelectedRoleIds(newSelection);
      setAgiCommand('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process AI command',
      });
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="rounded-lg border p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    AI Command Interpreter
                  </p>
                  <Input
                    placeholder='Try: "Give all finance permissions" or "Make admin"'
                    value={agiCommand}
                    onChange={(e) => setAgiCommand(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') interpretAgiCommand();
                    }}
                    className="bg-white"
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
              <p className="text-sm font-semibold">
                Available Roles ({filteredRoles.length})
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedRoleIds.size} selected
              </p>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
              {filteredRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No roles found
                </p>
              ) : (
                filteredRoles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleToggleRole(role.id)}
                  >
                    <Checkbox
                      checked={selectedRoleIds.has(role.id)}
                      onCheckedChange={() => handleToggleRole(role.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{role.roleName}</p>
                        {role.isProtected === 'true' && (
                          <Badge variant="warning" className="text-xs">Protected</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {role.roleCode}
                      </p>
                      {role.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {role.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))
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
