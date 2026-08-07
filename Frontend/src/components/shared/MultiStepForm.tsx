"use client";

import { useState, useCallback, createContext, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FormField } from "@/components/shared/FormField";

export { FormField };
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";

interface Step {
  id: string;
  title: string;
  description?: string;
}

interface MultiStepFormContextValue {
  currentStep: number;
  totalSteps: number;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
}

const MultiStepFormContext = createContext<MultiStepFormContextValue | null>(null);

export function useMultiStepForm() {
  const context = useContext(MultiStepFormContext);
  if (!context) {
    throw new Error("useMultiStepForm must be used within a MultiStepForm");
  }
  return context;
}

interface MultiStepFormProps {
  steps: Step[];
  onSubmit: () => void | Promise<void>;
  validateStep?: (stepIndex: number) => Record<string, string> | null;
  children: React.ReactNode;
  className?: string;
  isSubmitting?: boolean;
  contentCardClassName?: string;
  contentClassName?: string;
  navigationClassName?: string;
  previousLabel?: string;
  nextLabel?: string;
  submitLabel?: string;
}

export function MultiStepForm({
  steps,
  onSubmit,
  validateStep,
  children,
  className,
  isSubmitting,
  contentCardClassName,
  contentClassName,
  navigationClassName,
  previousLabel = "Previous",
  nextLabel = "Next",
  submitLabel = "Submit",
}: MultiStepFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < steps.length) {
        setErrors({});
        setCurrentStep(step);
      }
    },
    [steps.length]
  );

  const nextStep = useCallback(() => {
    if (validateStep) {
      const stepErrors = validateStep(currentStep);
      if (stepErrors && Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
    }
    setErrors({});
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, steps.length, validateStep]);

  const prevStep = useCallback(() => {
    setErrors({});
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleSubmit = useCallback(() => {
    if (validateStep) {
      const stepErrors = validateStep(currentStep);
      if (stepErrors && Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
    }
    setErrors({});
    onSubmit();
  }, [currentStep, validateStep, onSubmit]);

  const contextValue: MultiStepFormContextValue = {
    currentStep,
    totalSteps: steps.length,
    goToStep,
    nextStep,
    prevStep,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === steps.length - 1,
    errors,
    setErrors,
  };

  const stepContent = Array.isArray(children) ? children : [children];

  return (
    <MultiStepFormContext.Provider value={contextValue}>
      <div className={cn("space-y-6", className)}>
        <nav aria-label="Progress" className="px-1 sm:px-0">
          <ol className="flex items-center">
            {steps.map((step, index) => (
              <li
                key={step.id}
                className={cn(
                  "flex items-center min-w-0",
                  index < steps.length - 1 && "flex-1"
                )}
              >
                <button
                  type="button"
                  onClick={() => goToStep(index)}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors min-w-0",
                    index <= currentStep ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                      index <= currentStep
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                  <span className="truncate">{step.title}</span>
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "mx-3 h-0.5 flex-1",
                      index < currentStep ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </li>
            ))}
          </ol>
        </nav>

        {Object.keys(errors).length > 0 && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
            <p className="text-sm font-medium text-destructive mb-1">
              Please fix the following errors:
            </p>
            <ul className="text-sm text-destructive list-disc list-inside">
              {Object.values(errors).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        <Card className={cn(contentCardClassName)}>
          <CardContent className={cn("p-6", contentClassName)}>
            {stepContent[currentStep]}
          </CardContent>
        </Card>

        <div
          className={cn(
            "flex items-center justify-between gap-3",
            navigationClassName
          )}
        >
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="min-h-11 flex-1 sm:flex-none"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {previousLabel}
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button type="button" onClick={nextStep} className="min-h-11 flex-1 sm:flex-none">
              {nextLabel}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="min-h-11 flex-1 sm:flex-none"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {isSubmitting ? "Submitting..." : submitLabel}
            </Button>
          )}
        </div>
      </div>
    </MultiStepFormContext.Provider>
  );
}

interface StepContentProps {
  children: React.ReactNode;
}

export function StepContent({ children }: StepContentProps) {
  return <div className="space-y-4">{children}</div>;
}
