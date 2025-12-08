import React from 'react';
import {
  TrendingUp,
  Target,
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
              <p className="text-sm font-medium text-muted-foreground">Sync Rate</p>
              <p className="text-2xl font-bold">
                {analytics.totalTrackings > 0 && analytics.syncHealth
                  ? Math.round((analytics.syncHealth.synced / analytics.totalTrackings) * 100)
                  : 0}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {analytics.syncHealth?.errors || 0} failed
          </p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Failed Trackings</p>
              <p className="text-2xl font-bold">{analytics.syncHealth?.errors || 0}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border p-6">
        <h4 className="text-base font-semibold mb-4">Recent Activity</h4>
        {analytics.recentActivity && analytics.recentActivity.length > 0 ? (
          <div className="space-y-2">
            {analytics.recentActivity.map((activity: any) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.name}</p>
                  <p className="text-xs text-muted-foreground">{activity.type}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activity.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    activity.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {activity.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        )}
      </div>

    </div>
  );
}