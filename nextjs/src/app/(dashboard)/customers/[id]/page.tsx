'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useApi } from '@/hooks/use-api';
import { useCustomerTrackings, useCreateTracking, type TrackingType, type TrackingDestination, type CreateTrackingInput } from '@/hooks/use-trackings';
import { useConnectGoogleAccount, useDisconnectGoogleAccount, useUpdateCustomer, useGtmAccounts, useSetupGtm } from '@/hooks/use-customers';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Activity,
  Plus,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  RefreshCw,
  Radar,
  Loader2,
  Globe,
  Save,
  BarChart3,
  Tag,
  MonitorSmartphone,
  Server,
  Copy,
  Mail,
  Unlink,
  AlertTriangle,
} from 'lucide-react';
import { Customer, StapeDnsRecord } from '@/types/customer';
import { AutoTrack } from '@/components/autotrack/AutoTrack';

const TRACKING_TYPES: { value: TrackingType; label: string }[] = [
  { value: 'BUTTON_CLICK', label: 'Button Click' },
  { value: 'LINK_CLICK', label: 'Link Click' },
  { value: 'PAGE_VIEW', label: 'Page View' },
  { value: 'FORM_SUBMIT', label: 'Form Submit' },
  { value: 'ADD_TO_CART', label: 'Add to Cart' },
  { value: 'PURCHASE', label: 'Purchase' },
  { value: 'SIGNUP', label: 'Sign Up' },
  { value: 'PHONE_CALL_CLICK', label: 'Phone Call Click' },
  { value: 'EMAIL_CLICK', label: 'Email Click' },
  { value: 'DOWNLOAD', label: 'Download' },
  { value: 'SCROLL_DEPTH', label: 'Scroll Depth' },
  { value: 'CUSTOM_EVENT', label: 'Custom Event' },
];

