/**
 * Branch Scope Manager Component
 *
 * Manages branch-level access control for user roles
 * Allows assigning/removing branches for APP-level users
 */

import { useState, useEffect } from 'react';
import { Building2, Plus, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAllBranchesNoFilter } from '@/hooks/useHierarchy';
import { apiClient } from '@/lib/api';

interface Branch {
  id: string;
  name: string;
  code: string;
  businessLineName?: string;
}

interface AssignedBranch {
  branchId: string;
  branchName: string;
  branchCode: string;
  assignedAt: string;
}

interface BranchScopeManagerProps {
  userRoleId: string;
  userId: string;
  onUpdate?: () => void;
}

export function BranchScopeManager({ userRoleId, userId: _userId, onUpdate }: BranchScopeManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [assignedBranches, setAssignedBranches] = useState<AssignedBranch[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: allBranches, isLoading: isLoadingBranches } = useAllBranchesNoFilter();

  // Fetch assigned branches
  const fetchAssignedBranches = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get(`/api/tenant/dpf/user-role-branches/${userRoleId}`);
      setAssignedBranches(response.data.data || []);
    } catch (err: any) {
      console.error('Error fetching assigned branches:', err);
      setError(err.response?.data?.error || 'Failed to load assigned branches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedBranches();
  }, [userRoleId]);

  const handleOpenDialog = () => {
    setSelectedBranchIds(assignedBranches.map(b => b.branchId));
    setIsOpen(true);
  };

  const handleToggleBranch = (branchId: string) => {
    setSelectedBranchIds(prev =>
      prev.includes(branchId)
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      await apiClient.post('/api/tenant/dpf/user-role-branches', {
        userRoleId,
        branchIds: selectedBranchIds,
      });

      await fetchAssignedBranches();
      setIsOpen(false);
      onUpdate?.();
    } catch (err: any) {
      console.error('Error saving branches:', err);
      setError(err.response?.data?.error || 'Failed to save branch assignments');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveBranch = async (branchId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await apiClient.delete(`/api/tenant/dpf/user-role-branches/${userRoleId}/branch/${branchId}`);

      await fetchAssignedBranches();
      onUpdate?.();
    } catch (err: any) {
      console.error('Error removing branch:', err);
      setError(err.response?.data?.error || 'Failed to remove branch');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAll = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await apiClient.delete(`/api/tenant/dpf/user-role-branches/${userRoleId}`);

      await fetchAssignedBranches();
      onUpdate?.();
    } catch (err: any) {
      console.error('Error removing all branches:', err);
      setError(err.response?.data?.error || 'Failed to remove all branches');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border" style={{ backgroundColor: 'var(--sys-surface)', borderColor: 'var(--sys-border)' }}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2" style={{ color: 'var(--sys-text)' }}>
              <Building2 className="w-5 h-5" />
              Branch Access Control
            </CardTitle>
            <CardDescription style={{ color: 'var(--sys-text-secondary)' }}>
              Manage which branches this user role can access
            </CardDescription>
          </div>
          <Button
            onClick={handleOpenDialog}
            disabled={isLoading}
            style={{
              background: 'linear-gradient(135deg, var(--sys-accent), var(--sys-accent-hover))',
              color: 'var(--color-text-on-accent)'
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Manage Branches
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="error" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--sys-accent)' }} />
          </div>
        ) : assignedBranches.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--sys-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--sys-text-secondary)' }}>
              No branches assigned yet
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--sys-text-muted)' }}>
              Click "Manage Branches" to assign branches
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium" style={{ color: 'var(--sys-text)' }}>
                {assignedBranches.length} Branch{assignedBranches.length !== 1 ? 'es' : ''} Assigned
              </p>
              {assignedBranches.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveAll}
                  disabled={isLoading}
                  style={{ color: 'var(--color-danger)' }}
                >
                  Remove All
                </Button>
              )}
            </div>
            <div className="grid gap-2">
              {assignedBranches.map((branch) => (
                <div
                  key={branch.branchId}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  style={{ backgroundColor: 'var(--sys-bg)', borderColor: 'var(--sys-border)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded"
                      style={{ backgroundColor: 'var(--sys-surface)' }}
                    >
                      <Building2 className="w-4 h-4" style={{ color: 'var(--sys-accent)' }} />
                    </div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--sys-text)' }}>
                        {branch.branchName}
                      </p>
                      <code
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: 'var(--sys-surface)', color: 'var(--sys-text-secondary)' }}
                      >
                        {branch.branchCode}
                      </code>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveBranch(branch.branchId)}
                    disabled={isLoading}
                    title="Remove branch"
                  >
                    <X className="w-4 h-4" style={{ color: 'var(--sys-text-muted)' }} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="sm:max-w-2xl border"
          style={{ backgroundColor: 'var(--sys-surface)', borderColor: 'var(--sys-border)' }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: 'var(--sys-text)' }}>
              <Building2 className="w-5 h-5" />
              Assign Branches
            </DialogTitle>
            <DialogDescription style={{ color: 'var(--sys-text-secondary)' }}>
              Select which branches this user role can access. Changes will replace existing assignments.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-96 overflow-y-auto">
            {isLoadingBranches ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--sys-accent)' }} />
              </div>
            ) : !allBranches?.length ? (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--sys-text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--sys-text-secondary)' }}>
                  No branches available
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {allBranches.map((branch: Branch) => {
                  const isSelected = selectedBranchIds.includes(branch.id);

                  return (
                    <button
                      key={branch.id}
                      onClick={() => handleToggleBranch(branch.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all"
                      style={{
                        backgroundColor: isSelected
                          ? 'color-mix(in srgb, var(--sys-accent) 10%, transparent)'
                          : 'var(--sys-bg)',
                        borderColor: isSelected
                          ? 'var(--sys-accent)'
                          : 'var(--sys-border)'
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox checked={isSelected} />
                        <div
                          className="p-2 rounded"
                          style={{ backgroundColor: 'var(--sys-surface)' }}
                        >
                          <Building2 className="w-4 h-4" style={{ color: 'var(--sys-accent)' }} />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-sm" style={{ color: 'var(--sys-text)' }}>
                            {branch.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <code
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: 'var(--sys-surface)', color: 'var(--sys-text-secondary)' }}
                            >
                              {branch.code}
                            </code>
                            {branch.businessLineName && (
                              <Badge
                                className="text-xs border"
                                style={{
                                  backgroundColor: 'var(--sys-button)',
                                  borderColor: 'var(--sys-border)',
                                  color: 'var(--sys-text-secondary)'
                                }}
                              >
                                {branch.businessLineName}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5" style={{ color: 'var(--sys-accent)' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4" style={{ borderColor: 'var(--sys-border)' }}>
            <div className="flex items-center justify-between w-full">
              <p className="text-sm" style={{ color: 'var(--sys-text-secondary)' }}>
                {selectedBranchIds.length} branch{selectedBranchIds.length !== 1 ? 'es' : ''} selected
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isSaving}
                  style={{
                    backgroundColor: 'var(--sys-button)',
                    borderColor: 'var(--sys-border)',
                    color: 'var(--sys-text)'
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{
                    background: 'linear-gradient(135deg, var(--sys-accent), var(--sys-accent-hover))',
                    color: 'var(--color-text-on-accent)'
                  }}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
