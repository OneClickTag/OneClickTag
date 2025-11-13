import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Loader2, Target, Mouse, Eye, Code } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tracking } from '@/types/tracking.types';
import { useCreateTracking, useUpdateTracking } from '@/hooks/useTracking';

const trackingSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  type: z.enum(['conversion', 'event', 'pageview', 'custom']),
  conversionValue: z.number().min(0).optional(),
  currency: z.string().optional(),
  targetUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  eventName: z.string().optional(),
});

type TrackingFormData = z.infer<typeof trackingSchema>;

interface CreateTrackingFormProps {
  customerId: string;
  tracking?: Tracking; // For editing
  onSuccess?: (tracking: Tracking) => void;
  onCancel?: () => void;
}

const trackingTypes = [
  {
    value: 'conversion',
    label: 'Conversion Tracking',
    description: 'Track purchase completions and goal achievements',
    icon: Target,
  },
  {
    value: 'event',
    label: 'Event Tracking',
    description: 'Track specific user actions and interactions',
    icon: Mouse,
  },
  {
    value: 'pageview',
    label: 'Page View Tracking',
    description: 'Track page visits and navigation patterns',
    icon: Eye,
  },
  {
    value: 'custom',
    label: 'Custom Tracking',
    description: 'Track custom events with flexible configuration',
    icon: Code,
  },
];

export function CreateTrackingForm({ customerId, tracking, onSuccess, onCancel }: CreateTrackingFormProps) {
  const isEditing = !!tracking;
  const createTracking = useCreateTracking();
  const updateTracking = useUpdateTracking();

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TrackingFormData>({
    resolver: zodResolver(trackingSchema),
    defaultValues: {
      name: tracking?.name || '',
      description: tracking?.description || '',
      type: tracking?.type || 'conversion',
      conversionValue: tracking?.conversionValue || 0,
      currency: tracking?.currency || 'USD',
      targetUrl: tracking?.targetUrl || '',
      eventName: tracking?.eventName || '',
    },
  });

  const selectedType = watch('type');

  React.useEffect(() => {
    if (tracking) {
      reset({
        name: tracking.name,
        description: tracking.description || '',
        type: tracking.type,
        conversionValue: tracking.conversionValue || 0,
        currency: tracking.currency || 'USD',
        targetUrl: tracking.targetUrl || '',
        eventName: tracking.eventName || '',
      });
    }
  }, [tracking, reset]);

  const handleFormSubmit = async (data: TrackingFormData) => {
    try {
      let result: Tracking;

      if (isEditing) {
        result = await updateTracking.mutateAsync({
          id: tracking.id,
          customerId,
          ...data,
          conversionValue: data.conversionValue || undefined,
          currency: data.currency || undefined,
          targetUrl: data.targetUrl || undefined,
          eventName: data.eventName || undefined,
        });
      } else {
        result = await createTracking.mutateAsync({
          customerId,
          ...data,
          conversionValue: data.conversionValue || undefined,
          currency: data.currency || undefined,
          targetUrl: data.targetUrl || undefined,
          eventName: data.eventName || undefined,
        });
      }

      onSuccess?.(result);
      
      if (!isEditing) {
        reset(); // Reset form only for new trackings
      }
    } catch (error) {
      console.error('Error submitting tracking form:', error);
    }
  };

  const renderTypeSpecificFields = () => {
    switch (selectedType) {
      case 'conversion':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="conversionValue">Conversion Value</Label>
                <Input
                  id="conversionValue"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('conversionValue', { valueAsNumber: true })}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Value of each conversion
                </p>
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  {...register('currency')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="targetUrl">Target URL (Optional)</Label>
              <Input
                id="targetUrl"
                {...register('targetUrl')}
                placeholder="https://example.com/thank-you"
                className={errors.targetUrl ? 'border-red-500' : ''}
              />
              {errors.targetUrl && (
                <p className="text-sm text-red-500 mt-1">{errors.targetUrl.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Page where conversion occurs
              </p>
            </div>
          </>
        );

      case 'event':
        return (
          <div>
            <Label htmlFor="eventName">Event Name</Label>
            <Input
              id="eventName"
              {...register('eventName')}
              placeholder="button_click, form_submit, etc."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Name of the event to track
            </p>
          </div>
        );

      case 'pageview':
        return (
          <div>
            <Label htmlFor="targetUrl">Target URL</Label>
            <Input
              id="targetUrl"
              {...register('targetUrl')}
              placeholder="https://example.com/specific-page"
              className={errors.targetUrl ? 'border-red-500' : ''}
            />
            {errors.targetUrl && (
              <p className="text-sm text-red-500 mt-1">{errors.targetUrl.message}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Specific page or URL pattern to track
            </p>
          </div>
        );

      case 'custom':
        return (
          <>
            <div>
              <Label htmlFor="eventName">Custom Event Name</Label>
              <Input
                id="eventName"
                {...register('eventName')}
                placeholder="custom_action"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Custom event identifier
              </p>
            </div>

            <div>
              <Label htmlFor="targetUrl">Target URL (Optional)</Label>
              <Input
                id="targetUrl"
                {...register('targetUrl')}
                placeholder="https://example.com"
                className={errors.targetUrl ? 'border-red-500' : ''}
              />
              {errors.targetUrl && (
                <p className="text-sm text-red-500 mt-1">{errors.targetUrl.message}</p>
              )}
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">
          {isEditing ? 'Edit Tracking' : 'Create New Tracking'}
        </h3>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Tracking Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., Purchase Conversion, Newsletter Signup"
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
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {trackingTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <div
                        key={type.value}
                        className={`relative rounded-lg border-2 cursor-pointer transition-colors ${
                          field.value === type.value
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => field.onChange(type.value)}
                      >
                        <div className="p-4">
                          <div className="flex items-center space-x-3">
                            <Icon className={`h-5 w-5 ${
                              field.value === type.value ? 'text-primary' : 'text-gray-400'
                            }`} />
                            <div className="flex-1">
                              <h4 className="text-sm font-medium">{type.label}</h4>
                              <p className="text-xs text-muted-foreground">{type.description}</p>
                            </div>
                          </div>
                        </div>
                        {field.value === type.value && (
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

          {/* Type-specific Fields */}
          {renderTypeSpecificFields()}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || createTracking.isPending || updateTracking.isPending}
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

      {/* Quick Setup Guide */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Quick Setup Guide</h4>
        <div className="text-sm text-blue-600 space-y-1">
          <p>1. Choose the appropriate tracking type for your needs</p>
          <p>2. Fill in the required configuration details</p>
          <p>3. After creation, the tracking will be automatically synced with Google Ads</p>
          <p>4. Monitor performance in the Analytics tab</p>
        </div>
      </div>
    </div>
  );
}