'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { useUpdateTracking, useSyncTracking } from '@/hooks/use-trackings';
import type { Tracking, GoogleHealth, TrackingDestination } from '@/hooks/use-trackings';
import { TRACKING_TYPE_FIELD_CONFIG } from '@/lib/tracking-config';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Clock,
  Shield,
  Pencil,
  Wrench,
  Save,
  X,
} from 'lucide-react';

interface TrackingDetailModalProps {
  tracking: Tracking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TRACKING_TYPE_LABELS: Record<string, string> = {
  BUTTON_CLICK: 'Button Click',
  LINK_CLICK: 'Link Click',
  PAGE_VIEW: 'Page View',
  FORM_SUBMIT: 'Form Submit',
  ADD_TO_CART: 'Add to Cart',
  PURCHASE: 'Purchase',
  SIGNUP: 'Sign Up',
  PHONE_CALL_CLICK: 'Phone Call Click',
  EMAIL_CLICK: 'Email Click',
  DOWNLOAD: 'Download',
  SCROLL_DEPTH: 'Scroll Depth',
  CUSTOM_EVENT: 'Custom Event',
  ELEMENT_VISIBILITY: 'Element Visibility',
  FORM_START: 'Form Start',
  FORM_ABANDON: 'Form Abandon',
  REMOVE_FROM_CART: 'Remove from Cart',
  ADD_TO_WISHLIST: 'Add to Wishlist',
  VIEW_CART: 'View Cart',
  CHECKOUT_START: 'Checkout Start',
  CHECKOUT_STEP: 'Checkout Step',
  PRODUCT_VIEW: 'Product View',
  DEMO_REQUEST: 'Demo Request',
  TIME_ON_PAGE: 'Time on Page',
  VIDEO_PLAY: 'Video Play',
  VIDEO_COMPLETE: 'Video Complete',
  SITE_SEARCH: 'Site Search',
  NEWSLETTER_SIGNUP: 'Newsletter Signup',
};

const DESTINATION_OPTIONS: { value: TrackingDestination; label: string }[] = [
  { value: 'BOTH', label: 'GA4 + Google Ads' },
  { value: 'GA4', label: 'GA4 Only' },
  { value: 'GOOGLE_ADS', label: 'Google Ads Only' },
];

function getDestinationLabel(destinations: string[]): string {
  if (destinations.includes('BOTH')) return 'GA4 + Google Ads';
  if (destinations.includes('GA4') && destinations.includes('GOOGLE_ADS')) return 'GA4 + Google Ads';
  if (destinations.includes('GOOGLE_ADS')) return 'Google Ads Only';
  return 'GA4 Only';
}

function getDestinationValue(destinations: string[]): TrackingDestination {
  if (destinations.includes('BOTH')) return 'BOTH';
  if (destinations.includes('GA4') && destinations.includes('GOOGLE_ADS')) return 'BOTH';
  if (destinations.includes('GOOGLE_ADS')) return 'GOOGLE_ADS';
  return 'GA4';
}

function hasAdsDestination(destinations: string[]): boolean {
  return destinations.includes('GOOGLE_ADS') || destinations.includes('BOTH');
}

function formatTimeAgo(dateStr: string | undefined): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

const HEALTH_LABELS: Record<GoogleHealth, { label: string; color: string; description: string }> = {
  HEALTHY: {
    label: 'Verified on Google',
    color: 'text-green-600',
    description: 'All tracking components exist and are active on Google.',
  },
  MISSING_TRIGGER: {
    label: 'Trigger Missing',
    color: 'text-red-600',
    description: 'The GTM trigger for this tracking was deleted or cannot be found.',
  },
  MISSING_TAG: {
    label: 'Tag Missing',
    color: 'text-red-600',
    description: 'One or more GTM tags for this tracking were deleted or cannot be found.',
  },
  MISSING_CONVERSION: {
    label: 'Conversion Action Missing',
    color: 'text-red-600',
    description: 'The Google Ads conversion action was removed.',
  },
  WORKSPACE_GONE: {
    label: 'Workspace Deleted',
    color: 'text-red-600',
    description: 'The GTM workspace was deleted. All trackings for this customer need to be re-created.',
  },
  UNCHECKED: {
    label: 'Not yet verified',
    color: 'text-muted-foreground',
    description: 'This tracking has not been verified against Google yet. Click "Verify Now" to check.',
  },
};

function needsRepair(tracking: Tracking): boolean {
  if (tracking.status === 'FAILED') return true;
  const health = tracking.googleHealth;
  if (health && health !== 'HEALTHY' && health !== 'UNCHECKED') return true;
  return false;
}

export function TrackingDetailModal({ tracking, open, onOpenChange }: TrackingDetailModalProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [verifying, setVerifying] = useState(false);
  const [editing, setEditing] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editSelector, setEditSelector] = useState('');
  const [editUrlPattern, setEditUrlPattern] = useState('');
  const [editConversionValue, setEditConversionValue] = useState<number | undefined>();
  const [editDestination, setEditDestination] = useState<TrackingDestination>('BOTH');

