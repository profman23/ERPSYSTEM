import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Check, Users, Building2, Briefcase, HardDrive, Zap, Crown } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface SubscriptionPlan {
  code: string;
  name: string;
  maxUsers: number;
  maxBranches: number;
  maxBusinessLines: number;
  storageLimitGB: number;
  apiRateLimit: number;
  trialDays: number;
}

interface SubscriptionPlanSelectorProps {
  value: string;
  onChange: (planCode: string) => void;
  error?: string;
  disabled?: boolean;
}

async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const response = await apiClient.get('/tenants/meta/subscription-plans');
  return response.data.data;
}

const planIcons: Record<string, typeof Crown> = {
  trial: Zap,
  standard: Building2,
  professional: Briefcase,
  enterprise: Crown,
};

const planColors: Record<string, { bg: string; border: string; accent: string }> = {
  trial: { bg: 'var(--sys-bg)', border: 'var(--sys-border)', accent: 'var(--sys-text-secondary)' },
  standard: { bg: 'var(--badge-info-bg)', border: 'var(--badge-info-border)', accent: 'var(--color-text-info)' },
  professional: { bg: 'color-mix(in srgb, var(--sys-accent) 15%, transparent)', border: 'color-mix(in srgb, var(--sys-accent) 30%, transparent)', accent: 'var(--sys-accent)' },
  enterprise: { bg: 'var(--badge-warning-bg)', border: 'var(--badge-warning-border)', accent: 'var(--color-text-warning)' },
};

function formatLimit(value: number): string {
  if (value >= 999999) return 'Unlimited';
  return value.toLocaleString();
}

export function SubscriptionPlanSelector({
  value,
  onChange,
  error,
  disabled = false,
}: SubscriptionPlanSelectorProps) {
  const { data: plans = [], isLoading, isError } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: fetchSubscriptionPlans,
    staleTime: 1000 * 60 * 60,
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label style={{ color: 'var(--sys-text)' }}>Subscription Plan *</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="h-40 rounded-lg animate-pulse"
              style={{ backgroundColor: 'var(--sys-bg)' }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError || plans.length === 0) {
    return (
      <div className="space-y-2">
        <Label style={{ color: 'var(--sys-text)' }}>Subscription Plan *</Label>
        <div 
          className="p-4 rounded-lg border text-sm"
          style={{ 
            backgroundColor: 'var(--badge-warning-bg)', 
            borderColor: 'var(--badge-warning-border)',
            color: 'var(--color-text-warning)'
          }}
        >
          Unable to load subscription plans. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label style={{ color: 'var(--sys-text)' }}>Subscription Plan *</Label>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {plans.map(plan => {
          const isSelected = value === plan.code;
          const Icon = planIcons[plan.code] || Building2;
          const colors = planColors[plan.code] || planColors.standard;

          return (
            <button
              key={plan.code}
              type="button"
              onClick={() => !disabled && onChange(plan.code)}
              disabled={disabled}
              className={`
                relative p-4 rounded-lg border-2 text-left transition-all
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
              `}
              style={{
                backgroundColor: isSelected ? colors.bg : 'var(--sys-surface)',
                borderColor: isSelected ? colors.accent : 'var(--sys-border)',
              }}
            >
              {isSelected && (
                <div
                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: colors.accent }}
                >
                  <Check className="w-3 h-3" style={{ color: 'white' }} />
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-5 h-5" style={{ color: colors.accent }} />
                <span className="font-semibold capitalize" style={{ color: 'var(--sys-text)' }}>
                  {plan.name}
                </span>
              </div>

              {plan.trialDays > 0 && (
                <div 
                  className="text-xs mb-2 px-2 py-0.5 rounded-full inline-block"
                  style={{ backgroundColor: colors.bg, color: colors.accent }}
                >
                  {plan.trialDays} day trial
                </div>
              )}

              <div className="space-y-1.5 text-xs" style={{ color: 'var(--sys-text-secondary)' }}>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>{formatLimit(plan.maxUsers)} users</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{formatLimit(plan.maxBranches)} branches</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>{formatLimit(plan.maxBusinessLines)} business lines</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>{formatLimit(plan.storageLimitGB)} GB storage</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-sm" style={{ color: 'var(--color-text-danger)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
