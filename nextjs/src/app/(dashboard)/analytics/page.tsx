'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

interface AnalyticsOverview {
  overview: {
    totalCustomers: number;
    activeCustomers: number;
    totalTrackings: number;
    activeTrackings: number;
    failedTrackings: number;
    pendingTrackings: number;
  };
  trackingsByStatus: Record<string, number>;
  recentTrackings: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    createdAt: string;
    customer: {
      id: string;
      fullName: string;
    };
  }>;
  customerGrowth: Array<{
    createdAt: string;
    _count: number;
  }>;
}

export default function AnalyticsPage() {
  const api = useApi();

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.get<AnalyticsOverview>('/api/analytics/overview'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Customers',
      value: data?.overview.totalCustomers || 0,
      description: 'All-time customers',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Connected Customers',
      value: data?.overview.activeCustomers || 0,
      description: 'With Google account',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Trackings',
      value: data?.overview.totalTrackings || 0,
      description: 'All tracking events',
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Active Trackings',
      value: data?.overview.activeTrackings || 0,
      description: 'Successfully synced',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Pending Trackings',
      value: data?.overview.pendingTrackings || 0,
      description: 'Awaiting sync',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Failed Trackings',
      value: data?.overview.failedTrackings || 0,
      description: 'Need attention',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  const statusData = data?.trackingsByStatus || {};
  const totalTrackings = Object.values(statusData).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tracking Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Tracking Status Breakdown
          </CardTitle>
          <CardDescription>
            Distribution of trackings by status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalTrackings > 0 ? (
            <div className="space-y-4">
              {Object.entries(statusData).map(([status, count]) => {
                const percentage = Math.round((count / totalTrackings) * 100);
                const colors: Record<string, string> = {
                  ACTIVE: 'bg-green-500',
                  PENDING: 'bg-yellow-500',
                  FAILED: 'bg-red-500',
                  CREATING: 'bg-blue-500',
                  PAUSED: 'bg-gray-500',
                  SYNCING: 'bg-purple-500',
                };
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{status}</span>
                      <span className="text-muted-foreground">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[status] || 'bg-gray-500'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No tracking data available yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
