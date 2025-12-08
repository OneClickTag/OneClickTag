import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Copy,
  Tag as TagIcon,
  Target,
  Activity,
  Code,
  Settings,
  User,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { Tracking } from '@/types/tracking.types';

interface TrackingDetailModalProps {
  tracking: Tracking | null;
  open: boolean;
  onClose: () => void;
}

const statusIcons: Record<string, any> = {
  active: CheckCircle,
  inactive: XCircle,
  pending: Clock,
  error: AlertCircle,
  creating: Clock,
  failed: AlertCircle,
  paused: XCircle,
  syncing: Clock,
};

const statusColors: Record<string, string> = {
  active: 'text-green-600 bg-green-50',
  inactive: 'text-gray-600 bg-gray-50',
  pending: 'text-yellow-600 bg-yellow-50',
  error: 'text-red-600 bg-red-50',
  creating: 'text-blue-600 bg-blue-50',
  failed: 'text-red-600 bg-red-50',
  paused: 'text-gray-600 bg-gray-50',
  syncing: 'text-blue-600 bg-blue-50',
};

const typeLabels: Record<string, string> = {
  BUTTON_CLICK: 'Button Click',
  LINK_CLICK: 'Link Click',
  PAGE_VIEW: 'Page View',
  FORM_SUBMIT: 'Form Submit',
  ELEMENT_VISIBILITY: 'Element Visibility',
  FORM_START: 'Form Start',
  FORM_ABANDON: 'Form Abandon',
  ADD_TO_CART: 'Add to Cart',
  PURCHASE: 'Purchase',
  SIGNUP: 'Sign Up',
  PHONE_CALL_CLICK: 'Phone Call Click',
  EMAIL_CLICK: 'Email Click',
  DOWNLOAD: 'Download',
  SCROLL_DEPTH: 'Scroll Depth',
  TIME_ON_PAGE: 'Time on Page',
  VIDEO_PLAY: 'Video Play',
  VIDEO_COMPLETE: 'Video Complete',
};

