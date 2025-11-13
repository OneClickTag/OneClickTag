import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, Loader2, ExternalLink, Unlink, AlertCircle, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Customer, UpdateCustomerRequest, GoogleConnectionStatus } from '@/types/customer.types';
import { useUpdateCustomer, useConnectGoogleAccount, useDisconnectGoogleAccount } from '@/hooks/useCustomers';
import { formatRelativeTime } from '@/lib/utils';

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  company: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'pending']),
  tags: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerSettingsProps {
  customer: Customer | undefined;
  isLoadingCustomer?: boolean;
  connectionStatus?: GoogleConnectionStatus;
  isLoadingConnectionStatus?: boolean;
  loading?: boolean;
}

export function CustomerSettings({
  customer,
  isLoadingCustomer = false,
  connectionStatus,
  isLoadingConnectionStatus = false,
  loading = false
}: CustomerSettingsProps) {
  const updateCustomer = useUpdateCustomer();
  const connectGoogleAccount = useConnectGoogleAccount();
  const disconnectGoogleAccount = useDisconnectGoogleAccount();
  const [syncingService, setSyncingService] = React.useState<'gtm' | 'ga4' | 'ads' | null>(null);

  // Debug logging
  React.useEffect(() => {
    if (connectionStatus) {
      console.log('Connection Status:', connectionStatus);
      console.log('Has GA4 Access:', connectionStatus.hasGA4Access);
      console.log('GA4 Error:', connectionStatus.ga4Error);
      console.log('GA4 Property Count:', connectionStatus.ga4PropertyCount);
    }
  }, [connectionStatus]);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
    reset,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      company: customer?.company || '',
      website: customer?.website || '',
      status: customer?.status || 'pending',
      tags: customer?.tags.join(', ') || '',
    },
  });

  React.useEffect(() => {
    if (customer) {
      reset({
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
        company: customer.company || '',
        website: customer.website || '',
        status: customer.status,
        tags: customer.tags.join(', '),
      });
    }
  }, [customer, reset]);

  const handleFormSubmit = async (data: CustomerFormData) => {
    if (!customer) return;

    try {
      const formData: UpdateCustomerRequest = {
        id: customer.id,
        ...data,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        website: data.website || undefined,
        phone: data.phone || undefined,
        company: data.company || undefined,
      };

      await updateCustomer.mutateAsync(formData);
      reset(data); // Reset form dirty state
    } catch (error) {
      console.error('Error updating customer:', error);
    }
  };

  const handleGoogleConnect = async () => {
    if (!customer) return;

    try {
      const result = await connectGoogleAccount.mutateAsync(customer.id);
      if (result.authUrl) {
        window.open(result.authUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to connect Google account:', error);
    }
  };

  const handleGoogleDisconnect = async () => {
    if (!customer) return;

    if (confirm('Are you sure you want to disconnect the Google account? This will stop all Google Ads integrations for this customer.')) {
      try {
        await disconnectGoogleAccount.mutateAsync(customer.id);
      } catch (error) {
        console.error('Failed to disconnect Google account:', error);
      }
    }
  };

  const handleSyncService = async (service: 'gtm' | 'ga4' | 'ads') => {
    if (!customer) return;

    setSyncingService(service);
    // TODO: Call individual sync endpoint for the service
    // For now, we'll simulate a sync delay
    setTimeout(() => {
      setSyncingService(null);
      // This would trigger a refetch of the connection status
    }, 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                {...register('name')}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...register('phone')}
              />
            </div>

            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                {...register('company')}
              />
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                {...register('website')}
                placeholder="https://..."
                className={errors.website ? 'border-red-500' : ''}
              />
              {errors.website && (
                <p className="text-sm text-red-500 mt-1">{errors.website.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                {...register('status')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              {...register('tags')}
              placeholder="tag1, tag2, tag3"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Separate multiple tags with commas
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!isDirty || isSubmitting || updateCustomer.isPending}
            >
              {isSubmitting || updateCustomer.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Google Account Integration */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Google Account Integration</h3>

        {connectionStatus?.connected ? (
          <div className="space-y-4">
            {/* Overall Connection Status */}
            <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <ExternalLink className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">Google Account Connected</p>
                <p className="text-sm text-green-600">{connectionStatus.googleEmail}</p>
                {connectionStatus.connectedAt && (
                  <p className="text-xs text-green-500">
                    Connected on {new Date(connectionStatus.connectedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {/* Individual Service Status */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Service Status:</h4>

              {/* GTM Status */}
              <div className={`p-4 border rounded-md ${
                isLoadingConnectionStatus
                  ? 'bg-gray-50 border-gray-200'
                  : connectionStatus.hasGTMAccess
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">📊</span>
                    <span className="text-sm font-semibold text-gray-900">Google Tag Manager</span>
                  </div>
                  {isLoadingConnectionStatus ? (
                    <Skeleton className="h-6 w-20 rounded-full" />
                  ) : syncingService === 'gtm' ? (
                    <span className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Syncing...
                    </span>
                  ) : connectionStatus.hasGTMAccess ? (
                    <span className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Synced
                    </span>
                  ) : (
                    <span className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <XCircle className="h-3 w-3 mr-1" />
                      Failed
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {isLoadingConnectionStatus ? (
                      <>
                        <Skeleton className="h-3 w-32 mb-1" />
                        <Skeleton className="h-3 w-40" />
                      </>
                    ) : connectionStatus.hasGTMAccess ? (
                      <>
                        {connectionStatus.gtmAccountId && (
                          <p className="text-xs text-gray-600">Account: {connectionStatus.gtmAccountId}</p>
                        )}
                        {connectionStatus.gtmContainerId && (
                          <p className="text-xs text-gray-600">Container: {connectionStatus.gtmContainerId}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Last sync: {formatRelativeTime(connectionStatus.gtmLastSyncedAt)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-red-600">{connectionStatus.gtmError || 'Failed to connect'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Last sync: {formatRelativeTime(connectionStatus.gtmLastSyncedAt)}
                        </p>
                      </>
                    )}
                  </div>
                  {!isLoadingConnectionStatus && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSyncService('gtm')}
                      disabled={syncingService !== null}
                      className="ml-2"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Sync
                    </Button>
                  )}
                </div>
              </div>

              {/* GA4 Status */}
              <div className={`p-4 border rounded-md ${
                isLoadingConnectionStatus
                  ? 'bg-gray-50 border-gray-200'
                  : connectionStatus.hasGA4Access
                  ? 'bg-green-50 border-green-200'
                  : connectionStatus.ga4Error
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">📊</span>
                    <span className="text-sm font-semibold text-gray-900">Google Analytics 4</span>
                  </div>
                  {isLoadingConnectionStatus ? (
                    <Skeleton className="h-6 w-20 rounded-full" />
                  ) : syncingService === 'ga4' ? (
                    <span className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Syncing...
                    </span>
                  ) : connectionStatus.hasGA4Access ? (
                    <span className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Synced
                    </span>
                  ) : (
                    <span className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <XCircle className="h-3 w-3 mr-1" />
                      {connectionStatus.ga4Error ? 'Failed' : 'Not Found'}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {isLoadingConnectionStatus ? (
                      <>
                        <Skeleton className="h-3 w-32 mb-1" />
                        <Skeleton className="h-3 w-40" />
                      </>
                    ) : connectionStatus.hasGA4Access ? (
                      <>
                        <p className="text-xs text-gray-600">
                          {connectionStatus.ga4PropertyCount} {connectionStatus.ga4PropertyCount === 1 ? 'property' : 'properties'} found
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Last sync: {formatRelativeTime(connectionStatus.ga4LastSyncedAt)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-red-600">{connectionStatus.ga4Error || 'No GA4 properties found'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Last sync: {formatRelativeTime(connectionStatus.ga4LastSyncedAt)}
                        </p>
                      </>
                    )}
                  </div>
                  {!isLoadingConnectionStatus && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSyncService('ga4')}
                      disabled={syncingService !== null}
                      className="ml-2"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Sync
                    </Button>
                  )}
                </div>
              </div>

              {/* Google Ads Status */}
              <div className={`p-4 border rounded-md ${
                isLoadingConnectionStatus
                  ? 'bg-gray-50 border-gray-200'
                  : connectionStatus.hasAdsAccess
                  ? 'bg-green-50 border-green-200'
                  : connectionStatus.adsError
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">📊</span>
                    <span className="text-sm font-semibold text-gray-900">Google Ads</span>
                  </div>
                  {isLoadingConnectionStatus ? (
                    <Skeleton className="h-6 w-20 rounded-full" />
                  ) : syncingService === 'ads' ? (
                    <span className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Syncing...
                    </span>
                  ) : connectionStatus.hasAdsAccess ? (
                    <span className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Synced
                    </span>
                  ) : (
                    <span className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <XCircle className="h-3 w-3 mr-1" />
                      {connectionStatus.adsError ? 'Failed' : 'Not Found'}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {isLoadingConnectionStatus ? (
                      <>
                        <Skeleton className="h-3 w-32 mb-1" />
                        <Skeleton className="h-3 w-40" />
                      </>
                    ) : connectionStatus.hasAdsAccess ? (
                      <>
                        <p className="text-xs text-gray-600">
                          {connectionStatus.adsAccountCount} {connectionStatus.adsAccountCount === 1 ? 'account' : 'accounts'} accessible
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Last sync: {formatRelativeTime(connectionStatus.adsLastSyncedAt)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-red-600">{connectionStatus.adsError || 'No Google Ads accounts found'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Last sync: {formatRelativeTime(connectionStatus.adsLastSyncedAt)}
                        </p>
                      </>
                    )}
                  </div>
                  {!isLoadingConnectionStatus && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSyncService('ads')}
                      disabled={syncingService !== null}
                      className="ml-2"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Sync
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleGoogleDisconnect}
              disabled={disconnectGoogleAccount.isPending}
            >
              {disconnectGoogleAccount.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <Unlink className="mr-2 h-4 w-4" />
                  Disconnect Google Account
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800">No Google Account Connected</p>
                <p className="text-sm text-yellow-600">
                  Connect a Google account to enable Google Ads tracking and conversions.
                </p>
              </div>
            </div>

            {/* Show services even when not connected */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Service Status:</h4>

              {/* GTM Status - Not Connected */}
              <div className="p-4 border rounded-md bg-gray-50 border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">📊</span>
                    <span className="text-sm font-semibold text-gray-900">Google Tag Manager</span>
                  </div>
                  <span className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Not Connected
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Connect Google account to access GTM
                </p>
              </div>

              {/* GA4 Status - Not Connected */}
              <div className="p-4 border rounded-md bg-gray-50 border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">📊</span>
                    <span className="text-sm font-semibold text-gray-900">Google Analytics 4</span>
                  </div>
                  <span className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Not Connected
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Connect Google account to access GA4
                </p>
              </div>

              {/* Google Ads Status - Not Connected */}
              <div className="p-4 border rounded-md bg-gray-50 border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">📊</span>
                    <span className="text-sm font-semibold text-gray-900">Google Ads</span>
                  </div>
                  <span className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Not Connected
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Connect Google account to access Google Ads
                </p>
              </div>
            </div>

            <Button
              onClick={handleGoogleConnect}
              disabled={connectGoogleAccount.isPending}
            >
              {connectGoogleAccount.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connect Google Account
                </>
              )}
            </Button>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-2">What does this enable?</h4>
          <ul className="text-sm text-blue-600 space-y-1">
            <li>• Automatic conversion tracking setup</li>
            <li>• Real-time campaign performance data</li>
            <li>• Enhanced conversion attribution</li>
            <li>• Audience list management</li>
          </ul>
        </div>
      </div>

      {/* Customer Statistics */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Customer Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            {isLoadingCustomer ? (
              <Skeleton className="h-8 w-16 mx-auto mb-2" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">{customer?.totalCampaigns ?? 0}</p>
            )}
            <p className="text-sm text-gray-600">Total Campaigns</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            {isLoadingCustomer ? (
              <Skeleton className="h-8 w-20 mx-auto mb-2" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">${customer?.totalSpent.toFixed(2) ?? '0.00'}</p>
            )}
            <p className="text-sm text-gray-600">Total Spent</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            {isLoadingCustomer ? (
              <Skeleton className="h-8 w-24 mx-auto mb-2" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">
                {customer?.lastActivity
                  ? new Date(customer.lastActivity).toLocaleDateString()
                  : 'Never'
                }
              </p>
            )}
            <p className="text-sm text-gray-600">Last Activity</p>
          </div>
        </div>
      </div>
    </div>
  );
}