  const updateTracking = useUpdateTracking();
  const syncTracking = useSyncTracking();

  // Reset edit state when tracking changes or modal closes
  useEffect(() => {
    if (tracking && open) {
      setEditName(tracking.name);
      setEditSelector(tracking.selector || '');
      setEditUrlPattern(tracking.urlPattern || '');
      setEditConversionValue(undefined);
      setEditDestination(getDestinationValue(tracking.destinations));
    }
    if (!open) {
      setEditing(false);
    }
  }, [tracking, open]);

  const verifyHealth = useMutation({
    mutationFn: async () => {
      setVerifying(true);
      return api.post(`/api/customers/${tracking?.customerId}/health-check`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackings'] });
      queryClient.invalidateQueries({ queryKey: ['trackings', { customerId: tracking?.customerId }] });
    },
    onSettled: () => {
      setVerifying(false);
    },
  });

  if (!tracking) return null;

  const health = tracking.googleHealth || 'UNCHECKED';
  const healthInfo = HEALTH_LABELS[health];
  const showAds = hasAdsDestination(tracking.destinations);
  const fieldConfig = TRACKING_TYPE_FIELD_CONFIG[tracking.type];
  const canEdit = tracking.status !== 'CREATING' && tracking.status !== 'SYNCING';
  const showRepair = needsRepair(tracking);

  const statusColor = tracking.status === 'ACTIVE'
    ? 'bg-green-100 text-green-700'
    : tracking.status === 'FAILED'
      ? 'bg-red-100 text-red-700'
      : tracking.status === 'PENDING' || tracking.status === 'CREATING' || tracking.status === 'SYNCING'
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-gray-100 text-gray-700';

  function handleSave() {
    if (!tracking) return;

    const data: Record<string, unknown> = {};
    if (editName !== tracking.name) data.name = editName;
    if (editSelector !== (tracking.selector || '')) data.selector = editSelector || null;
    if (editUrlPattern !== (tracking.urlPattern || '')) data.urlPattern = editUrlPattern || null;
    if (editConversionValue !== undefined) data.adsConversionValue = editConversionValue;

    const currentDest = getDestinationValue(tracking.destinations);
    if (editDestination !== currentDest) data.destinations = [editDestination];

    if (Object.keys(data).length === 0) {
      setEditing(false);
      return;
    }

    updateTracking.mutate(
      { id: tracking.id, data: data as Partial<Tracking> },
      {
        onSuccess: () => {
          toast.success('Tracking updated');
          setEditing(false);
          queryClient.invalidateQueries({ queryKey: ['trackings'] });
        },
        onError: (err: Error) => {
          toast.error(err.message || 'Failed to update tracking');
        },
      }
    );
  }

  function handleRepair() {
    if (!tracking) return;
    syncTracking.mutate(tracking.id, {
      onSuccess: () => {
        toast.success('Repair started - syncing tracking to Google');
        queryClient.invalidateQueries({ queryKey: ['trackings'] });
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Failed to start repair');
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{tracking.name}</DialogTitle>
          <DialogDescription>
            {TRACKING_TYPE_LABELS[tracking.type] || tracking.type}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Row */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Status:</span>
              <Badge className={statusColor}>{tracking.status}</Badge>
            </div>
            <div className="text-muted-foreground">
              <Clock className="inline h-3 w-3 mr-1" />
              Created {formatTimeAgo(tracking.createdAt)}
            </div>
          </div>

          {tracking.lastSyncAt && (
            <p className="text-xs text-muted-foreground">
              Last synced: {formatTimeAgo(tracking.lastSyncAt)}
            </p>
          )}

          {/* Edit Mode */}
          {editing ? (
            <div className="rounded-lg border p-3 space-y-3">
              <h4 className="text-xs font-medium uppercase text-muted-foreground">Edit Configuration</h4>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              {fieldConfig.showSelector && (
                <div className="space-y-2">
                  <Label htmlFor="edit-selector">CSS Selector</Label>
                  <Input
                    id="edit-selector"
                    placeholder={fieldConfig.selectorPlaceholder}
                    value={editSelector}
                    onChange={(e) => setEditSelector(e.target.value)}
                  />
                </div>
              )}

              {fieldConfig.showUrlPattern && (
                <div className="space-y-2">
                  <Label htmlFor="edit-url">URL Pattern</Label>
                  <Input
                    id="edit-url"
                    placeholder={fieldConfig.urlPatternPlaceholder}
                    value={editUrlPattern}
                    onChange={(e) => setEditUrlPattern(e.target.value)}
                  />
                </div>
              )}

              {fieldConfig.showConversionValue && (
                <div className="space-y-2">
                  <Label htmlFor="edit-value">Conversion Value</Label>
                  <Input
                    id="edit-value"
                    type="number"
                    placeholder="e.g., 29.99"
                    value={editConversionValue ?? ''}
                    onChange={(e) => setEditConversionValue(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Destination</Label>
                <Select value={editDestination} onValueChange={(v) => setEditDestination(v as TrackingDestination)}>
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
          ) : (
            <>
              {/* View Mode - Configuration */}
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="text-xs font-medium uppercase text-muted-foreground">Configuration</h4>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <span>{TRACKING_TYPE_LABELS[tracking.type] || tracking.type}</span>

                  {tracking.selector && (
                    <>
                      <span className="text-muted-foreground">Target:</span>
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono truncate">
                        {tracking.selector}
                      </code>
                    </>
                  )}

                  {tracking.urlPattern && (
                    <>
                      <span className="text-muted-foreground">URL:</span>
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono truncate">
                        {tracking.urlPattern}
                      </code>
                    </>
                  )}

                  <span className="text-muted-foreground">Sends to:</span>
                  <span>{getDestinationLabel(tracking.destinations)}</span>

                  {tracking.trackingMode && (
                    <>
                      <span className="text-muted-foreground">Mode:</span>
                      <span>{tracking.trackingMode === 'SERVER_SIDE' ? 'Server-Side' : 'Client-Side'}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Sync Status to Google */}
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="text-xs font-medium uppercase text-muted-foreground">Sync Status</h4>
                <div className="space-y-1.5 text-sm">
                  <SyncStatusRow label="GTM Trigger" synced={!!tracking.gtmTriggerId} />
                  <SyncStatusRow label="GTM GA4 Tag" synced={!!tracking.gtmTagIdGA4} />
                  {showAds && (
                    <>
                      <SyncStatusRow label="GTM Ads Tag" synced={!!tracking.gtmTagIdAds} />
                      <SyncStatusRow label="Ads Conversion" synced={!!tracking.adsConversionLabel || !!tracking.conversionActionId} />
                    </>
                  )}
                </div>
              </div>

              {/* GA4 Section */}
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium uppercase text-muted-foreground">Google Analytics 4</h4>
                  {tracking.status === 'ACTIVE' && tracking.gtmTagIdGA4 && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <div className="mt-1 text-sm">
                  <span className="text-muted-foreground">Event Name: </span>
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                    {tracking.ga4EventName || tracking.name.toLowerCase().replace(/\s+/g, '_')}
                  </code>
                </div>
              </div>

              {/* Google Ads Section */}
              {showAds && (
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-medium uppercase text-muted-foreground">Google Ads</h4>
                    {tracking.status === 'ACTIVE' && tracking.adsConversionLabel && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div className="mt-1 text-sm">
                    <span className="text-muted-foreground">Conversion: </span>
                    <span>{tracking.adsConversionLabel ? 'Active' : 'Not configured'}</span>
                  </div>
                </div>
              )}

              {/* Google Verification Section */}
              {tracking.status === 'ACTIVE' && (
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-medium uppercase text-muted-foreground">Google Verification</h4>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    {health === 'HEALTHY' ? (
                      <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                    ) : health === 'UNCHECKED' ? (
                      <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                    )}
                    <span className={healthInfo.color}>{healthInfo.label}</span>
                    {tracking.lastHealthCheckAt && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        ({formatTimeAgo(tracking.lastHealthCheckAt)})
                      </span>
                    )}
                  </div>

                  {health !== 'HEALTHY' && health !== 'UNCHECKED' && (
                    <div className="rounded bg-red-50 border border-red-200 p-2 text-xs text-red-700">
                      {healthInfo.description}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => verifyHealth.mutate()}
                    disabled={verifying || verifyHealth.isPending}
                  >
                    {verifying || verifyHealth.isPending ? (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                      <Shield className="mr-2 h-3 w-3" />
                    )}
                    Verify Now
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Error display */}
          {tracking.lastError && (
            <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <span className="font-medium">Sync Error: </span>
              {tracking.lastError}
            </div>
          )}
        </div>

        {/* Footer with actions */}
        <DialogFooter className="flex gap-2 sm:gap-0">
          {editing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(false)}
                disabled={updateTracking.isPending}
              >
                <X className="mr-2 h-3 w-3" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateTracking.isPending || !editName.trim()}
              >
                {updateTracking.isPending ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <Save className="mr-2 h-3 w-3" />
                )}
                Save
              </Button>
            </>
          ) : (
            <>
              {showRepair && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRepair}
                  disabled={syncTracking.isPending || tracking.status === 'SYNCING' || tracking.status === 'CREATING'}
                >
                  {syncTracking.isPending ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <Wrench className="mr-2 h-3 w-3" />
                  )}
                  Repair
                </Button>
              )}
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="mr-2 h-3 w-3" />
                  Edit
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SyncStatusRow({ label, synced }: { label: string; synced: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {synced ? (
          <>
            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
            <span className="text-xs text-green-600">Created</span>
          </>
        ) : (
          <>
            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Not created</span>
          </>
        )}
      </div>
    </div>
  );
}
