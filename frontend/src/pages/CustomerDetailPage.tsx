import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Settings,
  BarChart3,
  List,
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomerSettings } from '@/components/customers/CustomerSettings';
import { CustomerAnalytics } from '@/components/customers/CustomerAnalytics';
import { CurrentTrackings } from '@/components/customers/CurrentTrackings';
import { CreateTrackingForm } from '@/components/customers/CreateTrackingForm';
import {
  useCustomerBySlug,
  useGoogleConnectionStatus,
} from '@/hooks/useCustomers';
import { useSyncAllTrackings } from '@/hooks/useTracking';
import { useSSE } from '@/hooks/useSSE';
import { Tracking } from '@/types/tracking.types';
import { useRequireAuth } from '@/lib/api/hooks/useAuth';

export default function CustomerDetailPage() {
  const { customerName } = useParams<{ customerName: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = React.useState(
    (location.state as any)?.activeTab || 'settings'
  );
  const [editingTracking, setEditingTracking] = React.useState<
    Tracking | undefined
  >();

  // Authentication - use the dedicated hook that handles redirects
  const { isAuthenticated, loading: authLoading } = useRequireAuth({
    redirectTo: '/login',
  });

  // Fetch customer directly by slug (customerName parameter is actually the slug)
  const customerQuery = useCustomerBySlug(customerName || '', {
    enabled: isAuthenticated, // Only fetch when authenticated
  });

  const customer = customerQuery.data;
  const isLoadingCustomer = customerQuery.isLoading;
  const error = customerQuery.error;
  const refetch = customerQuery.refetch;

  const customerId = customer?.id;

  const { data: connectionStatus, isLoading: isLoadingConnectionStatus } =
    useGoogleConnectionStatus(customerId || '');

  const syncAllTrackings = useSyncAllTrackings();

  // Real-time connection status
  const { isConnected } = useSSE({
    customerId: customerId || undefined,
    enabled: !!customerId && isAuthenticated,
  });

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!customerName) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Customer slug is required</p>
      </div>
    );
  }

  // Show loading while fetching customer
  if (isLoadingCustomer) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If customer not found
  if (!isLoadingCustomer && !customer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-yellow-500" />
        <p className="text-yellow-600">
          Customer with slug "{customerName}" not found
        </p>
        <Button onClick={() => navigate('/customers')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customers
        </Button>
      </div>
    );
  }

  // Show error if there is one
  if (error && !customer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-red-600">Failed to load customer details</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const handleSyncAll = async () => {
    if (!customerId) return;
    try {
      await syncAllTrackings.mutateAsync(customerId);
    } catch (error) {
      console.error('Failed to sync all trackings:', error);
    }
  };

  const handleEditTracking = (tracking: Tracking) => {
    setEditingTracking(tracking);
    setActiveTab('create-track');
  };

  const handleTrackingSuccess = () => {
    setEditingTracking(undefined);
    setActiveTab('trackings');
  };

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/customers')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <div className="flex items-center space-x-3">
              {isLoadingCustomer ? (
                <Skeleton className="h-8 w-48" />
              ) : (
                <h1 className="text-2xl font-bold">
                  {customer?.name || customerName?.replace(/-/g, ' ')}
                </h1>
              )}
              {isLoadingCustomer ? (
                <Skeleton className="h-6 w-16 rounded-full" />
              ) : (
                customer && (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[customer.status]}`}
                  >
                    {customer.status}
                  </span>
                )
              )}
              {/* Service Status Badges */}
              <div className="flex items-center space-x-2">
                {isLoadingConnectionStatus ? (
                  <>
                    {/* GTM Status - Syncing */}
                    <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded">
                      <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
                      <span className="text-xs font-medium text-blue-700">
                        GTM
                      </span>
                    </div>
                    {/* GA4 Status - Syncing */}
                    <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded">
                      <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
                      <span className="text-xs font-medium text-blue-700">
                        GA4
                      </span>
                    </div>
                    {/* Ads Status - Syncing */}
                    <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded">
                      <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
                      <span className="text-xs font-medium text-blue-700">
                        Ads
                      </span>
                    </div>
                  </>
                ) : connectionStatus?.connected ? (
                  <>
                    {/* GTM Status */}
                    <div
                      className={`flex items-center space-x-1 px-2 py-1 rounded ${
                        connectionStatus.hasGTMAccess
                          ? 'bg-green-50 border border-green-200 text-green-700'
                          : 'bg-red-50 border border-red-200 text-red-700'
                      }`}
                    >
                      <span className="text-xs font-medium">
                        GTM {connectionStatus.hasGTMAccess ? '✓' : '✗'}
                      </span>
                    </div>
                    {/* GA4 Status */}
                    <div
                      className={`flex items-center space-x-1 px-2 py-1 rounded ${
                        connectionStatus.hasGA4Access
                          ? 'bg-green-50 border border-green-200 text-green-700'
                          : 'bg-gray-50 border border-gray-200 text-gray-500'
                      }`}
                    >
                      <span className="text-xs font-medium">
                        GA4 {connectionStatus.hasGA4Access ? '✓' : '✗'}
                      </span>
                    </div>
                    {/* Ads Status */}
                    <div
                      className={`flex items-center space-x-1 px-2 py-1 rounded ${
                        connectionStatus.hasAdsAccess
                          ? 'bg-green-50 border border-green-200 text-green-700'
                          : 'bg-red-50 border border-red-200 text-red-700'
                      }`}
                    >
                      <span className="text-xs font-medium">
                        Ads {connectionStatus.hasAdsAccess ? '✓' : '✗'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded">
                    <AlertCircle className="h-3 w-3 text-yellow-600" />
                    <span className="text-xs font-medium text-yellow-700">
                      Not Connected
                    </span>
                  </div>
                )}
              </div>
            </div>
            {isLoadingCustomer ? (
              <>
                <Skeleton className="h-4 w-64 mt-1" />
                <Skeleton className="h-4 w-40 mt-1" />
              </>
            ) : (
              customer && (
                <>
                  <p className="text-muted-foreground">{customer.email}</p>
                  {customer.company && (
                    <p className="text-sm text-muted-foreground">
                      {customer.company}
                    </p>
                  )}
                </>
              )
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Real-time Connection Status */}
          <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-yellow-600" />
            )}
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Live sync' : 'Offline'}
            </span>
          </div>

          <Button
            variant="outline"
            onClick={handleSyncAll}
            disabled={syncAllTrackings.isPending || !customerId}
          >
            {syncAllTrackings.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync All
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Customer Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm font-medium text-muted-foreground">
            Total Campaigns
          </p>
          {isLoadingCustomer ? (
            <Skeleton className="h-8 w-20 mt-1" />
          ) : (
            <p className="text-2xl font-bold">
              {customer?.totalCampaigns ?? 0}
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm font-medium text-muted-foreground">
            Total Spent
          </p>
          {isLoadingCustomer ? (
            <Skeleton className="h-8 w-20 mt-1" />
          ) : (
            <p className="text-2xl font-bold">
              ${customer?.totalSpent.toFixed(2) ?? '0.00'}
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm font-medium text-muted-foreground">Tags</p>
          {isLoadingCustomer ? (
            <div className="flex gap-1 mt-1">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-1 mt-1">
              {customer?.tags.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  className="inline-block rounded-full bg-secondary px-2 py-1 text-xs"
                >
                  {tag}
                </span>
              ))}
              {(customer?.tags.length ?? 0) > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{(customer?.tags.length ?? 0) - 2} more
                </span>
              )}
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm font-medium text-muted-foreground">
            Last Activity
          </p>
          {isLoadingCustomer ? (
            <Skeleton className="h-7 w-24 mt-1" />
          ) : (
            <p className="text-lg font-semibold">
              {customer?.lastActivity
                ? new Date(customer.lastActivity).toLocaleDateString()
                : 'Never'}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="flex items-center space-x-2"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger
            value="trackings"
            className="flex items-center space-x-2"
          >
            <List className="h-4 w-4" />
            <span>Current Trackings</span>
          </TabsTrigger>
          <TabsTrigger
            value="create-track"
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Track</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <CustomerSettings
            customer={customer}
            isLoadingCustomer={isLoadingCustomer}
            connectionStatus={connectionStatus}
            isLoadingConnectionStatus={isLoadingConnectionStatus}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {customerId ? (
            <CustomerAnalytics customerId={customerId} />
          ) : (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        </TabsContent>

        <TabsContent value="trackings" className="space-y-4">
          {customerId ? (
            <CurrentTrackings
              customerId={customerId}
              onEditTracking={handleEditTracking}
            />
          ) : (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        </TabsContent>

        <TabsContent value="create-track" className="space-y-4">
          {customerId ? (
            <CreateTrackingForm
              customerId={customerId}
              customerSlug={customerName}
              tracking={editingTracking}
              onSuccess={handleTrackingSuccess}
              onCancel={() => {
                setEditingTracking(undefined);
                setActiveTab('trackings');
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
