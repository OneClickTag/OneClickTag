'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Plus, Construction } from 'lucide-react';
import Link from 'next/link';

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Manage your marketing campaigns and tracking configurations
          </p>
        </div>
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 rounded-full bg-yellow-100 p-4 w-fit">
            <Construction className="h-8 w-8 text-yellow-600" />
          </div>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Campaign management is currently under development. You can manage individual
            trackings through your customers for now.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/customers">
            <Button variant="outline">
              <Target className="h-4 w-4 mr-2" />
              Go to Customers
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
