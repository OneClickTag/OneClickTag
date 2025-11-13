import { 
  CheckCircle, 
  Loader2, 
  AlertCircle, 
  Clock,
  Tag,
  Zap,
  Code,
  TestTube,
  Upload,
  Sparkles
} from 'lucide-react';
import { GTMSyncProgress as GTMSyncProgressType } from '@/types/campaign.types';

interface GTMSyncProgressProps {
  progress: GTMSyncProgressType;
  className?: string;
}

const stepIcons = {
  initializing: Clock,
  creating_tag: Tag,
  creating_trigger: Zap,
  creating_variables: Code,
  testing: TestTube,
  publishing: Upload,
  completed: Sparkles,
  error: AlertCircle,
};

const stepLabels = {
  initializing: 'Initializing',
  creating_tag: 'Creating GTM Tag',
  creating_trigger: 'Setting up Trigger',
  creating_variables: 'Configuring Variables',
  testing: 'Testing Configuration',
  publishing: 'Publishing Changes',
  completed: 'Completed',
  error: 'Error Occurred',
};

const stepDescriptions = {
  initializing: 'Preparing GTM workspace...',
  creating_tag: 'Creating conversion tracking tag...',
  creating_trigger: 'Setting up event triggers...',
  creating_variables: 'Configuring custom variables...',
  testing: 'Validating configuration...',
  publishing: 'Publishing to GTM container...',
  completed: 'Successfully synced with GTM!',
  error: 'Sync process encountered an error',
};

export function GTMSyncProgress({ progress, className = '' }: GTMSyncProgressProps) {
  const Icon = stepIcons[progress.step];
  const isError = progress.step === 'error';
  const isCompleted = progress.step === 'completed';
  const isInProgress = !isError && !isCompleted;

  const formatTimeRemaining = (seconds?: number) => {
    if (!seconds) return '';
    if (seconds < 60) return `${seconds}s remaining`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s remaining`;
  };

  return (
    <div className={`bg-white rounded-lg border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">GTM Sync Progress</h3>
        <div className={`text-sm px-2 py-1 rounded-full ${
          isCompleted 
            ? 'bg-green-100 text-green-800'
            : isError
            ? 'bg-red-100 text-red-800'
            : 'bg-blue-100 text-blue-800'
        }`}>
          {Math.round(progress.progress)}%
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              isError
                ? 'bg-red-500'
                : isCompleted
                ? 'bg-green-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${progress.progress}%` }}
          />
        </div>
      </div>

      {/* Current Step */}
      <div className="flex items-start space-x-4">
        <div className={`flex-shrink-0 ${
          isInProgress ? 'animate-pulse' : ''
        }`}>
          {isInProgress ? (
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          ) : isCompleted ? (
            <CheckCircle className="h-8 w-8 text-green-500" />
          ) : isError ? (
            <AlertCircle className="h-8 w-8 text-red-500" />
          ) : (
            <Icon className="h-8 w-8 text-gray-500" />
          )}
        </div>

        <div className="flex-1">
          <h4 className={`font-medium ${
            isError ? 'text-red-900' : isCompleted ? 'text-green-900' : 'text-gray-900'
          }`}>
            {stepLabels[progress.step]}
          </h4>
          
          <p className={`text-sm mt-1 ${
            isError ? 'text-red-600' : isCompleted ? 'text-green-600' : 'text-gray-600'
          }`}>
            {progress.message || stepDescriptions[progress.step]}
          </p>

          {progress.details && (
            <p className="text-xs text-gray-500 mt-2">
              {progress.details}
            </p>
          )}

          {progress.error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{progress.error}</p>
            </div>
          )}

          {progress.estimatedTimeRemaining && isInProgress && (
            <p className="text-xs text-blue-600 mt-2">
              {formatTimeRemaining(progress.estimatedTimeRemaining)}
            </p>
          )}
        </div>
      </div>

      {/* Step Breakdown */}
      <div className="mt-6 pt-4 border-t">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {Object.entries(stepLabels).slice(0, -2).map(([stepKey, label]) => {
            const stepProgress = getStepProgress(stepKey as any, progress.step);
            const StepIcon = stepIcons[stepKey as keyof typeof stepIcons];
            
            return (
              <div
                key={stepKey}
                className={`flex flex-col items-center p-2 rounded-lg text-center transition-all ${
                  stepProgress.status === 'completed'
                    ? 'bg-green-50 text-green-700'
                    : stepProgress.status === 'current'
                    ? 'bg-blue-50 text-blue-700'
                    : stepProgress.status === 'error'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-gray-50 text-gray-500'
                }`}
              >
                <StepIcon className="h-4 w-4 mb-1" />
                <span className="text-xs font-medium">{label}</span>
                {stepProgress.status === 'current' && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 animate-pulse" />
                )}
                {stepProgress.status === 'completed' && (
                  <CheckCircle className="w-2 h-2 text-green-500 mt-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getStepProgress(
  stepKey: string, 
  currentStep: string
): { status: 'pending' | 'current' | 'completed' | 'error' } {
  const stepOrder = [
    'initializing',
    'creating_tag',
    'creating_trigger',
    'creating_variables',
    'testing',
    'publishing'
  ];

  const currentIndex = stepOrder.indexOf(currentStep);
  const stepIndex = stepOrder.indexOf(stepKey);

  if (currentStep === 'error') {
    return { status: stepIndex <= currentIndex ? 'error' : 'pending' };
  }

  if (currentStep === 'completed') {
    return { status: 'completed' };
  }

  if (stepIndex < currentIndex) {
    return { status: 'completed' };
  } else if (stepIndex === currentIndex) {
    return { status: 'current' };
  } else {
    return { status: 'pending' };
  }
}