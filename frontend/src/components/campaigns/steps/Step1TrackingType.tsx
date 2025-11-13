import { MousePointer, Eye, Send, CheckCircle } from 'lucide-react';
import { TrackingTypeOption, WizardData, StepValidation } from '@/types/campaign.types';
import { HelpTooltip } from '../HelpTooltip';

interface Step1TrackingTypeProps {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext: () => void;
  validation: StepValidation;
}

const trackingTypeOptions: TrackingTypeOption[] = [
  {
    id: 'button_click',
    title: 'Button Click Tracking',
    description: 'Track when users click specific buttons, links, or interactive elements',
    icon: MousePointer,
    examples: [
      'Purchase buttons',
      'Download links',
      'Contact form buttons',
      'Newsletter signups',
    ],
    difficulty: 'Easy',
    recommendedFor: [
      'E-commerce conversions',
      'Lead generation',
      'Content downloads',
    ],
  },
  {
    id: 'page_view',
    title: 'Page View Tracking',
    description: 'Track when users visit specific pages or reach important milestones',
    icon: Eye,
    examples: [
      'Thank you pages',
      'Confirmation pages',
      'Product detail views',
      'Checkout completion',
    ],
    difficulty: 'Easy',
    recommendedFor: [
      'Conversion tracking',
      'Page engagement',
      'Funnel analysis',
    ],
  },
  {
    id: 'form_submit',
    title: 'Form Submit Tracking',
    description: 'Track when users successfully submit forms and capture form data',
    icon: Send,
    examples: [
      'Contact forms',
      'Registration forms',
      'Newsletter subscriptions',
      'Survey submissions',
    ],
    difficulty: 'Medium',
    recommendedFor: [
      'Lead capture',
      'User registration',
      'Data collection',
    ],
  },
];

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'Easy':
      return 'text-green-600 bg-green-100';
    case 'Medium':
      return 'text-yellow-600 bg-yellow-100';
    case 'Advanced':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export function Step1TrackingType({ 
  data, 
  onUpdate, 
  onNext, 
  validation 
}: Step1TrackingTypeProps) {
  const handleTrackingTypeSelect = (trackingType: 'button_click' | 'page_view' | 'form_submit') => {
    onUpdate({ trackingType });
  };

  const handleNext = () => {
    if (validation.isValid) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Select Tracking Type</h2>
        <p className="text-gray-600">
          Choose what type of user interaction you want to track for your campaign
        </p>
      </div>

      {/* Tracking Type Options */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {trackingTypeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = data.trackingType === option.id;

          return (
            <div
              key={option.id}
              className={`relative rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleTrackingTypeSelect(option.id)}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
              )}

              <div className="p-6">
                {/* Icon and Title */}
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`p-3 rounded-lg ${
                    isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{option.title}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${getDifficultyColor(
                          option.difficulty
                        )}`}
                      >
                        {option.difficulty}
                      </span>
                      <HelpTooltip
                        content={
                          <div>
                            <p className="font-medium mb-2">Difficulty Level:</p>
                            <p className="text-sm">{option.difficulty === 'Easy' ? 'Quick setup with minimal configuration required.' : option.difficulty === 'Medium' ? 'Moderate setup with some technical configuration.' : 'Advanced setup requiring technical knowledge.'}</p>
                          </div>
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-600 text-sm mb-4">{option.description}</p>

                {/* Examples */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Common Examples:
                  </h4>
                  <div className="space-y-1">
                    {option.examples.map((example, index) => (
                      <div key={index} className="flex items-center text-sm text-gray-600">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2" />
                        {example}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended For */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                    Recommended For:
                    <HelpTooltip
                      content="These are the most common use cases where this tracking type provides the best results."
                      className="ml-1"
                    />
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {option.recommendedFor.map((use, index) => (
                      <span
                        key={index}
                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
                      >
                        {use}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Validation Errors */}
      {!validation.isValid && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-red-800 font-medium mb-2">Please fix the following:</h4>
          <ul className="text-red-700 text-sm space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index}>• {error.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-blue-800 font-medium mb-2 flex items-center">
          Not sure which to choose?
          <HelpTooltip
            content="Contact our support team if you need help deciding which tracking type is best for your use case."
            className="ml-1"
          />
        </h4>
        <div className="text-blue-700 text-sm space-y-2">
          <p><strong>Button Click:</strong> Best for immediate actions like purchases or downloads</p>
          <p><strong>Page View:</strong> Perfect for tracking goal completions and page-based conversions</p>
          <p><strong>Form Submit:</strong> Ideal for lead generation and data collection</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <div></div> {/* Spacer for alignment */}
        <button
          onClick={handleNext}
          disabled={!validation.isValid}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            validation.isValid
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Continue to Trigger Setup
        </button>
      </div>
    </div>
  );
}