import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  MoreHorizontal,
  Play,
  Pause,
  RefreshCw,
  Edit,
  Trash2,
  TestTube,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Loader2,
  Eye,
  Tag,
  TrendingUp,
  BarChart3
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/ui/data-table';
import { Tracking, TrackingTableParams } from '@/types/tracking.types';
import {
  useTrackings,
  useUpdateTracking,
  useDeleteTracking,
  useSyncTracking,
  useTestTracking,
} from '@/hooks/useTracking';
import { useTrackingSyncStatus } from '@/hooks/useSSE';
import { TrackingDetailModal } from './TrackingDetailModal';

interface CurrentTrackingsProps {
  customerId: string;
  onEditTracking?: (tracking: Tracking) => void;
}

const statusColors: Record<string, string> = {
  active: 'text-green-600',
  inactive: 'text-red-600',
  pending: 'text-yellow-600',
  error: 'text-red-600',
  paused: 'text-gray-600',
  syncing: 'text-blue-600',
  failed: 'text-red-600',
  creating: 'text-blue-600',
};

const statusIcons: Record<string, any> = {
  active: CheckCircle,
  inactive: XCircle,
  pending: Clock,
  error: AlertCircle,
  paused: Pause,
  syncing: RefreshCw,
  failed: AlertCircle,
  creating: Clock,
};

const syncStatusColors: Record<string, string> = {
  synced: 'text-green-600',
  pending: 'text-yellow-600',
  error: 'text-red-600',
  not_synced: 'text-gray-400',
  unknown: 'text-gray-400',
};

const syncStatusLabels: Record<string, string> = {
  synced: 'Synced',
  pending: 'Syncing...',
  error: 'Error',
  not_synced: 'Not Synced',
  unknown: 'Unknown',
};

