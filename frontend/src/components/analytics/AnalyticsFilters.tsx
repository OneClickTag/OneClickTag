import React from 'react';
import { Filter, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DateRangeFilter } from './DateRangeFilter';
import { AnalyticsFilters as Filters } from '@/types/analytics.types';
import { useCustomers } from '@/hooks/useCustomers';

interface AnalyticsFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  showCustomerFilter?: boolean;
  showCampaignTypeFilter?: boolean;
  showStatusFilter?: boolean;
  className?: string;
}

const campaignTypes = [
  { value: 'button_click', label: 'Button Click' },
  { value: 'page_view', label: 'Page View' },
  { value: 'form_submit', label: 'Form Submit' },
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'draft', label: 'Draft' },
  { value: 'error', label: 'Error' },
];

export function AnalyticsFilters({
  filters,
  onChange,
  showCustomerFilter = true,
  showCampaignTypeFilter = true,
  showStatusFilter = true,
  className = '',
}: AnalyticsFiltersProps) {
  const [customerSearch, setCustomerSearch] = React.useState('');
  const { data: customersData } = useCustomers({
    page: 0,
    pageSize: 100,
    filters: { search: customerSearch },
  });

  const customers = customersData?.customers || [];

  const handleDateRangeChange = (dateRange: { from: string; to: string }) => {
    onChange({
      ...filters,
      dateRange,
    });
  };

  const handleCustomerToggle = (customerId: string, checked: boolean) => {
    const currentIds = filters.customerIds || [];
    const newIds = checked
      ? [...currentIds, customerId]
      : currentIds.filter(id => id !== customerId);
    
    onChange({
      ...filters,
      customerIds: newIds,
    });
  };

  const handleCampaignTypeToggle = (type: string, checked: boolean) => {
    const currentTypes = filters.campaignTypes || [];
    const newTypes = checked
      ? [...currentTypes, type]
      : currentTypes.filter(t => t !== type);
    
    onChange({
      ...filters,
      campaignTypes: newTypes,
    });
  };

  const handleStatusToggle = (status: string, checked: boolean) => {
    const currentStatuses = filters.status || [];
    const newStatuses = checked
      ? [...currentStatuses, status]
      : currentStatuses.filter(s => s !== status);
    
    onChange({
      ...filters,
      status: newStatuses,
    });
  };

  const clearAllFilters = () => {
    onChange({
      dateRange: filters.dateRange, // Keep date range
      customerIds: [],
      campaignTypes: [],
      status: [],
    });
  };

  const getActiveFilterCount = () => {
    return (
      (filters.customerIds?.length || 0) +
      (filters.campaignTypes?.length || 0) +
      (filters.status?.length || 0)
    );
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className={`flex flex-wrap items-center gap-4 ${className}`}>
      {/* Date Range Filter */}
      <DateRangeFilter
        value={filters.dateRange}
        onChange={handleDateRangeChange}
      />

      {/* Additional Filters */}
      <div className="flex items-center space-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-2 -right-2 h-5 w-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-4">
            <div className="space-y-4">
              {/* Customer Filter */}
              {showCustomerFilter && (
                <div>
                  <Label className="text-sm font-medium">Customers</Label>
                  <div className="mt-2">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Search customers..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="mt-2 max-h-32 overflow-y-auto space-y-2">
                      {customers.map((customer) => (
                        <div key={customer.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`customer-${customer.id}`}
                            checked={filters.customerIds?.includes(customer.id) || false}
                            onCheckedChange={(checked) =>
                              handleCustomerToggle(customer.id, !!checked)
                            }
                          />
                          <Label
                            htmlFor={`customer-${customer.id}`}
                            className="text-sm flex-1 cursor-pointer"
                          >
                            {customer.name}
                          </Label>
                        </div>
                      ))}
                      {customers.length === 0 && (
                        <div className="text-sm text-gray-500 text-center py-2">
                          No customers found
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Campaign Type Filter */}
              {showCampaignTypeFilter && (
                <div>
                  <Label className="text-sm font-medium">Campaign Types</Label>
                  <div className="mt-2 space-y-2">
                    {campaignTypes.map((type) => (
                      <div key={type.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${type.value}`}
                          checked={filters.campaignTypes?.includes(type.value) || false}
                          onCheckedChange={(checked) =>
                            handleCampaignTypeToggle(type.value, !!checked)
                          }
                        />
                        <Label
                          htmlFor={`type-${type.value}`}
                          className="text-sm cursor-pointer"
                        >
                          {type.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Filter */}
              {showStatusFilter && (
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-2 space-y-2">
                    {statusOptions.map((status) => (
                      <div key={status.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status.value}`}
                          checked={filters.status?.includes(status.value) || false}
                          onCheckedChange={(checked) =>
                            handleStatusToggle(status.value, !!checked)
                          }
                        />
                        <Label
                          htmlFor={`status-${status.value}`}
                          className="text-sm cursor-pointer capitalize"
                        >
                          {status.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear Filters */}
              {activeFilterCount > 0 && (
                <div className="pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filter Pills */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.customerIds?.map((customerId) => {
            const customer = customers.find(c => c.id === customerId);
            return customer ? (
              <div
                key={customerId}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                <span>{customer.name}</span>
                <button
                  onClick={() => handleCustomerToggle(customerId, false)}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : null;
          })}

          {filters.campaignTypes?.map((type) => {
            const typeLabel = campaignTypes.find(t => t.value === type)?.label;
            return typeLabel ? (
              <div
                key={type}
                className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
              >
                <span>{typeLabel}</span>
                <button
                  onClick={() => handleCampaignTypeToggle(type, false)}
                  className="ml-1 hover:bg-green-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : null;
          })}

          {filters.status?.map((status) => {
            const statusLabel = statusOptions.find(s => s.value === status)?.label;
            return statusLabel ? (
              <div
                key={status}
                className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full"
              >
                <span>{statusLabel}</span>
                <button
                  onClick={() => handleStatusToggle(status, false)}
                  className="ml-1 hover:bg-yellow-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}