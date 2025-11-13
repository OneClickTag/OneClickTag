import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { StepProgress } from '@/components/campaigns/StepProgress';
import { Step1TrackingType } from '@/components/campaigns/steps/Step1TrackingType';
import { Step2TriggerConfig } from '@/components/campaigns/steps/Step2TriggerConfig';
import { Step3ConversionParams } from '@/components/campaigns/steps/Step3ConversionParams';
import { Step4ReviewCreate } from '@/components/campaigns/steps/Step4ReviewCreate';
import { WizardData, StepValidation, ValidationError } from '@/types/campaign.types';

export default function CreateCampaign() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = React.useState(1);
  const [wizardData, setWizardData] = React.useState<WizardData>({
    customerId,
  });

  // Initialize wizard data from URL params if provided
  React.useEffect(() => {
    if (customerId) {
      setWizardData(prev => ({ ...prev, customerId }));
    }
  }, [customerId]);

  const steps = [
    {
      id: 1,
      title: 'Type',
      description: 'Select tracking type',
      completed: !!wizardData.trackingType,
      current: currentStep === 1,
    },
    {
      id: 2,
      title: 'Trigger',
      description: 'Configure trigger',
      completed: !!wizardData.trigger?.type,
      current: currentStep === 2,
    },
    {
      id: 3,
      title: 'Conversion',
      description: 'Set parameters',
      completed: !!wizardData.conversion?.name,
      current: currentStep === 3,
    },
    {
      id: 4,
      title: 'Review',
      description: 'Create campaign',
      completed: false,
      current: currentStep === 4,
    },
  ];

  const validateStep = (step: number): StepValidation => {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    switch (step) {
      case 1:
        if (!wizardData.trackingType) {
          errors.push({ field: 'trackingType', message: 'Please select a tracking type' });
        }
        break;

      case 2:
        if (!wizardData.trigger?.type) {
          errors.push({ field: 'trigger.type', message: 'Please select a trigger type' });
        } else {
          const { trigger } = wizardData;
          
          switch (trigger.type) {
            case 'css_selector':
              if (!trigger.cssSelector?.trim()) {
                errors.push({ field: 'trigger.cssSelector', message: 'CSS selector is required' });
              } else if (trigger.cssSelector.includes(' ') && !trigger.cssSelector.includes('.') && !trigger.cssSelector.includes('#')) {
                warnings.push('Consider using more specific selectors for better targeting');
              }
              break;

            case 'url_pattern':
              if (!trigger.urlPatterns?.some(pattern => pattern.trim())) {
                errors.push({ field: 'trigger.urlPatterns', message: 'At least one URL pattern is required' });
              }
              break;

            case 'element_visibility':
              if (!trigger.elementVisibility?.selector?.trim()) {
                errors.push({ field: 'trigger.elementVisibility.selector', message: 'Element selector is required' });
              }
              break;

            case 'scroll_depth':
              const percentage = trigger.scrollDepth?.percentage;
              if (!percentage || percentage < 1 || percentage > 100) {
                errors.push({ field: 'trigger.scrollDepth.percentage', message: 'Scroll depth must be between 1 and 100' });
              }
              break;
          }
        }
        break;

      case 3:
        if (!wizardData.conversion?.name?.trim()) {
          errors.push({ field: 'conversion.name', message: 'Campaign name is required' });
        }
        
        if (wizardData.conversion?.value && wizardData.conversion.value < 0) {
          errors.push({ field: 'conversion.value', message: 'Conversion value cannot be negative' });
        }

        if (wizardData.conversion?.enableEnhancedConversions) {
          warnings.push('Enhanced conversions require customer data to be available during conversion');
        }
        break;

      case 4:
        // Validate all previous steps
        const step1Validation = validateStep(1);
        const step2Validation = validateStep(2);
        const step3Validation = validateStep(3);
        
        errors.push(...step1Validation.errors, ...step2Validation.errors, ...step3Validation.errors);
        warnings.push(...(step1Validation.warnings || []), ...(step2Validation.warnings || []), ...(step3Validation.warnings || []));
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  };

  const updateWizardData = (data: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...data }));
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = (campaignId: string) => {
    // Navigate to campaign detail or campaigns list
    navigate(`/customers/${customerId}/campaigns/${campaignId}`);
  };

  const currentValidation = validateStep(currentStep);

  if (!customerId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600">Customer ID is required</p>
          <Button onClick={() => navigate('/customers')} className="mt-4">
            Go to Customers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(`/customers/${customerId}`)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                
                <div>
                  <h1 className="text-2xl font-bold flex items-center">
                    <Sparkles className="h-6 w-6 mr-2 text-primary" />
                    Create Campaign
                  </h1>
                  <p className="text-gray-600">
                    Set up conversion tracking in 4 easy steps
                  </p>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                Step {currentStep} of 4
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="mt-8">
              <StepProgress steps={steps} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-sm border min-h-[600px]">
            <div className="p-8">
              {currentStep === 1 && (
                <Step1TrackingType
                  data={wizardData}
                  onUpdate={updateWizardData}
                  onNext={nextStep}
                  validation={currentValidation}
                />
              )}

              {currentStep === 2 && (
                <Step2TriggerConfig
                  data={wizardData}
                  onUpdate={updateWizardData}
                  onNext={nextStep}
                  onBack={prevStep}
                  validation={currentValidation}
                />
              )}

              {currentStep === 3 && (
                <Step3ConversionParams
                  data={wizardData}
                  onUpdate={updateWizardData}
                  onNext={nextStep}
                  onBack={prevStep}
                  validation={currentValidation}
                />
              )}

              {currentStep === 4 && (
                <Step4ReviewCreate
                  data={wizardData}
                  onBack={prevStep}
                  onEdit={goToStep}
                  onComplete={handleComplete}
                  validation={currentValidation}
                />
              )}
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-blue-800 font-medium mb-2">Need Help?</h3>
            <div className="text-blue-700 text-sm space-y-1">
              <p>• Each step includes helpful tooltips and examples</p>
              <p>• You can navigate back to edit previous steps at any time</p>
              <p>• Preview your GTM configuration before final creation</p>
              <p>• Real-time validation ensures your campaign is set up correctly</p>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-green-800 font-medium text-sm mb-1">💡 Pro Tip</h4>
              <p className="text-green-700 text-xs">
                Use specific CSS selectors for more accurate tracking
              </p>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-yellow-800 font-medium text-sm mb-1">⚡ Best Practice</h4>
              <p className="text-yellow-700 text-xs">
                Test your triggers before deploying to production
              </p>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="text-purple-800 font-medium text-sm mb-1">🎯 Remember</h4>
              <p className="text-purple-700 text-xs">
                Set realistic conversion values for better ROI tracking
              </p>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}