export function CurrentTrackings({ customerId, onEditTracking }: CurrentTrackingsProps) {
  const [tableParams, setTableParams] = React.useState<TrackingTableParams>({
    page: 0,
    pageSize: 20,
    filters: {},
  });
  const [selectedTracking, setSelectedTracking] = React.useState<Tracking | null>(null);
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);

  const { data: trackingsData, isLoading, error } = useTrackings(customerId, tableParams);
  const updateTracking = useUpdateTracking();
  const deleteTracking = useDeleteTracking();
  const syncTracking = useSyncTracking();
  const testTracking = useTestTracking();
  const { getSyncStatus, getLatestSyncStatus, isConnected } = useTrackingSyncStatus(customerId);

  const trackings = trackingsData?.trackings || [];
  const totalPages = trackingsData?.totalPages || 0;

  const handleViewDetails = (tracking: Tracking) => {
    setSelectedTracking(tracking);
    setDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedTracking(null);
  };

  const handlePageChange = (page: number) => {
    setTableParams(prev => ({ ...prev, page }));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setTableParams(prev => ({ ...prev, pageSize, page: 0 }));
  };

  const handleSortingChange = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    setTableParams(prev => ({
      ...prev,
      sortBy,
      sortOrder,
    }));
  };

  const handleToggleStatus = async (tracking: Tracking) => {
    // const newStatus = tracking.status === 'active' ? 'inactive' : 'active'; // Unused variable
    try {
      await updateTracking.mutateAsync({
        id: tracking.id,
        customerId: tracking.customerId,
      });
    } catch (error) {
      console.error('Failed to toggle tracking status:', error);
    }
  };

  const handleSync = async (tracking: Tracking) => {
    try {
      await syncTracking.mutateAsync({
        customerId: tracking.customerId,
        trackingId: tracking.id,
      });
    } catch (error) {
      console.error('Failed to sync tracking:', error);
    }
  };

  const handleTest = async (tracking: Tracking) => {
    try {
      const result = await testTracking.mutateAsync({
        customerId: tracking.customerId,
        trackingId: tracking.id,
      });
      alert(result.success ? 'Test successful!' : `Test failed: ${result.message}`);
    } catch (error) {
      console.error('Failed to test tracking:', error);
      alert('Test failed');
    }
  };

  const handleDelete = async (tracking: Tracking) => {
    if (confirm(`Are you sure you want to delete "${tracking.name}"?`)) {
      try {
        await deleteTracking.mutateAsync({
          customerId: tracking.customerId,
          trackingId: tracking.id,
        });
      } catch (error) {
        console.error('Failed to delete tracking:', error);
      }
    }
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
    PHONE_CALL_CLICK: 'Phone Call',
    EMAIL_CLICK: 'Email Click',
    DOWNLOAD: 'Download',
    SCROLL_DEPTH: 'Scroll Depth',
    TIME_ON_PAGE: 'Time on Page',
    VIDEO_PLAY: 'Video Play',
    VIDEO_COMPLETE: 'Video Complete',
  };

  const columns: ColumnDef<Tracking>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div
          className="flex flex-col cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded"
          onClick={() => handleViewDetails(row.original)}
        >
          <div className="flex items-center space-x-2">
            <span className="font-medium">{row.original.name}</span>
            {row.original.lastError && (
              <span title={row.original.lastError}>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </span>
            )}
          </div>
          {row.original.description && (
            <span className="text-sm text-muted-foreground line-clamp-1">{row.original.description}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const typeLabel = typeLabels[row.original.type] || row.original.type;
        return (
          <Badge variant="secondary" className="capitalize whitespace-nowrap">
            {typeLabel}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'destinations',
      header: 'Destinations',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.destinations?.map((dest) => (
            <div key={dest} className="flex items-center space-x-1">
              {dest === 'GA4' ? (
                <div className="flex items-center space-x-1 text-xs text-orange-600" title="Google Analytics 4">
                  <BarChart3 className="h-3 w-3" />
                  <span>GA4</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-xs text-blue-600" title="Google Ads">
                  <TrendingUp className="h-3 w-3" />
                  <span>Ads</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const StatusIcon = statusIcons[status] || AlertCircle;
        const statusColor = statusColors[status] || 'text-gray-600';
        return (
          <div className={`flex items-center space-x-1 ${statusColor}`}>
            <StatusIcon className="h-4 w-4" />
            <span className="capitalize">{status}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'syncStatus',
      header: 'Sync Status',
      cell: ({ row }) => {
        const tracking = row.original;
        const realtimeSyncStatus = getLatestSyncStatus(tracking.id);
        const syncStatus = realtimeSyncStatus !== 'unknown' ? realtimeSyncStatus : tracking.syncStatus;
        const syncData = getSyncStatus(tracking.id);

        // Fallback for undefined sync status
        const statusColor = syncStatusColors[syncStatus] || syncStatusColors['unknown'];
        const statusLabel = syncStatusLabels[syncStatus] || syncStatus || 'Unknown';

        return (
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-1 ${statusColor}`}>
              {syncStatus === 'pending' && <Loader2 className="h-3 w-3 animate-spin" />}
              <span className="text-xs">{statusLabel}</span>
            </div>
            {!isConnected && (
              <div className="text-xs text-gray-400" title="Real-time sync status unavailable">
                <ExternalLink className="h-3 w-3" />
              </div>
            )}
            {syncData?.message && (
              <div className="text-xs text-muted-foreground" title={syncData.message}>
                ℹ️
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'analytics.totalEvents',
      header: 'Events',
      cell: ({ row }) => (
        <span className="font-mono">{row.original.analytics?.totalEvents?.toLocaleString() || 0}</span>
      ),
    },
    {
      accessorKey: 'analytics.totalConversions',
      header: 'Conversions',
      cell: ({ row }) => (
        <span className="font-mono">{row.original.analytics?.totalConversions?.toLocaleString() || 0}</span>
      ),
    },
    {
      accessorKey: 'analytics.conversionRate',
      header: 'Conv. Rate',
      cell: ({ row }) => {
        const rate = row.original.analytics?.conversionRate || 0;
        return <span className="font-mono">{(rate * 100).toFixed(1)}%</span>;
      },
    },
    {
      accessorKey: 'analytics.totalValue',
      header: 'Value',
      cell: ({ row }) => {
        const value = row.original.analytics?.totalValue || 0;
        return <span className="font-mono">${value.toFixed(2)}</span>;
      },
    },
    {
      accessorKey: 'lastSyncAt',
      header: 'Last Sync',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.lastSyncAt 
            ? new Date(row.original.lastSyncAt).toLocaleString()
            : 'Never'
          }
        </span>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const tracking = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>

              <DropdownMenuItem onClick={() => handleViewDetails(tracking)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => onEditTracking?.(tracking)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Tracking
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => handleToggleStatus(tracking)}>
                {tracking.status === 'active' ? (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => handleSync(tracking)}
                disabled={syncTracking.isPending}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncTracking.isPending ? 'animate-spin' : ''}`} />
                Sync Now
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleTest(tracking)}
                disabled={testTracking.isPending}
              >
                <TestTube className="mr-2 h-4 w-4" />
                Test Configuration
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => handleDelete(tracking)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600">Failed to load trackings</p>
          <Button onClick={() => window.location.reload()} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Real-time Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold">Current Trackings</h3>
            <div className={`flex items-center space-x-1 text-xs ${isConnected ? 'text-green-600' : 'text-yellow-600'}`}>
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-600' : 'bg-yellow-600'}`} />
              <span>{isConnected ? 'Real-time sync active' : 'Real-time sync disconnected'}</span>
            </div>
          </div>
          {trackings.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {trackings.length} tracking{trackings.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        <DataTable
          columns={columns}
          data={trackings}
          loading={isLoading}
          pagination={{
            pageIndex: tableParams.page,
            pageSize: tableParams.pageSize,
            pageCount: totalPages,
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
          }}
          sorting={{
            sorting: tableParams.sortBy
              ? [{ id: tableParams.sortBy, desc: tableParams.sortOrder === 'desc' }]
              : [],
            onSortingChange: (sorting) => {
              const newSorting = typeof sorting === 'function' ? sorting([]) : sorting;
              if (newSorting.length > 0) {
                const sort = newSorting[0];
                handleSortingChange(sort.id, sort.desc ? 'desc' : 'asc');
              } else {
                setTableParams(prev => ({
                  ...prev,
                  sortBy: undefined,
                  sortOrder: undefined,
                }));
              }
            },
          }}
        />

        {trackings.length === 0 && !isLoading && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground mb-2 font-medium">No trackings found for this customer</p>
            <p className="text-sm text-muted-foreground">
              Create your first tracking to start monitoring conversions and events.
            </p>
          </div>
        )}
      </div>

      {/* Tracking Detail Modal */}
      <TrackingDetailModal
        tracking={selectedTracking}
        open={detailModalOpen}
        onClose={handleCloseDetailModal}
      />
    </>
  );
}