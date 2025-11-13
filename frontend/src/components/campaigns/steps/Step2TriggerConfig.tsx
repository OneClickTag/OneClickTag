import React from 'react';
import { 
  Target, 
  Link, 
  Eye, 
  Scroll, 
  CheckCircle, 
  TestTube, 
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { TriggerTypeOption, WizardData, StepValidation } from '@/types/campaign.types';
import { HelpTooltip, ValidationMessage } from '../HelpTooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useValidateCSSSelector, useTestUrlPattern } from '@/hooks/useCampaigns';

interface Step2TriggerConfigProps {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
  validation: StepValidation;
}

const triggerTypeOptions: TriggerTypeOption[] = [
  {
    id: 'css_selector',
    title: 'CSS Selector',
    description: 'Target specific elements using CSS selectors like IDs, classes, or attributes',
    icon: Target,
    examples: [
      '#buy-now-button',
      '.checkout-btn',
      'button[data-action="purchase"]',
      'a.download-link',
    ],
    complexity: 'Beginner',
    useCase: 'Most precise targeting for specific elements',
  },
  {
    id: 'url_pattern',
    title: 'URL Pattern',
    description: 'Trigger based on URL patterns when users visit specific pages',
    icon: Link,
    examples: [
      '/thank-you/*',
      '*/checkout/complete',
      'https://example.com/success',
      '/download/*/complete',
    ],
    complexity: 'Beginner',
    useCase: 'Perfect for page-based conversions',
  },
  {
    id: 'element_visibility',
    title: 'Element Visibility',
    description: 'Track when specific elements become visible in the viewport',
    icon: Eye,
    examples: [
      'Call-to-action sections',
      'Product images',
      'Video players',
      'Pricing tables',
    ],
    complexity: 'Intermediate',
    useCase: 'Advanced engagement tracking',
  },
  {
    id: 'scroll_depth',
    title: 'Scroll Depth',
    description: 'Trigger when users scroll to a specific depth on the page',
    icon: Scroll,
    examples: [
      '50% page scroll',
      '100% page scroll',
      '1000px scrolled',
      'Bottom of page',
    ],
    complexity: 'Intermediate',
    useCase: 'Content engagement measurement',
  },
];

export function Step2TriggerConfig({ 
  data, 
  onUpdate, 
  onNext, 
  onBack, 
  validation 
}: Step2TriggerConfigProps) {
  const [testResults, setTestResults] = React.useState<any>(null);
  const validateSelector = useValidateCSSSelector();
  const testUrlPattern = useTestUrlPattern();

  const triggerType = data.trigger?.type;

  const handleTriggerTypeSelect = (type: 'css_selector' | 'url_pattern' | 'element_visibility' | 'scroll_depth') => {
    onUpdate({
      trigger: {
        type,
        ...(type === 'css_selector' && { cssSelector: '' }),
        ...(type === 'url_pattern' && { urlPatterns: [''] }),
        ...(type === 'element_visibility' && { 
          elementVisibility: { selector: '', threshold: 0.5 } 
        }),
        ...(type === 'scroll_depth' && { 
          scrollDepth: { percentage: 50, unit: 'percentage' as const } 
        }),
      },
    });
    setTestResults(null);
  };

  const handleCSSSelector = (cssSelector: string) => {
    onUpdate({
      trigger: {
        ...data.trigger!,
        cssSelector,
      },
    });
  };

  const handleUrlPatterns = (index: number, pattern: string) => {
    const patterns = [...(data.trigger?.urlPatterns || [''])];
    patterns[index] = pattern;
    onUpdate({
      trigger: {
        ...data.trigger!,
        urlPatterns: patterns,
      },
    });
  };

  const addUrlPattern = () => {
    const patterns = [...(data.trigger?.urlPatterns || []), ''];
    onUpdate({
      trigger: {
        ...data.trigger!,
        urlPatterns: patterns,
      },
    });
  };

  const removeUrlPattern = (index: number) => {
    const patterns = data.trigger?.urlPatterns?.filter((_, i) => i !== index) || [];
    onUpdate({
      trigger: {
        ...data.trigger!,
        urlPatterns: patterns.length > 0 ? patterns : [''],
      },
    });
  };

  const handleElementVisibility = (field: string, value: any) => {
    onUpdate({
      trigger: {
        ...data.trigger!,
        elementVisibility: {
          ...data.trigger?.elementVisibility!,
          [field]: value,
        },
      },
    });
  };

  const handleScrollDepth = (field: string, value: any) => {
    onUpdate({
      trigger: {
        ...data.trigger!,
        scrollDepth: {
          ...data.trigger?.scrollDepth!,
          [field]: value,
        },
      },
    });
  };

  const handleTestSelector = async () => {
    if (!data.trigger?.cssSelector) return;
    
    try {
      const result = await validateSelector.mutateAsync({
        selector: data.trigger.cssSelector,
      });
      setTestResults(result);
    } catch (error) {
      setTestResults({ isValid: false, elementCount: 0, examples: [] });
    }
  };

  const handleTestUrls = async () => {
    if (!data.trigger?.urlPatterns?.length) return;
    
    const testUrls = [
      'https://example.com/thank-you',
      'https://example.com/checkout/complete',
      'https://example.com/success',
      'https://example.com/download/file/complete',
    ];

    try {
      const result = await testUrlPattern.mutateAsync({
        patterns: data.trigger.urlPatterns.filter(Boolean),
        testUrls,
      });
      setTestResults(result);
    } catch (error) {
      setTestResults({ matches: [] });
    }
  };

  const renderTriggerConfiguration = () => {
    if (!triggerType) return null;

    switch (triggerType) {
      case 'css_selector':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="cssSelector" className="flex items-center space-x-2">
                <span>CSS Selector</span>
                <HelpTooltip
                  content={
                    <div>
                      <p className="font-medium mb-2">CSS Selector Examples:</p>
                      <ul className="text-sm space-y-1">
                        <li><code>#button-id</code> - Element with specific ID</li>
                        <li><code>.button-class</code> - Elements with specific class</li>
                        <li><code>button[type="submit"]</code> - Buttons with type attribute</li>
                        <li><code>.container .buy-btn</code> - Nested elements</li>
                      </ul>
                    </div>
                  }
                />
              </Label>
              <div className="flex space-x-2">
                <Input
                  id="cssSelector"
                  value={data.trigger?.cssSelector || ''}
                  onChange={(e) => handleCSSSelector(e.target.value)}
                  placeholder="e.g., #buy-now-button, .checkout-btn"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestSelector}
                  disabled={!data.trigger?.cssSelector || validateSelector.isPending}
                >
                  {validateSelector.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4" />
                  )}
                  Test
                </Button>
              </div>
            </div>

            {testResults && (
              <div className={`p-3 rounded-lg border ${
                testResults.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  {testResults.isValid ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    testResults.isValid ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {testResults.isValid 
                      ? `Valid selector! Found ${testResults.elementCount} matching element(s)`
                      : 'Invalid or not found selector'
                    }
                  </span>
                </div>
                {testResults.examples?.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">Example matches:</p>
                    <ul className="list-disc list-inside">
                      {testResults.examples.slice(0, 3).map((example: string, index: number) => (
                        <li key={index}>{example}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'url_pattern':
        return (
          <div className="space-y-4">
            <div>
              <Label className="flex items-center space-x-2">
                <span>URL Patterns</span>
                <HelpTooltip
                  content={
                    <div>
                      <p className="font-medium mb-2">URL Pattern Examples:</p>
                      <ul className="text-sm space-y-1">
                        <li><code>/thank-you</code> - Exact path match</li>
                        <li><code>/checkout/*</code> - Wildcard match</li>
                        <li><code>*/success</code> - Ends with pattern</li>
                        <li><code>https://domain.com/page</code> - Full URL</li>
                      </ul>
                    </div>
                  }
                />
              </Label>
              
              {data.trigger?.urlPatterns?.map((pattern, index) => (
                <div key={index} className="flex space-x-2 mb-2">
                  <Input
                    value={pattern}
                    onChange={(e) => handleUrlPatterns(index, e.target.value)}
                    placeholder="e.g., /thank-you, */checkout/complete"
                    className="flex-1"
                  />
                  {data.trigger!.urlPatterns!.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeUrlPattern(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addUrlPattern}
                >
                  Add Pattern
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestUrls}
                  disabled={!data.trigger?.urlPatterns?.some(Boolean) || testUrlPattern.isPending}
                >
                  {testUrlPattern.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4" />
                  )}
                  Test Patterns
                </Button>
              </div>
            </div>

            {testResults && (
              <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Test Results:</h4>
                <div className="space-y-1">
                  {testResults.matches?.map((match: any, index: number) => (
                    <div
                      key={index}
                      className={`text-sm flex items-center space-x-2 ${
                        match.matched ? 'text-green-700' : 'text-gray-600'
                      }`}
                    >
                      {match.matched ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-gray-400" />
                      )}
                      <span>{match.url}</span>
                      {match.matchedPattern && (
                        <span className="text-xs text-blue-600">({match.matchedPattern})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'element_visibility':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="visibilitySelector">Element Selector</Label>
              <Input
                id="visibilitySelector"
                value={data.trigger?.elementVisibility?.selector || ''}
                onChange={(e) => handleElementVisibility('selector', e.target.value)}
                placeholder="e.g., .hero-section, #pricing-table"
              />
            </div>
            <div>
              <Label htmlFor="threshold" className="flex items-center space-x-2">
                <span>Visibility Threshold</span>
                <HelpTooltip
                  content="Percentage of the element that must be visible before triggering. 0.5 = 50% visible, 1.0 = 100% visible."
                />
              </Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="threshold"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={data.trigger?.elementVisibility?.threshold || 0.5}
                  onChange={(e) => handleElementVisibility('threshold', parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600 w-12">
                  {Math.round((data.trigger?.elementVisibility?.threshold || 0.5) * 100)}%
                </span>
              </div>
            </div>
          </div>
        );

      case 'scroll_depth':
        return (
          <div className="space-y-4">
            <div>
              <Label className="flex items-center space-x-2">
                <span>Scroll Depth Type</span>
                <HelpTooltip
                  content="Choose between percentage of page height or absolute pixel value."
                />
              </Label>
              <select
                value={data.trigger?.scrollDepth?.unit || 'percentage'}
                onChange={(e) => handleScrollDepth('unit', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="percentage">Percentage of page</option>
                <option value="pixels">Absolute pixels</option>
              </select>
            </div>
            <div>
              <Label htmlFor="scrollValue">
                {data.trigger?.scrollDepth?.unit === 'percentage' ? 'Percentage' : 'Pixels'}
              </Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="scrollValue"
                  type="number"
                  min={data.trigger?.scrollDepth?.unit === 'percentage' ? 1 : 100}
                  max={data.trigger?.scrollDepth?.unit === 'percentage' ? 100 : 10000}
                  value={data.trigger?.scrollDepth?.percentage || 50}
                  onChange={(e) => handleScrollDepth('percentage', parseInt(e.target.value))}
                />
                <span className="text-sm text-gray-600">
                  {data.trigger?.scrollDepth?.unit === 'percentage' ? '%' : 'px'}
                </span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Configure Trigger</h2>
        <p className="text-gray-600">
          Set up when and how your tracking should be triggered for{' '}
          <span className="font-medium capitalize">{data.trackingType?.replace('_', ' ')}</span> events
        </p>
      </div>

      {/* Trigger Type Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Select Trigger Method</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {triggerTypeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = triggerType === option.id;
            const isRecommended = (
              (data.trackingType === 'button_click' && option.id === 'css_selector') ||
              (data.trackingType === 'page_view' && option.id === 'url_pattern') ||
              (data.trackingType === 'form_submit' && option.id === 'css_selector')
            );

            return (
              <div
                key={option.id}
                className={`relative rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleTriggerTypeSelect(option.id)}
              >
                {isRecommended && (
                  <div className="absolute -top-2 left-4 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    Recommended
                  </div>
                )}
                
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-gray-500'}`} />
                    <h4 className="font-medium">{option.title}</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{option.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{option.complexity}</span>
                    <HelpTooltip
                      content={
                        <div>
                          <p className="font-medium mb-2">{option.useCase}</p>
                          <p className="text-sm mb-2">Examples:</p>
                          <ul className="text-sm space-y-1">
                            {option.examples.map((example, index) => (
                              <li key={index}>• {example}</li>
                            ))}
                          </ul>
                        </div>
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trigger Configuration */}
      {triggerType && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Configure Trigger Details</h3>
          {renderTriggerConfiguration()}
        </div>
      )}

      {/* Validation Messages */}
      <ValidationMessage errors={validation.errors.map(e => e.message)} warnings={validation.warnings} />

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          Back to Tracking Type
        </Button>
        <Button
          onClick={onNext}
          disabled={!validation.isValid}
        >
          Continue to Conversion Setup
        </Button>
      </div>
    </div>
  );
}