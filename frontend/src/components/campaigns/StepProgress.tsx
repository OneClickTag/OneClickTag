import { Check, Circle } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
}

interface StepProgressProps {
  steps: Step[];
  className?: string;
}

export function StepProgress({ steps, className = '' }: StepProgressProps) {
  return (
    <div className={`${className}`}>
      <nav aria-label="Campaign creation progress">
        <ol className="flex items-center">
          {steps.map((step, stepIdx) => (
            <li
              key={step.id}
              className={`relative ${
                stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''
              }`}
            >
              {/* Connector line */}
              {stepIdx !== steps.length - 1 && (
                <div
                  className="absolute inset-0 flex items-center"
                  aria-hidden="true"
                >
                  <div
                    className={`h-0.5 w-full ${
                      step.completed ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  />
                </div>
              )}

              {/* Step circle */}
              <div className="relative flex items-center justify-center">
                {step.completed ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                ) : step.current ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-white">
                    <Circle className="h-4 w-4 text-primary fill-current" />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
                    <span className="text-gray-500 text-sm font-medium">{step.id}</span>
                  </div>
                )}

                {/* Step content */}
                <div className="absolute top-10 left-1/2 transform -translate-x-1/2 text-center">
                  <div
                    className={`text-sm font-medium ${
                      step.current
                        ? 'text-primary'
                        : step.completed
                        ? 'text-gray-900'
                        : 'text-gray-500'
                    }`}
                  >
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 max-w-24">
                    {step.description}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}