import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { 
 
  TrendingUp, 
  Target, 
  DollarSign, 
  Activity,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTrackingAnalytics } from '@/hooks/useTracking';

interface CustomerAnalyticsProps {
  customerId: string;
}

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

export function CustomerAnalytics({ customerId }: CustomerAnalyticsProps) {
  const [dateRange, setDateRange] = React.useState<{ from: string; to: string }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    to: new Date().toISOString().split('T')[0], // today
  });

  const { 
    data: analytics, 
    isLoading, 
    error,
    refetch 
  } = useTrackingAnalytics(customerId, dateRange);

  const handleDateRangeChange = (period: '7d' | '30d' | '90d' | 'custom') => {
    const today = new Date();
    let from: Date;

    switch (period) {
      case '7d':
        from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        return; // For custom, user will select dates manually
    }

    setDateRange({
      from: from.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0],
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-red-600">Failed to load analytics data</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Analytics Overview</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateRangeChange('7d')}
          >
            7 days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateRangeChange('30d')}
          >
            30 days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateRangeChange('90d')}
          >
            90 days
          </Button>
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="px-2 py-1 border rounded text-sm"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="px-2 py-1 border rounded text-sm"
            />
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Trackings</p>
              <p className="text-2xl font-bold">{analytics.totalTrackings}</p>
            </div>
            <Target className="h-8 w-8 text-blue-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {analytics.activeTrackings} active
          </p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Events</p>
              <p className="text-2xl font-bold">{analytics.totalEvents.toLocaleString()}</p>
            </div>
            <Activity className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Conversions</p>
              <p className="text-2xl font-bold">{analytics.totalConversions.toLocaleString()}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {formatPercentage(analytics.conversionRate)} rate
          </p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">{formatCurrency(analytics.totalValue)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Charts Row 1: Performance Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events and Conversions Over Time */}
        <div className="bg-white rounded-lg border p-6">
          <h4 className="text-base font-semibold mb-4">Performance Over Time</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.recentActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number, name: string) => [
                    value.toLocaleString(),
                    name === 'events' ? 'Events' : name === 'conversions' ? 'Conversions' : 'Value'
                  ]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="events" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="conversions" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Over Time */}
        <div className="bg-white rounded-lg border p-6">
          <h4 className="text-base font-semibold mb-4">Revenue Over Time</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.recentActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#ffc658" 
                  fill="#ffc658" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance by Type */}
        <div className="bg-white rounded-lg border p-6">
          <h4 className="text-base font-semibold mb-4">Performance by Tracking Type</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.performanceByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'value' ? formatCurrency(value) : value.toLocaleString(),
                    name === 'count' ? 'Trackings' : name === 'conversions' ? 'Conversions' : 'Value'
                  ]}
                />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" />
                <Bar dataKey="conversions" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sync Health Status */}
        <div className="bg-white rounded-lg border p-6">
          <h4 className="text-base font-semibold mb-4">Sync Health Status</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Synced', value: analytics.syncHealth.synced, color: '#82ca9d' },
                    { name: 'Pending', value: analytics.syncHealth.pending, color: '#ffc658' },
                    { name: 'Errors', value: analytics.syncHealth.errors, color: '#ff7c7c' },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[0, 1, 2].map((index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-lg border p-6">
        <h4 className="text-base font-semibold mb-4">Performance Summary by Type</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Type</th>
                <th className="text-right py-2">Trackings</th>
                <th className="text-right py-2">Conversions</th>
                <th className="text-right py-2">Total Value</th>
                <th className="text-right py-2">Avg. Value</th>
              </tr>
            </thead>
            <tbody>
              {analytics.performanceByType.map((item, index) => (
                <tr key={index} className="border-b last:border-b-0">
                  <td className="py-2 font-medium capitalize">{item.type}</td>
                  <td className="text-right py-2">{item.count}</td>
                  <td className="text-right py-2">{item.conversions.toLocaleString()}</td>
                  <td className="text-right py-2">{formatCurrency(item.value)}</td>
                  <td className="text-right py-2">
                    {item.conversions > 0 ? formatCurrency(item.value / item.conversions) : '$0.00'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}