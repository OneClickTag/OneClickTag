export interface Campaign {
  id: string;
  customerId: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'error';
  
  // Tracking Configuration
  trackingType: 'button_click' | 'page_view' | 'form_submit';
  
  // Trigger Configuration
  trigger: {
    type: 'css_selector' | 'url_pattern' | 'element_visibility' | 'scroll_depth';
    cssSelector?: string;
    urlPatterns?: string[];
    elementVisibility?: {
      selector: string;
      threshold: number; // 0-1
    };
    scrollDepth?: {
      percentage: number; // 0-100
      unit: 'percentage' | 'pixels';
    };
    waitTime?: number; // milliseconds
  };
  
  // Conversion Parameters
  conversion: {
    value?: number;
    currency?: string;
    eventName?: string;
    conversionLabel?: string;
    enableEnhancedConversions?: boolean;
    customParameters?: Record<string, any>;
  };
  
  // GTM Integration
  gtm: {
    containerId?: string;
    tagId?: string;
    triggerId?: string;
    variableIds?: string[];
    syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
    lastSyncAt?: string;
    syncError?: string;
  };
  
  // Analytics
  analytics?: {
    totalTriggers: number;
    totalConversions: number;
    conversionRate: number;
    totalValue: number;
    lastTriggered?: string;
  };
  
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignRequest {
  customerId: string;
  name: string;
  description?: string;
  trackingType: 'button_click' | 'page_view' | 'form_submit';
  trigger: Campaign['trigger'];
  conversion: Campaign['conversion'];
  gtmContainerId?: string;
}

export interface UpdateCampaignRequest extends Partial<CreateCampaignRequest> {
  id: string;
}

// Wizard Step Data
export interface WizardData {
  // Step 1: Tracking Type
  trackingType?: 'button_click' | 'page_view' | 'form_submit';
  
  // Step 2: Trigger Configuration
  trigger?: {
    type: 'css_selector' | 'url_pattern' | 'element_visibility' | 'scroll_depth';
    cssSelector?: string;
    urlPatterns?: string[];
    elementVisibility?: {
      selector: string;
      threshold: number;
    };
    scrollDepth?: {
      percentage: number;
      unit: 'percentage' | 'pixels';
    };
    waitTime?: number;
  };
  
  // Step 3: Conversion Parameters
  conversion?: {
    name: string;
    description?: string;
    value?: number;
    currency?: string;
    eventName?: string;
    conversionLabel?: string;
    enableEnhancedConversions?: boolean;
    customParameters?: Record<string, any>;
  };
  
  // Additional metadata
  customerId?: string;
  gtmContainerId?: string;
}

export interface TrackingTypeOption {
  id: 'button_click' | 'page_view' | 'form_submit';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  examples: string[];
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  recommendedFor: string[];
}

export interface TriggerTypeOption {
  id: 'css_selector' | 'url_pattern' | 'element_visibility' | 'scroll_depth';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  examples: string[];
  complexity: 'Beginner' | 'Intermediate' | 'Advanced';
  useCase: string;
}

export interface GTMSyncProgress {
  step: 'initializing' | 'creating_tag' | 'creating_trigger' | 'creating_variables' | 'testing' | 'publishing' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  details?: string;
  error?: string;
  estimatedTimeRemaining?: number; // seconds
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface StepValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: string[];
}