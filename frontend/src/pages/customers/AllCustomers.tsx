import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { 
  ArrowUpDown, 
  MoreHorizontal, 
  Plus, 
  Download, 
  Trash2, 
  Edit, 
  ExternalLink,
  Users,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/ui/data-table';
import { CustomerDialog } from '@/components/customers/CustomerDialog';
import { Customer, CustomerTableParams, BulkAction } from '@/types/customer.types';
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useBulkDeleteCustomers,
  useBulkUpdateCustomersStatus,
  useExportCustomers,
  useConnectGoogleAccount,
  useDisconnectGoogleAccount,
} from '@/hooks/useCustomers';

const statusColors = {
  active: 'text-green-600',
  inactive: 'text-red-600',
  pending: 'text-yellow-600',
};

const statusIcons = {
  active: CheckCircle,
  inactive: XCircle,
  pending: Clock,
};

export default function AllCustomers() {
  const [tableParams, setTableParams] = React.useState<CustomerTableParams>({
    page: 0,
    pageSize: 20,
    filters: {},
  });

  const [selectedCustomers, setSelectedCustomers] = React.useState<Customer[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | undefined>();
  const [searchValue, setSearchValue] = React.useState('');

  const { data: customersData, isLoading, error } = useCustomers(tableParams);
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const bulkDeleteCustomers = useBulkDeleteCustomers();
  const bulkUpdateStatus = useBulkUpdateCustomersStatus();
  const exportCustomers = useExportCustomers();
  const connectGoogleAccount = useConnectGoogleAccount();
  const disconnectGoogleAccount = useDisconnectGoogleAccount();

  const customers = customersData?.customers || [];
  const totalPages = customersData?.totalPages || 0;

  const handleSearch = (value: string) => {
    setSearchValue(value);
    setTableParams(prev => ({
      ...prev,
      page: 0,
      filters: {
        ...prev.filters,
        search: value || undefined,
      },
    }));
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

  const handleGoogleConnect = async (customerId: string) => {
    try {
      const result = await connectGoogleAccount.mutateAsync(customerId);
      if (result.authUrl) {
        window.open(result.authUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to connect Google account:', error);
    }
  };

  const handleGoogleDisconnect = async (customerId: string) => {
    try {
      await disconnectGoogleAccount.mutateAsync(customerId);
    } catch (error) {
      console.error('Failed to disconnect Google account:', error);
    }
  };

  const handleExport = async (format: 'csv' | 'excel' = 'csv') => {
    try {
      const blob = await exportCustomers.mutateAsync({ params: tableParams, format });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `customers-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const bulkActions: BulkAction[] = [
    {
      id: 'activate',
      label: 'Activate Selected',
      icon: CheckCircle,
      action: async (customerIds: string[]) => {
        await bulkUpdateStatus.mutateAsync({ ids: customerIds, status: 'active' });
      },
    },
    {
      id: 'deactivate',
      label: 'Deactivate Selected',
      icon: XCircle,
      action: async (customerIds: string[]) => {
        await bulkUpdateStatus.mutateAsync({ ids: customerIds, status: 'inactive' });
      },
    },
    {
      id: 'delete',
      label: 'Delete Selected',
      icon: Trash2,
      variant: 'destructive' as const,
      action: async (customerIds: string[]) => {
        if (confirm(`Are you sure you want to delete ${customerIds.length} customers?`)) {
          await bulkDeleteCustomers.mutateAsync(customerIds);
        }
      },
    },
  ];

  const columns: ColumnDef<Customer>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          {row.original.company && (
            <span className="text-sm text-muted-foreground">{row.original.company}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => {
        const googleAccount = row.original.googleAccount;
        return (
          <div className="flex flex-col">
            <span>{row.original.email}</span>
            {googleAccount?.connected && (
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-gray-500">Google:</span>
                <div className="flex items-center space-x-1">
                  <span
                    className={`text-xs ${googleAccount.hasGTMAccess ? 'text-green-600' : 'text-red-600'}`}
                    title={googleAccount.hasGTMAccess ? 'GTM Connected' : (googleAccount.gtmError || 'GTM Not Connected')}
                  >
                    GTM {googleAccount.hasGTMAccess ? '✓' : '✗'}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span
                    className={`text-xs ${googleAccount.hasGA4Access ? 'text-green-600' : 'text-gray-400'}`}
                    title={googleAccount.hasGA4Access ? `GA4 Connected (${googleAccount.ga4PropertyCount} properties)` : (googleAccount.ga4Error || 'GA4 Not Connected')}
                  >
                    GA4 {googleAccount.hasGA4Access ? '✓' : '✗'}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span
                    className={`text-xs ${googleAccount.hasAdsAccess ? 'text-green-600' : 'text-gray-400'}`}
                    title={googleAccount.hasAdsAccess ? `Ads Connected (${googleAccount.adsAccountCount} accounts)` : (googleAccount.adsError || 'Ads Not Connected')}
                  >
                    Ads {googleAccount.hasAdsAccess ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      },
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
      accessorKey: 'totalCampaigns',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Campaigns
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center space-x-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{row.original.totalCampaigns}</span>
        </div>
      ),
    },
    {
      accessorKey: 'totalSpent',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Total Spent
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono">${row.original.totalSpent.toFixed(2)}</span>
      ),
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="inline-block rounded-full bg-secondary px-2 py-1 text-xs"
            >
              {tag}
            </span>
          ))}
          {row.original.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{row.original.tags.length - 3} more
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const customer = row.original;

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
              <DropdownMenuItem
                onClick={() => {
                  setEditingCustomer(customer);
                  setDialogOpen(true);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Customer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {customer.googleAccount?.connected ? (
                <DropdownMenuItem
                  onClick={() => handleGoogleDisconnect(customer.id)}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Disconnect Google
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => handleGoogleConnect(customer.id)}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connect Google
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (confirm('Are you sure you want to delete this customer?')) {
                    deleteCustomer.mutate(customer.id);
                  }
                }}
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
          <p className="text-red-600">Failed to load customers</p>
          <Button onClick={() => window.location.reload()} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">All Customers</h1>
        <div className="flex items-center space-x-2">
          {selectedCustomers.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Bulk Actions ({selectedCustomers.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {bulkActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <DropdownMenuItem
                      key={action.id}
                      onClick={() => action.action(selectedCustomers.map(c => c.id))}
                      className={action.variant === 'destructive' ? 'text-red-600' : ''}
                    >
                      {Icon && <Icon className="mr-2 h-4 w-4" />}
                      {action.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        loading={isLoading}
        onRowSelectionChange={setSelectedCustomers}
        onSearch={handleSearch}
        searchValue={searchValue}
        searchPlaceholder="Search customers..."
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

      <CustomerDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingCustomer(undefined);
        }}
        customer={editingCustomer}
        onSubmit={async (data) => {
          if ('id' in data) {
            await updateCustomer.mutateAsync(data);
          } else {
            await createCustomer.mutateAsync(data);
          }
        }}
        loading={createCustomer.isPending || updateCustomer.isPending}
      />
    </div>
  );
}