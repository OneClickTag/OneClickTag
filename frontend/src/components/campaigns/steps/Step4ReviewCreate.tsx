import React from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  Eye, 
  Settings, 
  Target,
  Rocket,
  Edit,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { WizardData, StepValidation, CreateCampaignRequest } from '@/types/campaign.types';
import { ValidationMessage } from '../HelpTooltip';
import { Button } from '@/components/ui/button';
import { GTMSyncProgress } from '../GTMSyncProgress';
import { useCreateCampaign, usePreviewCampaign, useGTMContainers } from '@/hooks/useCampaigns';

interface Step4ReviewCreateProps {
  data: WizardData;
  onBack: () => void;
  onEdit: (step: number) => void;
  onComplete: (campaignId: string) => void;
  validation: StepValidation;
}

export function Step4ReviewCreate({ 
  data, 
  onBack, 
  onEdit, 
  onComplete, 
  validation 
}: Step4ReviewCreateProps) {
  const [showPreview, setShowPreview] = React.useState(false);
  const [selectedContainer, setSelectedContainer] = React.useState<string>('');
  const [isCreating, setIsCreating] = React.useState(false);
  const [syncProgress, setSyncProgress] = React.useState<any>(null);

  const createCampaign = useCreateCampaign();
  const previewCampaign = usePreviewCampaign();
  const { data: containersData } = useGTMContainers(data.customerId!);

  const containers = containersData?.containers || [];

  React.useEffect(() => {
    if (containers.length === 1) {
      setSelectedContainer(containers[0].containerId);
    }
  }, [containers]);

  const handlePreview = async () => {
    if (!validation.isValid || !data.customerId) return;

    try {
      const campaignData: CreateCampaignRequest = {
        customerId: data.customerId,
        name: data.conversion?.name || 'Untitled Campaign',
        description: data.conversion?.description,
        trackingType: data.trackingType!,
        trigger: data.trigger!,
        conversion: data.conversion!,
        gtmContainerId: selectedContainer,
      };

      await previewCampaign.mutateAsync(campaignData);
      setShowPreview(true);
    } catch (error) {
      console.error('Preview failed:', error);
    }
  };

  const handleCreate = async () => {
    if (!validation.isValid || !data.customerId) return;

    setIsCreating(true);
    
    try {
      const campaignData: CreateCampaignRequest = {
        customerId: data.customerId,
        name: data.conversion?.name || 'Untitled Campaign',
        description: data.conversion?.description,
        trackingType: data.trackingType!,
        trigger: data.trigger!,
        conversion: data.conversion!,
        gtmContainerId: selectedContainer,
      };

      // Simulate GTM sync progress
      setSyncProgress({
        step: 'initializing',
        progress: 0,
        message: 'Starting campaign creation...',
      });

      // Create campaign
      const campaign = await createCampaign.mutateAsync(campaignData);

      // Simulate sync steps
      const steps = [
        { step: 'creating_tag', progress: 20, message: 'Creating GTM conversion tag...' },
        { step: 'creating_trigger', progress: 40, message: 'Setting up event triggers...' },
        { step: 'creating_variables', progress: 60, message: 'Configuring custom variables...' },
        { step: 'testing', progress: 80, message: 'Testing configuration...' },
        { step: 'publishing', progress: 90, message: 'Publishing to GTM container...' },
        { step: 'completed', progress: 100, message: 'Campaign created successfully!' },
      ];

      for (const stepData of steps) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setSyncProgress(stepData);
      }

      setTimeout(() => {
        onComplete(campaign.id);
      }, 2000);

    } catch (error) {
      console.error('Campaign creation failed:', error);
      setSyncProgress({
        step: 'error',
        progress: 0,
        message: 'Campaign creation failed',
        error: 'An error occurred while creating the campaign. Please try again.',
      });
      setIsCreating(false);
    }
  };

  const formatTriggerDescription = () => {
    const trigger = data.trigger;
    if (!trigger) return 'No trigger configured';

    switch (trigger.type) {
      case 'css_selector':
        return `CSS Selector: ${trigger.cssSelector}`;
      case 'url_pattern':
        return `URL Patterns: ${trigger.urlPatterns?.join(', ')}`;
      case 'element_visibility':
        return `Element: ${trigger.elementVisibility?.selector} (${Math.round((trigger.elementVisibility?.threshold || 0) * 100)}% visible)`;
      case 'scroll_depth':
        return `Scroll: ${trigger.scrollDepth?.percentage}${trigger.scrollDepth?.unit === 'percentage' ? '%' : 'px'}`;
      default:
        return 'Unknown trigger type';
    }
  };

  if (syncProgress) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Creating Your Campaign</h2>
          <p className="text-gray-600">
            Setting up tracking and syncing with Google Tag Manager...
          </p>
        </div>

        <GTMSyncProgress progress={syncProgress} />

        {syncProgress.step === 'completed' && (
          <div className="text-center">
            <div className="text-green-600 mb-4">
              <CheckCircle className="h-16 w-16 mx-auto mb-2" />
              <h3 className="text-xl font-semibold">Campaign Created Successfully!</h3>
              <p className="text-gray-600 mt-2">
                Your campaign is now live and tracking conversions.
              </p>
            </div>
          </div>
        )}

        {syncProgress.step === 'error' && (
          <div className="text-center">
            <Button variant="outline" onClick={() => setSyncProgress(null)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Review & Create Campaign</h2>
        <p className="text-gray-600">
          Review your campaign configuration before creating and syncing with GTM
        </p>
      </div>

      {/* Campaign Summary */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Campaign Summary
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 flex items-center">
                Campaign Details
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(3)}
                  className="ml-2 h-6 w-6 p-0"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Name:</strong> {data.conversion?.name || 'Untitled Campaign'}</p>
                {data.conversion?.description && (
                  <p><strong>Description:</strong> {data.conversion.description}</p>
                )}
                <p><strong>Event Name:</strong> {data.conversion?.eventName || 'conversion'}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 flex items-center">
                Tracking Type
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(1)}
                  className="ml-2 h-6 w-6 p-0"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </h4>
              <div className="text-sm text-gray-600">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                  {data.trackingType?.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Trigger & Conversion */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 flex items-center">
                Trigger Configuration
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(2)}
                  className="ml-2 h-6 w-6 p-0"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </h4>
              <div className="text-sm text-gray-600">
                <p>{formatTriggerDescription()}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 flex items-center">
                Conversion Value
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(3)}
                  className="ml-2 h-6 w-6 p-0"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </h4>
              <div className="text-sm text-gray-600">
                <p>
                  {data.conversion?.value ? 
                    `${data.conversion.value} ${data.conversion.currency || 'USD'}` : 
                    'No fixed value'
                  }
                </p>
                {data.conversion?.enableEnhancedConversions && (
                  <p className="text-blue-600">Enhanced conversions enabled</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Custom Parameters */}
        {data.conversion?.customParameters && Object.keys(data.conversion.customParameters).length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="font-medium text-gray-900 mb-2">Custom Parameters</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(data.conversion.customParameters).map(([key, value]) => (
                <div key={key} className="text-sm text-gray-600">
                  <code className="bg-gray-100 px-1 rounded">{key}</code> = {value as string}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* GTM Container Selection */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Target className="h-5 w-5 mr-2" />
          GTM Container Selection
        </h3>

        {containers.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <p className="text-yellow-800 font-medium">No GTM containers found</p>
                <p className="text-yellow-700 text-sm">
                  Please ensure your Google account is connected and has access to GTM containers.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {containers.map((container) => (
              <div
                key={container.containerId}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedContainer === container.containerId
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedContainer(container.containerId)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{container.name}</h4>
                    <p className="text-sm text-gray-600">
                      ID: {container.publicId} • Domains: {container.domain.join(', ')}
                    </p>
                  </div>
                  {selectedContainer === container.containerId && (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Section */}
      {showPreview && previewCampaign.data && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Eye className="h-5 w-5 mr-2" />
            GTM Configuration Preview
          </h3>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Estimated Complexity</h4>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                previewCampaign.data.estimatedComplexity === 'Low' 
                  ? 'bg-green-100 text-green-800'
                  : previewCampaign.data.estimatedComplexity === 'Medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {previewCampaign.data.estimatedComplexity}
              </span>
            </div>

            {previewCampaign.data.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Warnings</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {previewCampaign.data.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {previewCampaign.data.recommendations.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Recommendations</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  {previewCampaign.data.recommendations.map((rec, index) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation Messages */}
      <ValidationMessage errors={validation.errors.map(e => e.message)} warnings={validation.warnings} />

      {/* Actions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={!validation.isValid || !selectedContainer || previewCampaign.isPending}
              className="w-full"
            >
              {previewCampaign.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Preview...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview GTM Configuration
                </>
              )}
            </Button>
          </div>
          
          <div className="flex-1">
            <Button
              onClick={handleCreate}
              disabled={!validation.isValid || !selectedContainer || isCreating}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Campaign...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Create Campaign
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Button variant="ghost" onClick={onBack}>
            Back to Conversion Setup
          </Button>
        </div>
      </div>
    </div>
  );
}