import { DollarSign, Tag, Zap, Plus, Minus, Info } from 'lucide-react';
import { WizardData, StepValidation } from '@/types/campaign.types';
import { HelpTooltip, ValidationMessage } from '../HelpTooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface Step3ConversionParamsProps {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
  validation: StepValidation;
}

export function Step3ConversionParams({ 
  data, 
  onUpdate, 
  onNext, 
  onBack, 
  validation 
}: Step3ConversionParamsProps) {
  const conversion = data.conversion || {
    name: '',
    description: '',
    value: 0,
    currency: 'USD',
    eventName: '',
    conversionLabel: '',
    enableEnhancedConversions: false,
    customParameters: {},
  };

  const handleConversionUpdate = (field: string, value: any) => {
    onUpdate({
      conversion: {
        ...conversion,
        [field]: value,
      },
    });
  };

  const handleCustomParameterAdd = () => {
    const currentParams = conversion.customParameters || {};
    const newKey = `param_${Object.keys(currentParams).length + 1}`;
    handleConversionUpdate('customParameters', {
      ...currentParams,
      [newKey]: '',
    });
  };

  const handleCustomParameterUpdate = (oldKey: string, newKey: string, value: string) => {
    const currentParams = { ...(conversion.customParameters || {}) };
    
    if (oldKey !== newKey && newKey) {
      delete currentParams[oldKey];
      currentParams[newKey] = value;
    } else {
      currentParams[oldKey] = value;
    }
    
    handleConversionUpdate('customParameters', currentParams);
  };

  const handleCustomParameterRemove = (key: string) => {
    const currentParams = { ...(conversion.customParameters || {}) };
    delete currentParams[key];
    handleConversionUpdate('customParameters', currentParams);
  };

  // Unused function commented out
  // const getRecommendedEventName = () => {
  //   switch (data.trackingType) {
  //     case 'button_click':
  //       return 'click';
  //     case 'page_view':
  //       return 'page_view';
  //     case 'form_submit':
  //       return 'form_submit';
  //     default:
  //       return 'conversion';
  //   }
  // };

  const getConversionExamples = () => {
    switch (data.trackingType) {
      case 'button_click':
        return {
          name: 'Button Click Purchase',
          eventName: 'purchase_click',
          value: 49.99,
          currency: 'USD',
        };
      case 'page_view':
        return {
          name: 'Thank You Page View',
          eventName: 'thank_you_view',
          value: 25.00,
          currency: 'USD',
        };
      case 'form_submit':
        return {
          name: 'Lead Form Submission',
          eventName: 'lead_form_submit',
          value: 15.00,
          currency: 'USD',
        };
      default:
        return {
          name: 'Conversion',
          eventName: 'conversion',
          value: 0,
          currency: 'USD',
        };
    }
  };

  const examples = getConversionExamples();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Set Conversion Parameters</h2>
        <p className="text-gray-600">
          Configure how your conversion will be tracked and valued in Google Ads
        </p>
      </div>

      {/* Basic Conversion Information */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Tag className="h-5 w-5 mr-2" />
          Basic Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="conversionName" className="flex items-center space-x-2">
              <span>Conversion Name *</span>
              <HelpTooltip
                content="A descriptive name for this conversion that will appear in Google Ads reporting."
              />
            </Label>
            <Input
              id="conversionName"
              value={conversion.name || ''}
              onChange={(e) => handleConversionUpdate('name', e.target.value)}
              placeholder={examples.name}
            />
          </div>

          <div>
            <Label htmlFor="eventName" className="flex items-center space-x-2">
              <span>Event Name</span>
              <HelpTooltip
                content="Technical name for the event in GTM. Use lowercase with underscores."
              />
            </Label>
            <Input
              id="eventName"
              value={conversion.eventName || ''}
              onChange={(e) => handleConversionUpdate('eventName', e.target.value)}
              placeholder={examples.eventName}
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={conversion.description || ''}
              onChange={(e) => handleConversionUpdate('description', e.target.value)}
              placeholder="Detailed description of what this conversion tracks"
            />
          </div>
        </div>
      </div>

      {/* Conversion Value */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <DollarSign className="h-5 w-5 mr-2" />
          Conversion Value
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="conversionValue" className="flex items-center space-x-2">
              <span>Value per Conversion</span>
              <HelpTooltip
                content={
                  <div>
                    <p className="mb-2">The monetary value assigned to each conversion.</p>
                    <p className="text-sm">Leave as 0 if conversions don't have a specific value, or if you want to track value dynamically.</p>
                  </div>
                }
              />
            </Label>
            <Input
              id="conversionValue"
              type="number"
              step="0.01"
              min="0"
              value={conversion.value || ''}
              onChange={(e) => handleConversionUpdate('value', parseFloat(e.target.value) || 0)}
              placeholder={examples.value.toString()}
            />
          </div>

          <div>
            <Label htmlFor="currency">Currency</Label>
            <select
              id="currency"
              value={conversion.currency || 'USD'}
              onChange={(e) => handleConversionUpdate('currency', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="JPY">JPY - Japanese Yen</option>
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="AUD">AUD - Australian Dollar</option>
              <option value="CHF">CHF - Swiss Franc</option>
              <option value="CNY">CNY - Chinese Yuan</option>
            </select>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Value Recommendations:</p>
              <ul className="space-y-1 text-blue-700">
                <li>• Set a fixed value for lead generation (e.g., $25 per lead)</li>
                <li>• Use average order value for e-commerce conversions</li>
                <li>• Set to 0 if you'll pass dynamic values from your website</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Zap className="h-5 w-5 mr-2" />
          Advanced Settings
        </h3>

        <div className="space-y-4">
          <div>
            <Label htmlFor="conversionLabel" className="flex items-center space-x-2">
              <span>Conversion Label (Optional)</span>
              <HelpTooltip
                content="Google Ads conversion label for advanced tracking. Leave empty unless you have a specific label from Google Ads."
              />
            </Label>
            <Input
              id="conversionLabel"
              value={conversion.conversionLabel || ''}
              onChange={(e) => handleConversionUpdate('conversionLabel', e.target.value)}
              placeholder="e.g., abc123def456"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="enhancedConversions"
              checked={conversion.enableEnhancedConversions || false}
              onCheckedChange={(checked) => handleConversionUpdate('enableEnhancedConversions', checked)}
            />
            <Label htmlFor="enhancedConversions" className="flex items-center space-x-2">
              <span>Enable Enhanced Conversions</span>
              <HelpTooltip
                content={
                  <div>
                    <p className="mb-2">Enhanced conversions use hashed customer data to improve measurement accuracy.</p>
                    <p className="text-sm">Requires customer email or phone data to be available during conversion.</p>
                  </div>
                }
              />
            </Label>
          </div>
        </div>
      </div>

      {/* Custom Parameters */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Custom Parameters
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCustomParameterAdd}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Parameter
          </Button>
        </div>

        {Object.keys(conversion.customParameters || {}).length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <p>No custom parameters added yet.</p>
            <p className="text-sm mt-1">Add custom parameters to pass additional data with conversions.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(conversion.customParameters || {}).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                <Input
                  value={key}
                  onChange={(e) => handleCustomParameterUpdate(key, e.target.value, value as string)}
                  placeholder="Parameter name"
                  className="flex-1"
                />
                <span className="text-gray-500">=</span>
                <Input
                  value={value as string}
                  onChange={(e) => handleCustomParameterUpdate(key, key, e.target.value)}
                  placeholder="Parameter value"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCustomParameterRemove(key)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Custom Parameter Examples:</p>
              <ul className="space-y-1 text-yellow-700">
                <li>• <code>product_category</code> = "electronics"</li>
                <li>• <code>user_type</code> = "premium"</li>
                <li>• <code>campaign_source</code> = "email"</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Messages */}
      <ValidationMessage errors={validation.errors.map(e => e.message)} warnings={validation.warnings} />

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          Back to Trigger Setup
        </Button>
        <Button
          onClick={onNext}
          disabled={!validation.isValid}
        >
          Continue to Review
        </Button>
      </div>
    </div>
  );
}