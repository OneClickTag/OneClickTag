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
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
}

export default function DashboardPage() {
  const api = useApi();

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.get<AnalyticsOverview>('/api/analytics/overview'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded" />
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
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Active Trackings',
      value: data?.overview.activeTrackings || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Pending Trackings',
      value: data?.overview.pendingTrackings || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Failed Trackings',
      value: data?.overview.failedTrackings || 0,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Link href="/customers">
          <Button>
            <Users className="mr-2 h-4 w-4" />
            View Customers
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Trackings
          </CardTitle>
          <CardDescription>
            Latest tracking activities across all customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.recentTrackings && data.recentTrackings.length > 0 ? (
            <div className="space-y-4">
              {data.recentTrackings.map((tracking) => (
                <div
                  key={tracking.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{tracking.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {tracking.customer.fullName} · {tracking.type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        tracking.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : tracking.status === 'FAILED'
                            ? 'bg-red-100 text-red-700'
                            : tracking.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {tracking.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No recent trackings. Create your first tracking to see activity here.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
