'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import type { Tracking, GoogleHealth } from '@/hooks/use-trackings';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Clock,
  Shield,
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

function getDestinationLabel(destinations: string[]): string {
  if (destinations.includes('BOTH')) return 'GA4 + Google Ads';
  if (destinations.includes('GA4') && destinations.includes('GOOGLE_ADS')) return 'GA4 + Google Ads';
  if (destinations.includes('GOOGLE_ADS')) return 'Google Ads Only';
  return 'GA4 Only';
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
    description: 'The GTM trigger for this tracking was deleted or cannot be found. Re-create the tracking to fix this.',
  },
  MISSING_TAG: {
    label: 'Tag Missing',
    color: 'text-red-600',
    description: 'One or more GTM tags for this tracking were deleted or cannot be found. Re-create the tracking to fix this.',
  },
  MISSING_CONVERSION: {
    label: 'Conversion Action Missing',
    color: 'text-red-600',
    description: 'The Google Ads conversion action was removed. Re-create the tracking to fix this.',
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

export function TrackingDetailModal({ tracking, open, onOpenChange }: TrackingDetailModalProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [verifying, setVerifying] = useState(false);

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
  const statusColor = tracking.status === 'ACTIVE'
    ? 'bg-green-100 text-green-700'
    : tracking.status === 'FAILED'
      ? 'bg-red-100 text-red-700'
      : tracking.status === 'PENDING'
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-gray-100 text-gray-700';

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

          {/* Configuration */}
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

          {/* Google Ads Section (only if destinations include Ads) */}
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

              {/* Error alert for unhealthy trackings */}
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

          {/* Error display */}
          {tracking.lastError && (
            <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <span className="font-medium">Sync Error: </span>
              {tracking.lastError}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