export function TrackingDetailModal({ tracking, open, onClose }: TrackingDetailModalProps) {
  if (!tracking) return null;

  const StatusIcon = statusIcons[tracking.status.toLowerCase()] || AlertCircle;
  const statusColor = statusColors[tracking.status.toLowerCase()] || 'text-gray-600 bg-gray-50';
  const typeLabel = typeLabels[tracking.type] || tracking.type;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
    alert(`${label} copied to clipboard!`);
  };

  const openGTMContainer = () => {
    if (tracking.gtmContainerId) {
      // GTM container URL format: https://tagmanager.google.com/#/container/accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}
      // We'll use a simplified version that opens the container
      const url = `https://tagmanager.google.com/`;
      window.open(url, '_blank');
    }
  };

  const openGTMWorkspace = () => {
    if (tracking.gtmContainerId && tracking.gtmWorkspaceId) {
      // Open GTM with workspace selected
      const url = `https://tagmanager.google.com/`;
      window.open(url, '_blank');
    }
  };

  const openGoogleAds = () => {
    if (tracking.conversionActionId) {
      // Open Google Ads conversions page
      const url = `https://ads.google.com/`;
      window.open(url, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold">{tracking.name}</DialogTitle>
              <DialogDescription className="mt-2">
                {tracking.description || 'No description provided'}
              </DialogDescription>
            </div>
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${statusColor}`}>
              <StatusIcon className="h-4 w-4" />
              <span className="text-sm font-medium capitalize">{tracking.status}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Basic Information */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Basic Information</span>
            </h3>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Type</label>
                <div className="mt-1">
                  <Badge variant="secondary" className="capitalize">
                    {typeLabel}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Created</label>
                <p className="mt-1 text-sm">{new Date(tracking.createdAt).toLocaleString()}</p>
              </div>
              {tracking.updatedAt && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Last Updated</label>
                  <p className="mt-1 text-sm">{new Date(tracking.updatedAt).toLocaleString()}</p>
                </div>
              )}
              {tracking.lastSyncAt && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Last Synced</label>
                  <p className="mt-1 text-sm">{new Date(tracking.lastSyncAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          </section>

          {/* Tracking Configuration */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Code className="h-5 w-5" />
              <span>Configuration</span>
            </h3>
            <div className="space-y-3 bg-gray-50 rounded-lg p-4">
              {tracking.selector && (
                <div>
                  <label className="text-sm font-medium text-gray-600">CSS Selector</label>
                  <div className="mt-1 flex items-center space-x-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono">
                      {tracking.selector}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(tracking.selector!, 'Selector')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              {tracking.urlPattern && (
                <div>
                  <label className="text-sm font-medium text-gray-600">URL Pattern</label>
                  <div className="mt-1 flex items-center space-x-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono">
                      {tracking.urlPattern}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(tracking.urlPattern!, 'URL Pattern')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              {tracking.config && Object.keys(tracking.config).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Additional Config</label>
                  <pre className="mt-1 bg-white px-3 py-2 rounded border text-xs font-mono overflow-x-auto">
                    {JSON.stringify(tracking.config, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </section>

          {/* Destinations */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Destinations</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {tracking.destinations?.map((dest) => (
                <Badge key={dest} variant="outline" className="px-3 py-1">
                  {dest === 'GA4' ? 'Google Analytics 4' : 'Google Ads'}
                </Badge>
              ))}
            </div>
          </section>

          {/* GA4 Configuration */}
          {tracking.destinations?.includes('GA4' as any) && (
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-orange-600" />
                <span>Google Analytics 4</span>
              </h3>
              <div className="space-y-3 bg-orange-50 rounded-lg p-4">
                {tracking.ga4EventName && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Event Name</label>
                    <div className="mt-1 flex items-center space-x-2">
                      <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono">
                        {tracking.ga4EventName}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(tracking.ga4EventName!, 'GA4 Event Name')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {tracking.ga4PropertyId && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Property ID</label>
                    <p className="mt-1 text-sm font-mono">{tracking.ga4PropertyId}</p>
                  </div>
                )}
                {tracking.ga4Parameters && Object.keys(tracking.ga4Parameters).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Event Parameters</label>
                    <pre className="mt-1 bg-white px-3 py-2 rounded border text-xs font-mono overflow-x-auto">
                      {JSON.stringify(tracking.ga4Parameters, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Google Ads Configuration */}
          {tracking.destinations?.includes('GOOGLE_ADS' as any) && (
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span>Google Ads</span>
              </h3>
              <div className="space-y-3 bg-blue-50 rounded-lg p-4">
                {tracking.conversionActionId && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Conversion Action ID</label>
                    <div className="mt-1 flex items-center space-x-2">
                      <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono">
                        {tracking.conversionActionId}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(tracking.conversionActionId!, 'Conversion Action ID')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={openGoogleAds}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {tracking.adsConversionLabel && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Conversion Label</label>
                    <p className="mt-1 text-sm font-mono">{tracking.adsConversionLabel}</p>
                  </div>
                )}
                {tracking.adsConversionValue && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Default Value</label>
                    <p className="mt-1 text-sm">${Number(tracking.adsConversionValue).toFixed(2)}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Google Tag Manager Resources */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <TagIcon className="h-5 w-5 text-purple-600" />
              <span>Google Tag Manager</span>
            </h3>
            <div className="space-y-3 bg-purple-50 rounded-lg p-4">
              {tracking.gtmContainerId && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Container ID</label>
                  <div className="mt-1 flex items-center space-x-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono">
                      {tracking.gtmContainerId}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(tracking.gtmContainerId!, 'Container ID')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openGTMContainer}
                      title="Open in Google Tag Manager"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              {tracking.gtmWorkspaceId && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Workspace</label>
                  <div className="mt-1 flex items-center space-x-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono">
                      {tracking.gtmWorkspaceId}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openGTMWorkspace}
                      title="Open Workspace in GTM"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              {tracking.gtmTriggerId && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Trigger ID</label>
                  <div className="mt-1 flex items-center space-x-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono">
                      {tracking.gtmTriggerId}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(tracking.gtmTriggerId!, 'Trigger ID')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              {tracking.gtmTagIdGA4 && (
                <div>
                  <label className="text-sm font-medium text-gray-600">GA4 Tag ID</label>
                  <div className="mt-1 flex items-center space-x-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono">
                      {tracking.gtmTagIdGA4}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(tracking.gtmTagIdGA4!, 'GA4 Tag ID')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              {tracking.gtmTagIdAds && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Google Ads Tag ID</label>
                  <div className="mt-1 flex items-center space-x-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono">
                      {tracking.gtmTagIdAds}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(tracking.gtmTagIdAds!, 'Ads Tag ID')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              {tracking.gtmTagId && !tracking.gtmTagIdGA4 && !tracking.gtmTagIdAds && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Tag ID</label>
                  <div className="mt-1 flex items-center space-x-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono">
                      {tracking.gtmTagId}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(tracking.gtmTagId!, 'Tag ID')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Analytics */}
          {tracking.analytics && (
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Analytics</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Events</p>
                  <p className="text-2xl font-bold mt-1">
                    {tracking.analytics.totalEvents?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Conversions</p>
                  <p className="text-2xl font-bold mt-1">
                    {tracking.analytics.totalConversions?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Conv. Rate</p>
                  <p className="text-2xl font-bold mt-1">
                    {((tracking.analytics.conversionRate || 0) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold mt-1">
                    ${(tracking.analytics.totalValue || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Error Information */}
          {tracking.lastError && (
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span>Error Details</span>
              </h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{tracking.lastError}</p>
                {tracking.syncAttempts !== undefined && (
                  <p className="text-xs text-red-600 mt-2">
                    Sync attempts: {tracking.syncAttempts}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Audit Information */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Audit Information</span>
            </h3>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4 text-sm">
              <div>
                <label className="text-xs font-medium text-gray-600">Created By</label>
                <p className="mt-1">{tracking.createdBy || 'System'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Updated By</label>
                <p className="mt-1">{tracking.updatedBy || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Tracking ID</label>
                <code className="mt-1 text-xs">{tracking.id}</code>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Tenant ID</label>
                <code className="mt-1 text-xs">{tracking.tenantId}</code>
              </div>
            </div>
          </section>
        </div>

        <div className="flex justify-end space-x-2 mt-6 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
