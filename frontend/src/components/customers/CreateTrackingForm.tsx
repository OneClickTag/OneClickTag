import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus,
  Loader2,
  MousePointerClick,
  Link,
  Eye,
  EyeOff,
  FileCheck,
  FileEdit,
  FileX,
  ShoppingCart,
  Heart,
  ShoppingBag,
  CreditCard,
  ListOrdered,
  CheckCircle,
  Package,
  Phone,
  Mail,
  Download,
  Calendar,
  UserPlus,
  ArrowDown,
  Clock,
  Play,
  CheckSquare,
  Search,
  Filter,
  Columns,
  ChevronDown,
  Square,
  Share2,
  Users,
  FileText,
  File,
  Newspaper,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  TrackingType,
  TrackingDestination,
  Tracking,
  CreateTrackingRequest,
} from '@/types/tracking.types';
import { useCreateTracking, useUpdateTracking } from '@/hooks/useTracking';
import {
  TRACKING_TYPE_METADATA,
  TRACKING_CATEGORIES,
} from '@/lib/tracking/trackingMetadata';
import { useGoogleConnectionStatus } from '@/hooks/useCustomers';
import { ConnectionRequiredBanner } from './ConnectionRequiredBanner';

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MousePointerClick,
  Link,
  Eye,
  EyeOff,
  FileCheck,
  FileEdit,
  FileX,
  ShoppingCart,
  ShoppingCartOff: ShoppingCart,
  Heart,
  ShoppingBag,
  CreditCard,
  ListOrdered,
  CheckCircle,
  Package,
  Phone,
  Mail,
  Download,
  Calendar,
  UserPlus,
  ArrowDown,
  Clock,
  Play,
  CheckSquare,
  Search,
  Filter,
  Columns,
  ChevronDown,
  Square,
  Share2,
  Users,
  FileText,
  File,
  Newspaper,
  Sparkles,
};

// Comprehensive tracking schema with conditional validation
const trackingSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  type: z.nativeEnum(TrackingType),
  selector: z.string().optional(),
  urlPattern: z.string().optional(),
  destinations: z.array(z.nativeEnum(TrackingDestination)).min(1, 'Select at least one destination'),
  ga4EventName: z.string().optional(),
  adsConversionValue: z.number().min(0).optional(),

  // Type-specific config fields
  scrollPercentage: z.number().min(1).max(100).optional(),
  fireOnce: z.boolean().optional(),
  timeSeconds: z.number().min(1).optional(),
  trackValue: z.boolean().optional(),
  defaultValue: z.number().min(0).optional(),
  currency: z.string().optional(),
  trackProductDetails: z.boolean().optional(),
  trackFields: z.boolean().optional(),
  trackAbandonment: z.boolean().optional(),
  trackMilestones: z.boolean().optional(),
}).refine((data) => {
  // Validate selector is required when tracking type requires it
  const metadata = TRACKING_TYPE_METADATA[data.type];
  if (metadata?.requiredFields.includes('selector')) {
    return !!data.selector && data.selector.trim().length > 0;
  }
  return true;
}, {
  message: 'CSS Selector is required for this tracking type',
  path: ['selector'],
}).refine((data) => {
  // Validate urlPattern is required when tracking type requires it
  const metadata = TRACKING_TYPE_METADATA[data.type];
  if (metadata?.requiredFields.includes('urlPattern')) {
    return !!data.urlPattern && data.urlPattern.trim().length > 0;
  }
  return true;
}, {
  message: 'URL Pattern is required for this tracking type',
  path: ['urlPattern'],
});

type TrackingFormData = z.infer<typeof trackingSchema>;

interface CreateTrackingFormProps {
  customerId: string;
  customerSlug?: string;
  tracking?: Tracking;
  onSuccess?: (tracking: Tracking) => void;
  onCancel?: () => void;
}

