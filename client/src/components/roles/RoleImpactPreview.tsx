import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Plus, Minus, Shield, CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useBatchRolePermissions } from '@/hooks/useRolePermissions';
import type { DPFPermission, DPFRole } from '../../../../types/dpf';

interface RoleImpactPreviewProps {
  currentRoles: DPFRole[];
  selectedRoleIds: Set<string>;
  allRoles: DPFRole[];
  allPermissions: DPFPermission[];
  currentPermissions: DPFPermission[];
}

interface PermissionDiff {
  gained: DPFPermission[];
  lost: DPFPermission[];
  unchanged: DPFPermission[];
  conflicts: PermissionConflict[];
  highRisk: DPFPermission[];
}

interface PermissionConflict {
  type: 'unbalanced' | 'contradictory' | 'missing_dependency';
  description: string;
  permissions: string[];
  severity: 'high' | 'medium' | 'low';
}

const HIGH_RISK_ACTIONS = ['DELETE', 'APPROVE', 'ADMIN', 'FINANCE_APPROVE', 'MODIFY_ALL'];

export function RoleImpactPreview({
  currentRoles,
  selectedRoleIds,
  allRoles,
  allPermissions,
  currentPermissions,
}: RoleImpactPreviewProps) {
  const selectedRoleIdsArray = Array.from(selectedRoleIds);
  const { data: selectedRolePermsData, isLoading: isLoadingSelectedPerms } = useBatchRolePermissions(selectedRoleIdsArray);

  const diff = useMemo<PermissionDiff>(() => {
    if (!selectedRolePermsData) {
      return { gained: [], lost: [], unchanged: [], conflicts: [], highRisk: [] };
    }

    const currentPermCodes = new Set(currentPermissions.map(p => p.permissionCode));
    const afterPermissions = selectedRolePermsData.permissions;
    const afterPermCodes = new Set(afterPermissions.map(p => p.permissionCode));
    
    const gained = afterPermissions.filter(p => 
      !currentPermCodes.has(p.permissionCode)
    );
    
    const lost = currentPermissions.filter(p => 
      !afterPermCodes.has(p.permissionCode)
    );
    
    const unchanged = currentPermissions.filter(p => 
      afterPermCodes.has(p.permissionCode)
    );
    
    const highRisk = gained.filter(p => 
      HIGH_RISK_ACTIONS.some(action => p.permissionCode.toUpperCase().includes(action))
    );
    
    const conflicts = detectConflicts([...afterPermCodes]);
    
    return { gained, lost, unchanged, conflicts, highRisk };
  }, [currentPermissions, selectedRolePermsData]);

  function detectConflicts(permissionCodes: string[]): PermissionConflict[] {
    const conflicts: PermissionConflict[] = [];
    const permSet = new Set(permissionCodes);
    
    if (permSet.has('roles.modify') && !permSet.has('roles.view')) {
      conflicts.push({
        type: 'missing_dependency',
        description: 'User can modify roles without viewing them - unbalanced privilege',
        permissions: ['roles.modify', 'roles.view'],
        severity: 'high',
      });
    }
    
    if (permSet.has('finance.approve') && !permSet.has('finance.view')) {
      conflicts.push({
        type: 'missing_dependency',
        description: 'User can approve finance without viewing - potential blind approval risk',
        permissions: ['finance.approve', 'finance.view'],
        severity: 'high',
      });
    }
    
    const hasReadOnly = permissionCodes.some(p => p.includes('read-only') || p.includes('view-only'));
    const hasModify = permissionCodes.some(p => p.includes('modify') || p.includes('update') || p.includes('create'));
    
    if (hasReadOnly && hasModify) {
      conflicts.push({
        type: 'contradictory',
        description: 'User has both read-only and modify permissions - contradictory privileges',
        permissions: permissionCodes.filter(p => p.includes('read-only') || p.includes('modify')),
        severity: 'medium',
      });
    }
    
    const deletePerms = permissionCodes.filter(p => p.includes('delete'));
    if (deletePerms.length > 5) {
      conflicts.push({
        type: 'unbalanced',
        description: `User has ${deletePerms.length} delete permissions - potential over-privilege`,
        permissions: deletePerms,
        severity: 'high',
      });
    }
    
    return conflicts;
  }

  const hasChanges = diff.gained.length > 0 || diff.lost.length > 0;
  const hasConflicts = diff.conflicts.length > 0;
  const hasHighRisk = diff.highRisk.length > 0;

  if (isLoadingSelectedPerms) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading permission impact...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasChanges) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            No Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No role changes detected. Select or deselect roles to see impact.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {hasConflicts && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>⚠️ Permission Conflicts Detected</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-2">
              {diff.conflicts.map((conflict, idx) => (
                <li key={idx} className="text-sm">
                  <strong className="capitalize">{conflict.type.replace('_', ' ')}:</strong>{' '}
                  {conflict.description}
                  <div className="mt-1">
                    {conflict.permissions.slice(0, 3).map(p => (
                      <Badge key={p} variant="error" className="mr-1 text-xs">
                        {p}
                      </Badge>
                    ))}
                    {conflict.permissions.length > 3 && (
                      <span className="text-xs">+{conflict.permissions.length - 3} more</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {hasHighRisk && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>High-Risk Permissions</AlertTitle>
          <AlertDescription>
            <p className="text-sm mb-2">
              This change will grant {diff.highRisk.length} high-risk permission(s):
            </p>
            <div className="flex flex-wrap gap-1">
              {diff.highRisk.slice(0, 5).map(p => (
                <Badge key={p.id} variant="warning" className="text-xs">
                  {p.permissionCode}
                </Badge>
              ))}
              {diff.highRisk.length > 5 && (
                <Badge variant="info" className="text-xs">
                  +{diff.highRisk.length - 5} more
                </Badge>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Role Impact Preview</CardTitle>
          <CardDescription>
            Review permission changes before applying
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {diff.gained.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Plus className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-green-600">
                  Gained Permissions ({diff.gained.length})
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1 pl-6">
                {diff.gained.slice(0, 10).map(p => (
                  <div key={p.id} className="text-xs text-muted-foreground">
                    + {p.permissionCode} - {p.permissionName}
                  </div>
                ))}
                {diff.gained.length > 10 && (
                  <div className="text-xs text-muted-foreground italic">
                    ... and {diff.gained.length - 10} more
                  </div>
                )}
              </div>
            </div>
          )}

          {diff.lost.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Minus className="h-4 w-4 text-red-600" />
                <span className="text-sm font-semibold text-red-600">
                  Lost Permissions ({diff.lost.length})
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1 pl-6">
                {diff.lost.slice(0, 10).map(p => (
                  <div key={p.id} className="text-xs text-muted-foreground">
                    - {p.permissionCode} - {p.permissionName}
                  </div>
                ))}
                {diff.lost.length > 10 && (
                  <div className="text-xs text-muted-foreground italic">
                    ... and {diff.lost.length - 10} more
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Total permissions after change:</span>
              <Badge variant="info">
                {diff.unchanged.length + diff.gained.length}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
