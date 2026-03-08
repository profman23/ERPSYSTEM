/**
 * FormWizardStepper
 * Vertical stepper (desktop) / Horizontal stepper (mobile)
 * 3 states: completed (green check), active (accent pulse), pending (gray)
 */

import { LucideIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepDef {
  id: string;
  title: string;
  icon: LucideIcon;
  description?: string;
}

interface FormWizardStepperProps {
  steps: StepDef[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick: (index: number) => void;
  orientation: 'vertical' | 'horizontal';
}

export function FormWizardStepper({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  orientation,
}: FormWizardStepperProps) {
  if (orientation === 'horizontal') {
    return (
      <HorizontalStepper
        steps={steps}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={onStepClick}
      />
    );
  }

  return (
    <VerticalStepper
      steps={steps}
      currentStep={currentStep}
      completedSteps={completedSteps}
      onStepClick={onStepClick}
    />
  );
}

// ─────────────────────────────────────────────
// VERTICAL STEPPER (Desktop — Left sidebar)
// ─────────────────────────────────────────────

function VerticalStepper({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}: Omit<FormWizardStepperProps, 'orientation'>) {
  return (
    <div
      className="w-[260px] flex-shrink-0 rounded-xl p-5"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <nav aria-label="Form steps">
        <ol className="space-y-0">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.has(index);
            const isActive = index === currentStep;
            const isPending = !isCompleted && !isActive;
            const isClickable = isCompleted || index <= currentStep;
            const isLast = index === steps.length - 1;
            const Icon = step.icon;

            return (
              <li key={step.id} className="relative">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(index)}
                  disabled={!isClickable}
                  className={cn(
                    'w-full flex items-start gap-4 text-left py-3 group',
                    'transition-all duration-200',
                    isClickable ? 'cursor-pointer' : 'cursor-default',
                  )}
                >
                  {/* Circle + Connector */}
                  <div className="relative flex flex-col items-center">
                    {/* Circle */}
                    <div
                      className={cn(
                        'relative w-10 h-10 rounded-full flex items-center justify-center',
                        'transition-all duration-300',
                        'flex-shrink-0',
                      )}
                      style={{
                        backgroundColor: isCompleted
                          ? 'var(--color-success)'
                          : isActive
                            ? 'var(--color-accent)'
                            : 'transparent',
                        border: isPending
                          ? '2px solid var(--color-border-strong)'
                          : '2px solid transparent',
                        boxShadow: isActive
                          ? '0 0 0 4px color-mix(in srgb, var(--color-accent) 20%, transparent)'
                          : 'none',
                      }}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : (
                        <Icon
                          className="w-5 h-5"
                          style={{
                            color: isActive
                              ? 'var(--color-text-on-accent)'
                              : 'var(--color-text-muted)',
                          }}
                        />
                      )}
                    </div>

                    {/* Connector line */}
                    {!isLast && (
                      <div
                        className="w-0.5 h-8 mt-1"
                        style={{
                          backgroundColor: isCompleted
                            ? 'var(--color-accent)'
                            : 'var(--color-border)',
                        }}
                      />
                    )}
                  </div>

                  {/* Text */}
                  <div className="pt-1.5 min-w-0">
                    <p
                      className={cn(
                        'text-sm font-medium transition-colors duration-200',
                        isClickable && !isActive && 'group-hover:opacity-80',
                      )}
                      style={{
                        color: isActive
                          ? 'var(--color-accent)'
                          : isCompleted
                            ? 'var(--color-text)'
                            : 'var(--color-text-muted)',
                      }}
                    >
                      {step.title}
                    </p>
                    {step.description && (
                      <p
                        className="text-xs mt-0.5 truncate"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {step.description}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

// ─────────────────────────────────────────────
// HORIZONTAL STEPPER (Mobile/Tablet — Top bar)
// ─────────────────────────────────────────────

function HorizontalStepper({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}: Omit<FormWizardStepperProps, 'orientation'>) {
  const activeStep = steps[currentStep];

  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Step counter */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Step {currentStep + 1} of {steps.length}
        </span>
        {activeStep && (
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--color-accent)' }}
          >
            {activeStep.title}
          </span>
        )}
      </div>

      {/* Progress dots + connectors */}
      <div className="flex items-center gap-0">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(index);
          const isActive = index === currentStep;
          const isClickable = isCompleted || index <= currentStep;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              {/* Dot */}
              <button
                type="button"
                onClick={() => isClickable && onStepClick(index)}
                disabled={!isClickable}
                className={cn(
                  'relative flex-shrink-0 w-8 h-8 rounded-full',
                  'flex items-center justify-center',
                  'transition-all duration-300',
                  isClickable ? 'cursor-pointer' : 'cursor-default',
                )}
                style={{
                  backgroundColor: isCompleted
                    ? 'var(--color-success)'
                    : isActive
                      ? 'var(--color-accent)'
                      : 'transparent',
                  border: !isCompleted && !isActive
                    ? '2px solid var(--color-border-strong)'
                    : '2px solid transparent',
                  boxShadow: isActive
                    ? '0 0 0 3px color-mix(in srgb, var(--color-accent) 20%, transparent)'
                    : 'none',
                }}
                aria-label={`${step.title}${isCompleted ? ' (completed)' : isActive ? ' (current)' : ''}`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <span
                    className="text-xs font-bold"
                    style={{
                      color: isActive
                        ? 'var(--color-text-on-accent)'
                        : 'var(--color-text-muted)',
                    }}
                  >
                    {index + 1}
                  </span>
                )}
              </button>

              {/* Connector */}
              {!isLast && (
                <div
                  className="flex-1 h-0.5 mx-1"
                  style={{
                    backgroundColor: isCompleted
                      ? 'var(--color-accent)'
                      : 'var(--color-border)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
