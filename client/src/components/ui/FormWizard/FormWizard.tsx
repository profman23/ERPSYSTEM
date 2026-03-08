/**
 * FormWizard — Multi-Step Wizard Form Layout
 *
 * Desktop: Side stepper (left) + content card (right)
 * Mobile:  Top stepper + content below
 *
 * Features:
 * - Step-by-step navigation with validation
 * - Slide transitions between steps
 * - Click completed steps to go back
 * - Generic — works for any create/edit page
 */

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  Children,
  ReactNode,
  ReactElement,
  isValidElement,
} from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useResponsive } from '@/hooks/useResponsive';
import { FormWizardStepper, StepDef } from './FormWizardStepper';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type { StepDef };

export interface FormWizardProps {
  /** Step definitions (id, title, icon, description) */
  steps: StepDef[];
  /** Called when user clicks Submit on the last step */
  onSubmit: () => void;
  /** Is the form currently submitting? */
  isSubmitting?: boolean;
  /** Label for the final submit button (default: "Submit") */
  submitLabel?: string;
  /** Route to navigate on Cancel */
  cancelHref?: string;
  /** Each child = one step's content. Order must match steps array. */
  children: ReactNode;
  /** Optional className on outer wrapper */
  className?: string;
  /** Submit error message to show */
  submitError?: string | null;
  /** Success message to show */
  successMessage?: ReactNode;
}

export interface FormWizardStepProps {
  /** Validate this step. Return true if valid. Called on "Next" click. */
  onValidate?: () => boolean;
  children: ReactNode;
}

/**
 * Wrap each step's content in this component.
 * The `onValidate` prop is called before moving to the next step.
 */
export function FormWizardStep({ children }: FormWizardStepProps) {
  return <>{children}</>;
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export function FormWizard({
  steps,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Submit',
  cancelHref,
  children,
  className,
  submitError,
  successMessage,
}: FormWizardProps) {
  const { isDesktop } = useResponsive();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [isAnimating, setIsAnimating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const isRtl = document.documentElement.dir === 'rtl';
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Extract step children
  const stepElements = Children.toArray(children).filter(
    (child): child is ReactElement<FormWizardStepProps> =>
      isValidElement(child)
  );

  // Get the validate function from the current step's props
  const getCurrentStepValidator = useCallback((): (() => boolean) | undefined => {
    const el = stepElements[currentStep];
    if (el && el.props.onValidate) {
      return el.props.onValidate;
    }
    return undefined;
  }, [stepElements, currentStep]);

  // Navigate to a step with animation
  const goToStep = useCallback(
    (targetStep: number) => {
      if (targetStep === currentStep || isAnimating) return;
      setDirection(targetStep > currentStep ? 'forward' : 'back');
      setIsAnimating(true);
      // Small delay to trigger CSS transition
      requestAnimationFrame(() => {
        setCurrentStep(targetStep);
        // Scroll content area to top
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      });
    },
    [currentStep, isAnimating]
  );

  // Handle "Next" button
  const handleNext = useCallback(() => {
    const validator = getCurrentStepValidator();
    if (validator && !validator()) {
      return; // Validation failed, stay on current step
    }

    // Mark current step as completed
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(currentStep);
      return next;
    });

    if (isLastStep) {
      onSubmit();
    } else {
      goToStep(currentStep + 1);
    }
  }, [currentStep, isLastStep, onSubmit, goToStep, getCurrentStepValidator]);

  // Handle "Back" button
  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, isFirstStep, goToStep]);

  // Handle stepper click (can only go to completed or current steps)
  const handleStepClick = useCallback(
    (index: number) => {
      if (index <= currentStep || completedSteps.has(index)) {
        goToStep(index);
      }
    },
    [currentStep, completedSteps, goToStep]
  );

  // End animation after transition
  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  // Slide classes based on direction
  const getSlideClass = () => {
    if (!isAnimating) return 'opacity-100 translate-x-0';
    // The content appears from the direction we're going
    if (direction === 'forward') {
      return isRtl
        ? 'animate-slide-in-left'
        : 'animate-slide-in-right';
    }
    return isRtl
      ? 'animate-slide-in-right'
      : 'animate-slide-in-left';
  };

  return (
    <div className={cn('pb-8', className)}>
      {/* Success message */}
      {successMessage && (
        <div className="mb-4">{successMessage}</div>
      )}

      {/* Main layout: side stepper + content */}
      <div
        className={cn(
          'flex gap-6',
          isDesktop ? 'flex-row' : 'flex-col',
          isRtl && isDesktop && 'flex-row-reverse',
        )}
      >
        {/* Stepper */}
        <FormWizardStepper
          steps={steps}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
          orientation={isDesktop ? 'vertical' : 'horizontal'}
        />

        {/* Content area */}
        <div className="flex-1 min-w-0">
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            {/* Step header */}
            <div
              className="px-6 py-5 border-b"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-3">
                {steps[currentStep] && (
                  <>
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                      }}
                    >
                      {(() => {
                        const StepIcon = steps[currentStep].icon;
                        return (
                          <StepIcon
                            className="w-5 h-5"
                            style={{ color: 'var(--color-accent)' }}
                          />
                        );
                      })()}
                    </div>
                    <div>
                      <h2
                        className="text-lg font-semibold"
                        style={{ color: 'var(--color-text)' }}
                      >
                        {steps[currentStep].title}
                      </h2>
                      {steps[currentStep].description && (
                        <p
                          className="text-sm mt-0.5"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {steps[currentStep].description}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Step content with slide animation */}
            <div ref={contentRef} className="overflow-hidden">
              <div
                className={cn(
                  'px-6 py-6 transition-all duration-300 ease-in-out',
                  getSlideClass(),
                )}
              >
                {/* Submit error */}
                {submitError && isLastStep && (
                  <div
                    className="mb-4 p-3 rounded-lg border flex items-center gap-2"
                    style={{
                      backgroundColor: 'var(--badge-danger-bg)',
                      borderColor: 'var(--badge-danger-border)',
                      color: 'var(--color-text-danger)',
                    }}
                  >
                    <span className="text-sm">{submitError}</span>
                  </div>
                )}

                {/* Render only the current step */}
                {stepElements[currentStep]}
              </div>
            </div>

            {/* Action buttons */}
            <div
              className="px-6 py-4 border-t flex items-center gap-3"
              style={{
                borderColor: 'var(--color-border)',
                justifyContent: isFirstStep ? 'flex-end' : 'space-between',
              }}
            >
              {/* Left side: Back or Cancel */}
              {!isFirstStep ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                  className="btn-ghost"
                >
                  {isRtl ? (
                    <ArrowRight className="w-4 h-4 me-2" />
                  ) : (
                    <ArrowLeft className="w-4 h-4 me-2" />
                  )}
                  Back
                </Button>
              ) : cancelHref ? (
                <Link to={cancelHref}>
                  <Button type="button" variant="ghost" className="btn-ghost">
                    Cancel
                  </Button>
                </Link>
              ) : null}

              {/* Right side: Next or Submit */}
              <div className="flex items-center gap-3">
                {cancelHref && !isFirstStep && (
                  <Link to={cancelHref}>
                    <Button type="button" variant="outline" className="btn-secondary">
                      Cancel
                    </Button>
                  </Link>
                )}

                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="btn-primary"
                >
                  {isSubmitting && (
                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  )}
                  {isLastStep ? submitLabel : (
                    <>
                      Next
                      {isRtl ? (
                        <ArrowLeft className="w-4 h-4 ms-2" />
                      ) : (
                        <ArrowRight className="w-4 h-4 ms-2" />
                      )}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
