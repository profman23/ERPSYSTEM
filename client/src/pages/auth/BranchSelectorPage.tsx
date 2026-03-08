/**
 * BranchSelectorPage — First-login branch selection
 *
 * Shown once per browser session when a user has 2+ branches.
 * Full-page centered card grid (not modal — separate route).
 * On click: setActiveBranch() → navigate to /app/dashboard.
 *
 * Uses branch data embedded in the login response (user.branches)
 * to avoid extra API calls and admin-guarded endpoint issues.
 *
 * Route: /select-branch (protected, any scope)
 */

import { useNavigate } from 'react-router-dom';
import { Building2, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { setActiveBranch } from '@/hooks/useActiveBranch';

interface BranchCard {
  id: string;
  name: string;
  code: string;
  city?: string | null;
  country?: string | null;
}

export default function BranchSelectorPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Use branch data from login response (embedded in user object)
  const userBranches: BranchCard[] = user?.branches || [];

  const handleSelect = (branch: BranchCard) => {
    setActiveBranch(branch.id, branch.name);
    navigate('/app/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))',
              border: '1px solid var(--color-border)',
            }}
          >
            <Building2 className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            Select Your Branch
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            Choose the branch you want to work in for this session
          </p>
        </div>

        {/* Branch Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {userBranches.map((branch) => {
            const isDefault = branch.id === user?.branchId;
            return (
              <button
                key={branch.id}
                type="button"
                onClick={() => handleSelect(branch)}
                className="group relative flex flex-col items-start gap-2 p-5 rounded-xl border text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                }}
              >
                {/* Default badge */}
                {isDefault && (
                  <span
                    className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                      color: 'var(--color-accent)',
                    }}
                  >
                    Default
                  </span>
                )}

                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-1"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, var(--color-surface))',
                  }}
                >
                  <MapPin className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                </div>

                {/* Branch info */}
                <div>
                  <div className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                    {branch.name}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {branch.code}
                  </div>
                  {branch.city && (
                    <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {branch.city}{branch.country ? `, ${branch.country}` : ''}
                    </div>
                  )}
                </div>

                {/* Hover indicator */}
                <div
                  className="absolute inset-0 rounded-xl border-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ borderColor: 'var(--color-accent)' }}
                />
              </button>
            );
          })}
        </div>

        {userBranches.length === 0 && (
          <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
            <p>No branches found. Please contact your administrator.</p>
          </div>
        )}

        {/* Footer hint */}
        <p className="text-center text-xs mt-6" style={{ color: 'var(--color-text-muted)' }}>
          You can switch branches later from the menu. This selection lasts for the current session.
        </p>
      </div>
    </div>
  );
}
