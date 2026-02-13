'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { useCustomerTrackings, useCreateTracking } from '@/hooks/use-trackings';
import { useConnectGoogleAccount } from '@/hooks/use-customers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Activity,
  Plus,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  RefreshCw,
  Radar,
} from 'lucide-react';
import { Customer } from '@/types/customer';
import { AutoTrack } from '@/components/autotrack/AutoTrack';

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const api = useApi();

  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get<Customer>(`/api/customers/${id}`),
  });

  const { data: trackings, isLoading: trackingsLoading } = useCustomerTrackings(id);
  const connectGoogle = useConnectGoogleAccount();

  const handleConnectGoogle = async () => {
    try {
      const result = await connectGoogle.mutateAsync(id);
      if (result.authUrl) {
        window.location.href = result.authUrl;
      }
    } catch (error) {
      console.error('Failed to connect Google:', error);
    }
  };

  if (customerLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">Customer not found</h1>
        <p className="text-gray-600 mt-2">The customer you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{customer.fullName}</h1>
          <p className="text-muted-foreground">{customer.email}</p>
        </div>
        <div className="flex gap-2">
          {customer.googleAccountId ? (
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle className="mr-1 h-4 w-4" />
              Google Connected
            </Badge>
          ) : (
            <Button onClick={handleConnectGoogle} disabled={connectGoogle.isPending}>
              {connectGoogle.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LinkIcon className="mr-2 h-4 w-4" />
              )}
              Connect Google
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="trackings">
        <TabsList>
          <TabsTrigger value="trackings">
            <Activity className="mr-2 h-4 w-4" />
            Trackings
          </TabsTrigger>
          <TabsTrigger value="autotrack">
            <Radar className="mr-2 h-4 w-4" />
            AutoTrack
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trackings" className="space-y-4">
          <div className="flex justify-end">
            <Button disabled={!customer.googleAccountId}>
              <Plus className="mr-2 h-4 w-4" />
              Create Tracking
            </Button>
          </div>

          {trackingsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : trackings?.trackings && trackings.trackings.length > 0 ? (
            <div className="grid gap-4">
              {trackings.trackings.map((tracking) => (
                <Card key={tracking.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{tracking.name}</CardTitle>
                      <Badge
                        className={
                          tracking.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : tracking.status === 'FAILED'
                              ? 'bg-red-100 text-red-700'
                              : tracking.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                        }
                      >
                        {tracking.status}
                      </Badge>
                    </div>
                    <CardDescription>{tracking.type}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {tracking.selector && (
                      <p className="text-sm">
                        <span className="font-medium">Selector:</span>{' '}
                        <code className="bg-gray-100 px-1 rounded">{tracking.selector}</code>
                      </p>
                    )}
                    {tracking.lastError && (
                      <p className="text-sm text-red-600 mt-2">
                        <span className="font-medium">Error:</span> {tracking.lastError}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Activity className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium">No trackings yet</h3>
                <p className="text-muted-foreground mt-2">
                  {customer.googleAccountId
                    ? 'Create your first tracking to start monitoring conversions.'
                    : 'Connect a Google account first to create trackings.'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="autotrack">
          <AutoTrack
            customerId={id}
            customerWebsiteUrl={customer?.websiteUrl ?? undefined}
          />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="mt-1">{customer.fullName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="mt-1">{customer.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company</label>
                  <p className="mt-1">{customer.company || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p className="mt-1">{customer.phone || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p className="mt-1">
                    <Badge>{customer.status}</Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Google Email</label>
                  <p className="mt-1">{customer.googleEmail || 'Not connected'}</p>
                </div>
              </div>
              {customer.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notes</label>
                  <p className="mt-1 whitespace-pre-wrap">{customer.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