export function CreateTrackingForm({
  customerId,
  customerSlug,
  tracking,
  onSuccess,
  onCancel,
}: CreateTrackingFormProps) {
  const isEditing = !!tracking;
  const createTracking = useCreateTracking();
  const updateTracking = useUpdateTracking();
  const [selectedCategory, setSelectedCategory] = React.useState<string>('basic');

  // Check connection status
  const { data: connectionStatus } = useGoogleConnectionStatus(customerId);

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<TrackingFormData>({
    resolver: zodResolver(trackingSchema),
    defaultValues: {
      name: tracking?.name || '',
      description: tracking?.description || '',
      type: tracking?.type || TrackingType.BUTTON_CLICK,
      selector: tracking?.selector || '',
      urlPattern: tracking?.urlPattern || '',
      destinations: tracking?.destinations || [TrackingDestination.GA4],
      ga4EventName: tracking?.ga4EventName || '',
      adsConversionValue: tracking?.adsConversionValue || undefined,
      currency: 'USD',
      fireOnce: true,
      trackValue: false,
      trackProductDetails: false,
      trackFields: false,
      trackAbandonment: false,
      trackMilestones: false,
    },
  });

  const selectedType = watch('type');
  const selectedDestinations = watch('destinations');
  const metadata = TRACKING_TYPE_METADATA[selectedType];

  // Check what services are available
  const hasGTMAccess = connectionStatus?.hasGTMAccess || false;
  const hasGA4Access = connectionStatus?.hasGA4Access || false;
  const hasAdsAccess = connectionStatus?.hasAdsAccess || false;
  const isConnected = connectionStatus?.connected || false;

  // Tracking creation is blocked if GTM is not connected (GTM is required for all tracking)
  const isBlocked = !isConnected || !hasGTMAccess;

  const missingServices = {
    gtm: !hasGTMAccess,
    ga4: !hasGA4Access,
    ads: !hasAdsAccess,
  };

  React.useEffect(() => {
    if (tracking) {
      reset({
        name: tracking.name,
        description: tracking.description || '',
        type: tracking.type,
        selector: tracking.selector || '',
        urlPattern: tracking.urlPattern || '',
        destinations: tracking.destinations,
        ga4EventName: tracking.ga4EventName || '',
        adsConversionValue: tracking.adsConversionValue || undefined,
      });
    }
  }, [tracking, reset]);

  // Set default GA4 event name when type changes
  React.useEffect(() => {
    if (metadata?.defaultGA4EventName && !isEditing) {
      setValue('ga4EventName', metadata.defaultGA4EventName);
    }
  }, [selectedType, metadata, setValue, isEditing]);

  // Auto-generate tracking name based on selected type
  React.useEffect(() => {
    if (!isEditing && metadata) {
      const generatedName = metadata.label;
      setValue('name', generatedName);
    }
  }, [selectedType, metadata, setValue, isEditing]);

  const handleFormSubmit = async (data: TrackingFormData) => {
    try {
      // Build type-specific config
      const config: Record<string, any> = {};

      if (data.scrollPercentage) config.scrollPercentage = data.scrollPercentage;
      if (data.fireOnce !== undefined) config.fireOnce = data.fireOnce;
      if (data.timeSeconds) config.timeSeconds = data.timeSeconds;
      if (data.trackValue !== undefined) config.trackValue = data.trackValue;
      if (data.defaultValue) config.defaultValue = data.defaultValue;
      if (data.currency) config.currency = data.currency;
      if (data.trackProductDetails !== undefined)
        config.trackProductDetails = data.trackProductDetails;
      if (data.trackFields !== undefined) config.trackFields = data.trackFields;
      if (data.trackAbandonment !== undefined)
        config.trackAbandonment = data.trackAbandonment;
      if (data.trackMilestones !== undefined) config.trackMilestones = data.trackMilestones;

      const payload: CreateTrackingRequest = {
        customerId,
        name: data.name,
        description: data.description?.trim() || undefined,
        type: data.type,
        selector: data.selector?.trim() || undefined,
        urlPattern: data.urlPattern?.trim() || undefined,
        config: Object.keys(config).length > 0 ? config : undefined,
        destinations: data.destinations,
        ga4EventName: data.ga4EventName?.trim() || undefined,
        adsConversionValue: data.adsConversionValue || undefined,
      };

      let result: Tracking;

      if (isEditing) {
        result = await updateTracking.mutateAsync({
          id: tracking.id,
          ...payload,
        });
      } else {
        result = await createTracking.mutateAsync(payload);
      }

      onSuccess?.(result);

      if (!isEditing) {
        reset();
      }
    } catch (error) {
      console.error('Error submitting tracking form:', error);
    }
  };

  const requiresSelector = metadata?.requiredFields.includes('selector');
  const requiresUrlPattern = metadata?.requiredFields.includes('urlPattern');

  const renderTypeSelection = () => {
    const categoryTypes = TRACKING_CATEGORIES[selectedCategory as keyof typeof TRACKING_CATEGORIES];

    return (
      <div className="space-y-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(TRACKING_CATEGORIES).map(([key, cat]) => (
            <Button
              key={key}
              type="button"
              variant={selectedCategory === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(key)}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Type Selection Grid */}
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryTypes.types.map((type) => {
                const typeMeta = TRACKING_TYPE_METADATA[type];
                const Icon = iconMap[typeMeta.icon] || Sparkles;
                const isSelected = field.value === type;

                return (
                  <div
                    key={type}
                    className={`relative rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => field.onChange(type)}
                  >
                    <div className="p-4">
                      <div className="flex items-start space-x-3">
                        <Icon
                          className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                            isSelected ? 'text-primary' : 'text-gray-400'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium truncate">{typeMeta.label}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {typeMeta.description}
                          </p>
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <div className="h-2 w-2 bg-primary rounded-full" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        />
      </div>
    );
  };

  const renderDestinationSelection = () => {
    return (
      <div className="space-y-3">
        <Label>Tracking Destinations *</Label>
        <p className="text-xs text-muted-foreground">
          Select where you want to send this tracking data
        </p>
        <Controller
          name="destinations"
          control={control}
          render={({ field }) => (
            <div className="space-y-3">
              {/* GA4 Destination */}
              <div className={`flex items-start space-x-2 p-3 rounded-md border ${
                !hasGA4Access ? 'bg-gray-50 border-gray-200 opacity-60' : 'border-gray-300'
              }`}>
                <Checkbox
                  id="dest-ga4"
                  checked={field.value.includes(TrackingDestination.GA4)}
                  disabled={!hasGA4Access}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      field.onChange([...field.value, TrackingDestination.GA4]);
                    } else {
                      field.onChange(
                        field.value.filter((d) => d !== TrackingDestination.GA4)
                      );
                    }
                  }}
                />
                <div className="flex-1">
                  <Label
                    htmlFor="dest-ga4"
                    className={`font-normal ${hasGA4Access ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  >
                    Google Analytics 4 (GA4)
                  </Label>
                  {!hasGA4Access && (
                    <p className="text-xs text-yellow-600 mt-1">
                      GA4 not connected. Connect in Settings to enable.
                    </p>
                  )}
                </div>
              </div>

              {/* Google Ads Destination */}
              <div className={`flex items-start space-x-2 p-3 rounded-md border ${
                !hasAdsAccess ? 'bg-gray-50 border-gray-200 opacity-60' : 'border-gray-300'
              }`}>
                <Checkbox
                  id="dest-ads"
                  checked={field.value.includes(TrackingDestination.GOOGLE_ADS)}
                  disabled={!hasAdsAccess}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      field.onChange([...field.value, TrackingDestination.GOOGLE_ADS]);
                    } else {
                      field.onChange(
                        field.value.filter((d) => d !== TrackingDestination.GOOGLE_ADS)
                      );
                    }
                  }}
                />
                <div className="flex-1">
                  <Label
                    htmlFor="dest-ads"
                    className={`font-normal ${hasAdsAccess ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  >
                    Google Ads Conversions
                  </Label>
                  {!hasAdsAccess && (
                    <p className="text-xs text-yellow-600 mt-1">
                      Google Ads not connected. Connect in Settings to enable.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        />
        {errors.destinations && (
          <p className="text-sm text-red-500">{errors.destinations.message}</p>
        )}
      </div>
    );
  };

  const renderDynamicFields = () => {
    return (
      <div className="space-y-4">
        {/* Selector field */}
        {requiresSelector && (
          <div>
            <Label htmlFor="selector">CSS Selector *</Label>
            <Input
              id="selector"
              {...register('selector')}
              placeholder="e.g., #checkout-button, .add-to-cart-btn"
              className={errors.selector ? 'border-red-500' : ''}
            />
            {errors.selector && (
              <p className="text-sm text-red-500 mt-1">{errors.selector.message}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              The CSS selector for the element to track
            </p>
          </div>
        )}

        {/* URL Pattern field */}
        {requiresUrlPattern && (
          <div>
            <Label htmlFor="urlPattern">URL Pattern *</Label>
            <Input
              id="urlPattern"
              {...register('urlPattern')}
              placeholder="e.g., /checkout/success, /product/*"
              className={errors.urlPattern ? 'border-red-500' : ''}
            />
            {errors.urlPattern && (
              <p className="text-sm text-red-500 mt-1">{errors.urlPattern.message}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              URL pattern or path where tracking should fire
            </p>
          </div>
        )}

        {/* Scroll Depth specific */}
        {selectedType === TrackingType.SCROLL_DEPTH && (
          <>
            <div>
              <Label htmlFor="scrollPercentage">Scroll Percentage * ({watch('scrollPercentage') || 75}%)</Label>
              <Controller
                name="scrollPercentage"
                control={control}
                defaultValue={75}
                render={({ field }) => (
                  <Slider
                    value={[field.value || 75]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                    min={1}
                    max={100}
                    step={5}
                    className="mt-2"
                  />
                )}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Fire tracking when user scrolls to this percentage
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="fireOnce" {...register('fireOnce')} defaultChecked />
              <Label htmlFor="fireOnce" className="font-normal cursor-pointer">
                Fire only once per page load
              </Label>
            </div>
          </>
        )}

        {/* Time on Page specific */}
        {selectedType === TrackingType.TIME_ON_PAGE && (
          <>
            <div>
              <Label htmlFor="timeSeconds">Time in Seconds *</Label>
              <Input
                id="timeSeconds"
                type="number"
                min="1"
                {...register('timeSeconds', { valueAsNumber: true })}
                placeholder="30"
                className={errors.timeSeconds ? 'border-red-500' : ''}
              />
              {errors.timeSeconds && (
                <p className="text-sm text-red-500 mt-1">{errors.timeSeconds.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Fire tracking after user spends this many seconds on the page
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="fireOnce" {...register('fireOnce')} defaultChecked />
              <Label htmlFor="fireOnce" className="font-normal cursor-pointer">
                Fire only once per page load
              </Label>
            </div>
          </>
        )}

        {/* E-commerce Value Tracking */}
        {metadata?.supportsValue && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox id="trackValue" {...register('trackValue')} />
              <Label htmlFor="trackValue" className="font-normal cursor-pointer">
                Track conversion value
              </Label>
            </div>

            {watch('trackValue') && (
              <div className="grid grid-cols-2 gap-4 ml-6">
                <div>
                  <Label htmlFor="defaultValue">Default Value</Label>
                  <Input
                    id="defaultValue"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('defaultValue', { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    {...register('currency')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                    <option value="ILS">ILS</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Product Details Tracking */}
        {[
          TrackingType.ADD_TO_CART,
          TrackingType.REMOVE_FROM_CART,
          TrackingType.ADD_TO_WISHLIST,
          TrackingType.PRODUCT_VIEW,
        ].includes(selectedType) && (
          <div className="flex items-center space-x-2">
            <Checkbox id="trackProductDetails" {...register('trackProductDetails')} />
            <Label htmlFor="trackProductDetails" className="font-normal cursor-pointer">
              Track product details (name, ID, price, category)
            </Label>
          </div>
        )}

        {/* Form Fields Tracking */}
        {[TrackingType.FORM_SUBMIT, TrackingType.FORM_ABANDON].includes(selectedType) && (
          <div className="flex items-center space-x-2">
            <Checkbox id="trackFields" {...register('trackFields')} />
            <Label htmlFor="trackFields" className="font-normal cursor-pointer">
              Track form field values (non-sensitive fields only)
            </Label>
          </div>
        )}

        {/* Video Milestones */}
        {selectedType === TrackingType.VIDEO_PLAY && (
          <div className="flex items-center space-x-2">
            <Checkbox id="trackMilestones" {...register('trackMilestones')} />
            <Label htmlFor="trackMilestones" className="font-normal cursor-pointer">
              Track video milestones (25%, 50%, 75%, 100%)
            </Label>
          </div>
        )}

        {/* GA4 Event Name (for GA4 destination) */}
        {selectedDestinations.includes(TrackingDestination.GA4) && (
          <div>
            <Label htmlFor="ga4EventName">
              GA4 Event Name {metadata?.defaultGA4EventName && '(optional)'}
            </Label>
            <Input
              id="ga4EventName"
              {...register('ga4EventName')}
              placeholder={metadata?.defaultGA4EventName || 'custom_event_name'}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {metadata?.defaultGA4EventName
                ? `Default: ${metadata.defaultGA4EventName}`
                : 'Custom GA4 event name'}
            </p>
          </div>
        )}

        {/* Google Ads Conversion Value */}
        {selectedDestinations.includes(TrackingDestination.GOOGLE_ADS) && (
          <div>
            <Label htmlFor="adsConversionValue">Google Ads Conversion Value (optional)</Label>
            <Input
              id="adsConversionValue"
              type="number"
              step="0.01"
              min="0"
              {...register('adsConversionValue', { valueAsNumber: true })}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Default value for this conversion in Google Ads
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Show connection warning if services are missing */}
      {isBlocked && (
        <ConnectionRequiredBanner
          customerSlug={customerSlug}
          missingServices={missingServices}
        />
      )}

      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">
          {isEditing ? 'Edit Tracking' : 'Create New Tracking'}
        </h3>

        {isBlocked && !isEditing && (
          <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-4 mb-6 text-center">
            <p className="text-gray-700 font-medium">
              Tracking creation is disabled until Google Tag Manager is connected.
            </p>
            <p className="text-gray-600 text-sm mt-1">
              Please connect your Google account in the Settings tab.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Tracking Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., Checkout Button Click, Purchase Complete"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                {...register('description')}
                placeholder="Brief description of what this tracking monitors"
              />
            </div>
          </div>

          {/* Tracking Type Selection */}
          <div>
            <Label>Tracking Type *</Label>
            {renderTypeSelection()}
          </div>

          {/* Destination Selection */}
          {renderDestinationSelection()}

          {/* Dynamic Fields based on type */}
          {renderDynamicFields()}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={
                isBlocked ||
                isSubmitting ||
                createTracking.isPending ||
                updateTracking.isPending
              }
            >
              {isSubmitting || createTracking.isPending || updateTracking.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  {isEditing ? 'Update Tracking' : 'Create Tracking'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">
          {metadata?.label} Tracking
        </h4>
        <div className="text-sm text-blue-600 space-y-1">
          <p>• {metadata?.description}</p>
          {requiresSelector && <p>• Requires a CSS selector to identify the element</p>}
          {requiresUrlPattern && <p>• Requires a URL pattern to match pages</p>}
          {metadata?.supportsValue && <p>• Supports conversion value tracking</p>}
          <p>• Will be automatically synced to selected destinations (GTM, GA4, Google Ads)</p>
        </div>
      </div>
    </div>
  );
}
