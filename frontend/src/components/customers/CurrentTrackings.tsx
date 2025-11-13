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
  Loader2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
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

interface CurrentTrackingsProps {
  customerId: string;
  onEditTracking?: (tracking: Tracking) => void;
}

const statusColors = {
  active: 'text-green-600',
  inactive: 'text-red-600',
  pending: 'text-yellow-600',
  error: 'text-red-600',
};

const statusIcons = {
  active: CheckCircle,
  inactive: XCircle,
  pending: Clock,
  error: AlertCircle,
};

const syncStatusColors = {
  synced: 'text-green-600',
  pending: 'text-yellow-600',
  error: 'text-red-600',
  not_synced: 'text-gray-400',
};

const syncStatusLabels = {
  synced: 'Synced',
  pending: 'Syncing...',
  error: 'Error',
  not_synced: 'Not Synced',
};

export function CurrentTrackings({ customerId, onEditTracking }: CurrentTrackingsProps) {
  const [tableParams, setTableParams] = React.useState<TrackingTableParams>({
    page: 0,
    pageSize: 20,
    filters: {},
  });

  const { data: trackingsData, isLoading, error } = useTrackings(customerId, tableParams);
  const updateTracking = useUpdateTracking();
  const deleteTracking = useDeleteTracking();
  const syncTracking = useSyncTracking();
  const testTracking = useTestTracking();
  const { getSyncStatus, getLatestSyncStatus, isConnected } = useTrackingSyncStatus(customerId);

  const trackings = trackingsData?.trackings || [];
  const totalPages = trackingsData?.totalPages || 0;

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

  const columns: ColumnDef<Tracking>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          {row.original.description && (
            <span className="text-sm text-muted-foreground">{row.original.description}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="inline-block rounded-full bg-secondary px-2 py-1 text-xs capitalize">
          {row.original.type}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const StatusIcon = statusIcons[status];
        return (
          <div className={`flex items-center space-x-1 ${statusColors[status]}`}>
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
        
        return (
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-1 ${syncStatusColors[syncStatus]}`}>
              {syncStatus === 'pending' && <Loader2 className="h-3 w-3 animate-spin" />}
              <span className="text-xs">{syncStatusLabels[syncStatus]}</span>
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
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No trackings found for this customer.</p>
          <p className="text-sm text-muted-foreground">
            Create your first tracking to start monitoring conversions and events.
          </p>
        </div>
      )}
    </div>
  );
}