const DESTINATION_OPTIONS: { value: TrackingDestination; label: string }[] = [
  { value: 'BOTH', label: 'GA4 + Google Ads' },
  { value: 'GA4', label: 'GA4 Only' },
  { value: 'GOOGLE_ADS', label: 'Google Ads Only' },
];

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const api = useApi();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState('trackings');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [trackingName, setTrackingName] = useState('');
  const [trackingType, setTrackingType] = useState<TrackingType>('BUTTON_CLICK');
  const [trackingSelector, setTrackingSelector] = useState('');
  const [trackingUrlPattern, setTrackingUrlPattern] = useState('');
  const [trackingDestination, setTrackingDestination] = useState<TrackingDestination>('BOTH');

  // Handle OAuth redirect query params
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (success === 'true') {
      toast.success('Google account connected successfully');
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      // Clean URL params
      window.history.replaceState({}, '', `/customers/${id}`);
    } else if (error) {
      toast.error('Failed to connect Google account', {
        description: errorDescription || error,
      });
      window.history.replaceState({}, '', `/customers/${id}`);
    }
  }, [searchParams, id, queryClient]);

  // Base customer data - always loaded (no Google Ads/GA4 data)
  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get<Customer>(`/api/customers/${id}`),
  });

  // Google data - only loaded when Settings tab is active
  const { data: customerWithGoogle } = useQuery({
    queryKey: ['customer', id, 'google'],
    queryFn: () => api.get<Customer>(`/api/customers/${id}?includeGoogleAds=true`),
    enabled: activeTab === 'settings',
  });

  // Use Google-enriched customer data for Settings tab fields
  const settingsCustomer = customerWithGoogle || customer;

  const { data: trackings, isLoading: trackingsLoading } = useCustomerTrackings(id);
  const connectGoogle = useConnectGoogleAccount();
  const disconnectGoogle = useDisconnectGoogleAccount();
  const createTracking = useCreateTracking();
  const updateCustomer = useUpdateCustomer();

  // Server-side tracking mutations
  const enableStape = useMutation({
    mutationFn: async () => {
      return api.post(`/api/customers/${id}/stape`, { serverDomain });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      toast.success('Server-side tracking enabled', { description: 'Follow the DNS setup instructions.' });
    },
    onError: (error: Error) => {
      toast.error('Error', { description: error.message });
    },
  });

  const validateDomain = useMutation({
    mutationFn: async () => {
      return api.post<{ isValid: boolean }>(`/api/customers/${id}/stape/validate-domain`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      toast.success(
        data.isValid ? 'Domain verified!' : 'Domain not yet verified',
        {
          description: data.isValid
            ? 'Server-side tracking is now fully active.'
            : 'CNAME record not found. Please check your DNS settings and try again.',
        }
      );
    },
    onError: (error: Error) => {
      toast.error('Error', { description: error.message });
    },
  });

  const disableStape = useMutation({
    mutationFn: async () => {
      return api.delete(`/api/customers/${id}/stape`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      toast.success('Server-side tracking disabled');
    },
    onError: (error: Error) => {
      toast.error('Error', { description: error.message });
    },
  });

  const handleEnableServerSide = () => enableStape.mutate();
  const handleValidateDomain = () => validateDomain.mutate();
  const handleDisableServerSide = () => disableStape.mutate();

  // Backfill DNS records for containers created before the dnsRecords field existed
  useEffect(() => {
    if (customer?.stapeContainer && !customer.stapeContainer.dnsRecords) {
      api.get(`/api/customers/${id}/stape`).then(() => {
        queryClient.invalidateQueries({ queryKey: ['customer', id] });
      }).catch(() => {});
    }
  }, [customer?.stapeContainer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ads account selector state
  const [selectedAdsAccountId, setSelectedAdsAccountId] = useState<string | null>(null);
  const [adsAccountInitialized, setAdsAccountInitialized] = useState(false);

  // Initialize selectedAdsAccountId from customer data
  useEffect(() => {
    if (settingsCustomer && !adsAccountInitialized) {
      setSelectedAdsAccountId(settingsCustomer.selectedAdsAccountId || null);
      setAdsAccountInitialized(true);
    }
  }, [settingsCustomer, adsAccountInitialized]);

  const handleSaveAdsAccount = async (accountId: string) => {
    setSelectedAdsAccountId(accountId);
    try {
      await updateCustomer.mutateAsync({
        id,
        data: { selectedAdsAccountId: accountId },
      });
      toast.success('Google Ads account selected');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save';
      toast.error('Failed to select Ads account', { description: message });
    }
  };

  // GTM account selector
  const { data: gtmAccountsData, isLoading: gtmAccountsLoading, error: gtmAccountsError } = useGtmAccounts(
    id,
    activeTab === 'settings' && !!customer?.googleAccountId
  );
  const setupGtm = useSetupGtm();

  const handleSelectGtmAccount = async (accountId: string) => {
    try {
      await setupGtm.mutateAsync({ customerId: id, gtmAccountId: accountId });
      toast.success('GTM account configured', {
        description: 'Container and workspace created successfully.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to setup GTM';
      toast.error('Failed to configure GTM', { description: message });
    }
  };

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phone: '',
    websiteUrl: '',
    notes: '',
  });
  const [settingsInitialized, setSettingsInitialized] = useState(false);
  const [serverDomain, setServerDomain] = useState('');

  // Populate form when customer data loads
  useEffect(() => {
    if (customer && !settingsInitialized) {
      setSettingsForm({
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        email: customer.email || '',
        company: customer.company || '',
        phone: customer.phone || '',
        websiteUrl: customer.websiteUrl || '',
        notes: customer.notes || '',
      });
      setSettingsInitialized(true);
    }
  }, [customer, settingsInitialized]);

  const handleSaveSettings = async () => {
    try {
      await updateCustomer.mutateAsync({
        id,
        data: {
          firstName: settingsForm.firstName,
          lastName: settingsForm.lastName,
          email: settingsForm.email,
          company: settingsForm.company || undefined,
          phone: settingsForm.phone || undefined,
          websiteUrl: settingsForm.websiteUrl || undefined,
          notes: settingsForm.notes || undefined,
        },
      });
      toast.success('Customer settings saved');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save';
      toast.error('Failed to save settings', { description: message });
    }
  };

  const settingsChanged = customer && (
    settingsForm.firstName !== (customer.firstName || '') ||
    settingsForm.lastName !== (customer.lastName || '') ||
    settingsForm.email !== (customer.email || '') ||
    settingsForm.company !== (customer.company || '') ||
    settingsForm.phone !== (customer.phone || '') ||
    settingsForm.websiteUrl !== (customer.websiteUrl || '') ||
    settingsForm.notes !== (customer.notes || '')
  );

  const handleConnectGoogle = async () => {
    try {
      const result = await connectGoogle.mutateAsync(id);
      if (result.authUrl) {
        window.location.href = result.authUrl;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to connect Google account', { description: message });
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await disconnectGoogle.mutateAsync(id);
      queryClient.invalidateQueries({ queryKey: ['customer', id, 'google'] });
      toast.success('Google account disconnected');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to disconnect Google account', { description: message });
    }
  };

  const handleCreateTracking = async () => {
    if (!trackingName.trim()) {
      toast.error('Tracking name is required');
      return;
    }

    try {
      const input: CreateTrackingInput = {
        name: trackingName,
        type: trackingType,
        customerId: id,
        destinations: [trackingDestination],
        ...(trackingSelector && { selector: trackingSelector }),
        ...(trackingUrlPattern && { urlPattern: trackingUrlPattern }),
      };

      await createTracking.mutateAsync(input);
      toast.success('Tracking created successfully');
      setCreateDialogOpen(false);
      // Reset form
      setTrackingName('');
      setTrackingType('BUTTON_CLICK');
      setTrackingSelector('');
      setTrackingUrlPattern('');
      setTrackingDestination('BOTH');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create tracking';
      toast.error('Failed to create tracking', { description: message });
    }
  };

  if (customerLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">Customer not found</h1>
        <p className="text-gray-600 mt-2">The customer you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{customer.fullName}</h1>
          <p className="text-muted-foreground">{customer.email}</p>
        </div>
        <div className="flex gap-2">
          {customer.googleAccountId ? (
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle className="mr-1 h-4 w-4" />
              Google Connected
            </Badge>
          ) : (
            <Button onClick={handleConnectGoogle} disabled={connectGoogle.isPending}>
              {connectGoogle.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LinkIcon className="mr-2 h-4 w-4" />
              )}
              Connect Google
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="trackings">
            <Activity className="mr-2 h-4 w-4" />
            Trackings
          </TabsTrigger>
          <TabsTrigger value="autotrack">
            <Radar className="mr-2 h-4 w-4" />
            AutoTrack
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trackings" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!customer.googleAccountId}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Tracking
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Tracking</DialogTitle>
                  <DialogDescription>
                    Set up a new conversion tracking for this customer.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="tracking-name">Name *</Label>
                    <Input
                      id="tracking-name"
                      placeholder="e.g., Homepage CTA Click"
                      value={trackingName}
                      onChange={(e) => setTrackingName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={trackingType} onValueChange={(v) => setTrackingType(v as TrackingType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRACKING_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tracking-selector">CSS Selector</Label>
                    <Input
                      id="tracking-selector"
                      placeholder="e.g., #buy-now-btn, .cta-button"
                      value={trackingSelector}
                      onChange={(e) => setTrackingSelector(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tracking-url">URL Pattern</Label>
                    <Input
                      id="tracking-url"
                      placeholder="e.g., /thank-you, /checkout/*"
                      value={trackingUrlPattern}
                      onChange={(e) => setTrackingUrlPattern(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Destination</Label>
                    <Select value={trackingDestination} onValueChange={(v) => setTrackingDestination(v as TrackingDestination)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DESTINATION_OPTIONS.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTracking} disabled={createTracking.isPending}>
                    {createTracking.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {trackingsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : trackings?.trackings && trackings.trackings.length > 0 ? (
            <div className="grid gap-4">
              {trackings.trackings.map((tracking) => (
                <Card key={tracking.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{tracking.name}</CardTitle>
                      <Badge
                        className={
                          tracking.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : tracking.status === 'FAILED'
                              ? 'bg-red-100 text-red-700'
                              : tracking.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                        }
                      >
                        {tracking.status}
                      </Badge>
                    </div>
                    <CardDescription>{tracking.type}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {tracking.selector && (
                      <p className="text-sm">
                        <span className="font-medium">Selector:</span>{' '}
                        <code className="bg-gray-100 px-1 rounded">{tracking.selector}</code>
                      </p>
                    )}
                    {tracking.lastError && (
                      <p className="text-sm text-red-600 mt-2">
                        <span className="font-medium">Error:</span> {tracking.lastError}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Activity className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium">No trackings yet</h3>
                <p className="text-muted-foreground mt-2">
                  {customer.googleAccountId
                    ? 'Create your first tracking to start monitoring conversions.'
                    : 'Connect a Google account first to create trackings.'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="autotrack">
          {activeTab === 'autotrack' && (
            <AutoTrack
              customerId={id}
              customerWebsiteUrl={customer?.websiteUrl ?? undefined}
              hasGoogleConnected={!!customer?.googleAccountId}
            />
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {/* Customer Details Form */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Customer Details</CardTitle>
                  <CardDescription>Update customer information</CardDescription>
                </div>
                <Button
                  onClick={handleSaveSettings}
                  disabled={!settingsChanged || updateCustomer.isPending}
                >
                  {updateCustomer.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="settings-firstName">First Name</Label>
                  <Input
                    id="settings-firstName"
                    value={settingsForm.firstName}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-lastName">Last Name</Label>
                  <Input
                    id="settings-lastName"
                    value={settingsForm.lastName}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Last name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-email">Email</Label>
                  <Input
                    id="settings-email"
                    type="email"
                    value={settingsForm.email}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-company">Company</Label>
                  <Input
                    id="settings-company"
                    value={settingsForm.company}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-phone">Phone</Label>
                  <Input
                    id="settings-phone"
                    value={settingsForm.phone}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-websiteUrl">Website URL</Label>
                  <Input
                    id="settings-websiteUrl"
                    value={settingsForm.websiteUrl}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, websiteUrl: e.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-notes">Notes</Label>
                <Textarea
                  id="settings-notes"
                  value={settingsForm.notes}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Internal notes about this customer..."
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-4 pt-2 text-sm text-muted-foreground">
                <span>Status: <Badge variant="outline">{customer.status}</Badge></span>
                <span>Created: {new Date(customer.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Google Connection Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Google Connection Status</CardTitle>
                  <CardDescription>Connection status to Google services</CardDescription>
                </div>
                {!customer.googleAccountId ? (
                  <Button onClick={handleConnectGoogle} disabled={connectGoogle.isPending}>
                    {connectGoogle.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <LinkIcon className="mr-2 h-4 w-4" />
                    )}
                    Connect Google
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleConnectGoogle} disabled={connectGoogle.isPending}>
                      {connectGoogle.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Reconnect
                    </Button>
                    <Button variant="destructive" size="sm" disabled={disconnectGoogle.isPending} onClick={() => setDisconnectDialogOpen(true)}>
                      {disconnectGoogle.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Unlink className="mr-2 h-4 w-4" />
                      )}
                      Disconnect
                    </Button>
                    <Dialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Disconnect Google Account
                          </DialogTitle>
                          <DialogDescription>
                            This will remove the Google account connection and delete all synced Google Ads accounts and GA4 properties for this customer. Existing trackings will not be deleted from GTM but will no longer be managed by OneClickTag.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDisconnectDialogOpen(false)}>Cancel</Button>
                          <Button
                            variant="destructive"
                            onClick={async () => {
                              await handleDisconnectGoogle();
                              setDisconnectDialogOpen(false);
                            }}
                            disabled={disconnectGoogle.isPending}
                          >
                            {disconnectGoogle.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Disconnect
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Google Account */}
                <div className={`rounded-lg border p-4 ${customer.googleAccountId ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {customer.googleAccountId ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <span className="font-medium text-sm">Google Account</span>
                  </div>
                  {customer.googleAccountId ? (
                    <p className="text-xs text-muted-foreground truncate">{customer.googleEmail || 'Connected'}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Not connected</p>
                  )}
                </div>

                {/* GTM */}
                <div className={`rounded-lg border p-4 ${
                  customer.gtmContainerId
                    ? 'border-green-200 bg-green-50'
                    : customer.googleAccountId
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {customer.gtmContainerId ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : customer.googleAccountId ? (
                      <XCircle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <span className="font-medium text-sm">Google Tag Manager</span>
                    {customer.gtmContainerId && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-300 text-blue-600">Managed</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {customer.gtmContainerId
                        ? `OneClickTag workspace ready`
                        : customer.googleAccountId
                          ? 'Select a GTM account below'
                          : 'Not connected'}
                    </p>
                  </div>
                  {customer.gtmContainerName && (
                    <div className="flex items-center gap-1 mt-1">
                      <code className="text-xs bg-white/60 px-1.5 py-0.5 rounded font-mono">{customer.gtmContainerName}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(customer.gtmContainerName!);
                          toast.success('Container ID copied');
                        }}
                        className="text-muted-foreground hover:text-foreground"
                        title="Copy container ID"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Google Ads */}
                <div className={`rounded-lg border p-4 ${
                  settingsCustomer?.googleAdsAccounts && settingsCustomer.googleAdsAccounts.length > 0
                    ? 'border-green-200 bg-green-50'
                    : customer.googleAccountId
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {settingsCustomer?.googleAdsAccounts && settingsCustomer.googleAdsAccounts.length > 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : customer.googleAccountId ? (
                      <XCircle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <span className="font-medium text-sm">Google Ads</span>
                    {settingsCustomer?.googleAdsAccounts && settingsCustomer.googleAdsAccounts.length > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-300 text-blue-600">Managed</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <MonitorSmartphone className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {settingsCustomer?.googleAdsAccounts && settingsCustomer.googleAdsAccounts.length > 0
                        ? `${settingsCustomer.googleAdsAccounts.length} account${settingsCustomer.googleAdsAccounts.length > 1 ? 's' : ''}`
                        : customer.googleAccountId
                          ? 'No accounts found'
                          : 'Not connected'}
                    </p>
                  </div>
                </div>

                {/* GA4 */}
                <div className={`rounded-lg border p-4 ${
                  settingsCustomer?.ga4Properties && settingsCustomer.ga4Properties.length > 0
                    ? 'border-green-200 bg-green-50'
                    : customer.googleAccountId
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {settingsCustomer?.ga4Properties && settingsCustomer.ga4Properties.length > 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : customer.googleAccountId ? (
                      <XCircle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <span className="font-medium text-sm">Google Analytics 4</span>
                    {settingsCustomer?.ga4Properties && settingsCustomer.ga4Properties.length > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-300 text-blue-600">Managed</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {settingsCustomer?.ga4Properties && settingsCustomer.ga4Properties.length > 0
                        ? `${settingsCustomer.ga4Properties.length} propert${settingsCustomer.ga4Properties.length > 1 ? 'ies' : 'y'}`
                        : customer.googleAccountId
                          ? 'No properties found'
                          : 'Not connected'}
                    </p>
                  </div>
                  {settingsCustomer?.ga4Properties?.[0]?.measurementId && (
                    <div className="flex items-center gap-1 mt-1">
                      <code className="text-xs bg-white/60 px-1.5 py-0.5 rounded font-mono">{settingsCustomer.ga4Properties[0].measurementId}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(settingsCustomer.ga4Properties![0].measurementId!);
                          toast.success('Measurement ID copied');
                        }}
                        className="text-muted-foreground hover:text-foreground"
                        title="Copy measurement ID"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* GTM Account Selector */}
              {customer.googleAccountId && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">GTM Account</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select which Google Tag Manager account to use. OneClickTag will create a container and workspace in this account.
                  </p>
                  {gtmAccountsError ? (
                    <p className="text-xs text-red-600">
                      Failed to load GTM accounts. Try disconnecting and reconnecting Google.
                    </p>
                  ) : gtmAccountsLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : gtmAccountsData?.gtmAccounts && gtmAccountsData.gtmAccounts.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={customer.gtmAccountId || ''}
                        onValueChange={handleSelectGtmAccount}
                        disabled={setupGtm.isPending}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a GTM account..." />
                        </SelectTrigger>
                        <SelectContent>
                          {gtmAccountsData.gtmAccounts.map((account) => (
                            <SelectItem key={account.accountId} value={account.accountId}>
                              {account.name} ({account.accountId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {setupGtm.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-yellow-600">
                      No GTM accounts found. Create one at{' '}
                      <a href="https://tagmanager.google.com" target="_blank" rel="noopener noreferrer" className="underline">
                        tagmanager.google.com
                      </a>
                    </p>
                  )}
                </div>
              )}

              {/* Google Ads Account Selector */}
              {settingsCustomer?.googleAdsAccounts && settingsCustomer.googleAdsAccounts.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Google Ads Account</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select which Google Ads account to use for conversion tracking.
                  </p>
                  <Select
                    value={selectedAdsAccountId || ''}
                    onValueChange={handleSaveAdsAccount}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an Ads account..." />
                    </SelectTrigger>
                    <SelectContent>
                      {settingsCustomer.googleAdsAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.accountName} ({account.accountId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* GA4 Properties Detail */}
              {settingsCustomer?.ga4Properties && settingsCustomer.ga4Properties.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">GA4 Data Streams</h4>
                  <div className="space-y-2">
                    {settingsCustomer.ga4Properties.map((property) => (
                      <div key={property.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                        <div>
                          <span className="font-medium">{property.displayName || property.propertyName}</span>
                          {property.measurementId && (
                            <code className="text-muted-foreground ml-2 bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{property.measurementId}</code>
                          )}
                        </div>
                        <Badge variant={property.isActive ? 'default' : 'secondary'}>
                          {property.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GTM Snippet Installation */}
              {customer.gtmContainerName && (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h4 className="text-sm font-medium mb-1">GTM Snippet Installation</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Add this snippet to the customer&apos;s website &lt;head&gt; tag to enable tracking.
                  </p>
                  <div className="relative">
                    <pre className="bg-white rounded border p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${customer.gtmContainerName}');</script>
<!-- End Google Tag Manager -->`}
                    </pre>
                    <button
                      onClick={() => {
                        const snippet = `<!-- Google Tag Manager -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':\nnew Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],\nj=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=\n'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);\n})(window,document,'script','dataLayer','${customer.gtmContainerName}');</script>\n<!-- End Google Tag Manager -->`;
                        navigator.clipboard.writeText(snippet);
                        toast.success('GTM snippet copied to clipboard');
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded bg-white border hover:bg-gray-50"
                      title="Copy snippet"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Managed infrastructure info */}
              {customer.googleAccountId && (
                <div className="mt-4 rounded-lg border border-muted p-4">
                  <p className="text-xs text-muted-foreground">
                    OneClickTag creates and manages its own GTM container, GA4 property, and Ads labels for this customer.
                    All tracking tags and triggers are created in an isolated workspace, separate from any existing setup.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Server-Side Tracking (Stape) */}
          {customer.googleAccountId && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Server-Side Tracking</CardTitle>
                    <CardDescription>
                      Route tracking through a server for better accuracy and ad-blocker bypass
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!customer.serverSideEnabled && !customer.stapeContainer ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="serverDomain">Custom Tracking Domain</Label>
                      <Input
                        id="serverDomain"
                        value={serverDomain}
                        onChange={(e) => setServerDomain(e.target.value)}
                        placeholder="track.yoursite.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter a subdomain of your customer&apos;s website (e.g., track.acme.com)
                      </p>
                    </div>
                    <Button
                      onClick={handleEnableServerSide}
                      disabled={!serverDomain || enableStape.isPending}
                    >
                      {enableStape.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Server className="mr-2 h-4 w-4" />
                      )}
                      Enable Server-Side Tracking
                    </Button>
                  </div>
                ) : customer.stapeContainer ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className={`rounded-lg border p-4 ${
                        customer.stapeContainer.status === 'ACTIVE'
                          ? 'border-green-200 bg-green-50'
                          : customer.stapeContainer.status === 'FAILED'
                            ? 'border-red-200 bg-red-50'
                            : 'border-yellow-200 bg-yellow-50'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {customer.stapeContainer.status === 'ACTIVE' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : customer.stapeContainer.status === 'FAILED' ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
                          )}
                          <span className="font-medium text-sm">sGTM Container</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{customer.stapeContainer.containerName}</p>
                        <p className="text-xs text-muted-foreground">Status: {customer.stapeContainer.status}</p>
                      </div>

                      <div className={`rounded-lg border p-4 ${
                        customer.stapeContainer.domainStatus === 'VALIDATED'
                          ? 'border-green-200 bg-green-50'
                          : customer.stapeContainer.domainStatus === 'FAILED'
                            ? 'border-red-200 bg-red-50'
                            : 'border-yellow-200 bg-yellow-50'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {customer.stapeContainer.domainStatus === 'VALIDATED' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : customer.stapeContainer.domainStatus === 'FAILED' ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
                          )}
                          <span className="font-medium text-sm">Custom Domain</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{customer.stapeContainer.serverDomain}</p>
                        <p className="text-xs text-muted-foreground">Status: {customer.stapeContainer.domainStatus}</p>
                      </div>
                    </div>

                    {customer.stapeContainer.domainStatus !== 'VALIDATED' && (() => {
                      const dnsRecords = (customer.stapeContainer!.dnsRecords || []) as StapeDnsRecord[];
                      const domain = customer.stapeContainer!.serverDomain;

                      const formatDnsText = () => {
                        if (dnsRecords.length === 0) {
                          return `Type: CNAME\nHost: ${domain.split('.')[0]}\nPoints to: ${customer.stapeContainer!.stapeDefaultDomain}`;
                        }
                        return dnsRecords.map(r =>
                          `Type: ${r.type?.type?.toUpperCase() || 'CNAME'}  |  Host: ${r.host || domain.split('.')[0]}  |  Value: ${r.value}`
                        ).join('\n');
                      };

                      const handleCopyDns = () => {
                        navigator.clipboard.writeText(formatDnsText());
                        toast.success('DNS records copied to clipboard');
                      };

                      const handleEmailDns = () => {
                        const subject = encodeURIComponent(`DNS Records for ${domain}`);
                        const body = encodeURIComponent(
                          `Please add the following DNS records for ${domain}:\n\n${formatDnsText()}\n\nThese records are required to verify the server-side tracking domain.`
                        );
                        window.open(`mailto:?subject=${subject}&body=${body}`);
                      };

                      return (
                        <div className={`rounded-lg border p-4 ${
                          customer.stapeContainer!.domainStatus === 'FAILED'
                            ? 'border-red-200 bg-red-50'
                            : 'border-blue-200 bg-blue-50'
                        }`}>
                          <h4 className="text-sm font-medium mb-2">
                            {customer.stapeContainer!.domainStatus === 'FAILED'
                              ? 'Domain Verification Failed'
                              : 'DNS Setup Required'}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {customer.stapeContainer!.domainStatus === 'FAILED'
                              ? 'DNS records not found yet. Add the records below and try again:'
                              : 'Add these DNS records in your domain provider:'}
                          </p>

                          {dnsRecords.length > 0 ? (
                            <div className="bg-white rounded border overflow-hidden">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b bg-muted/50">
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Type</th>
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Host</th>
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Value</th>
                                  </tr>
                                </thead>
                                <tbody className="font-mono text-xs">
                                  {dnsRecords.map((record, idx) => (
                                    <tr key={idx} className={idx < dnsRecords.length - 1 ? 'border-b' : ''}>
                                      <td className="px-3 py-2 font-semibold">{record.type?.type?.toUpperCase() || '—'}</td>
                                      <td className="px-3 py-2">{record.host || domain.split('.')[0]}</td>
                                      <td className="px-3 py-2 break-all">{record.value}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="bg-white rounded border p-3 font-mono text-sm space-y-1">
                              <p><span className="text-muted-foreground">Type:</span> CNAME</p>
                              <p><span className="text-muted-foreground">Host:</span> {domain.split('.')[0]}</p>
                              <p><span className="text-muted-foreground">Points to:</span> {customer.stapeContainer!.stapeDefaultDomain}</p>
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleValidateDomain}
                              disabled={validateDomain.isPending}
                            >
                              {validateDomain.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                              )}
                              {customer.stapeContainer!.domainStatus === 'FAILED' ? 'Retry Verification' : 'Verify Domain'}
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleCopyDns}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Records
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleEmailDns}>
                              <Mail className="mr-2 h-4 w-4" />
                              Email Records
                            </Button>
                          </div>
                        </div>
                      );
                    })()}

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDisableServerSide}
                      disabled={disableStape.isPending}
                    >
                      Disable Server-Side Tracking
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
