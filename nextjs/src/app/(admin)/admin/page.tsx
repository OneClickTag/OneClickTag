'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, FileText, Inbox, Shield, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const api = useApi();

  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ['admin', 'leads', 'count'],
    queryFn: () => api.get<{ total: number }>('/api/admin/leads?pageSize=1'),
  });

  const adminCards = [
    {
      title: 'User Management',
      description: 'Manage users and their roles',
      icon: Users,
      href: '/admin/users',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Content Pages',
      description: 'Edit site content and pages',
      icon: FileText,
      href: '/admin/content',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Landing Page',
      description: 'Customize landing page sections',
      icon: Inbox,
      href: '/admin/landing-page',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Compliance',
      description: 'GDPR and cookie settings',
      icon: Shield,
      href: '/admin/compliance',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Leads',
      description: 'View and manage leads',
      icon: TrendingUp,
      href: '/admin/leads',
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
      badge: leads?.total,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage your application settings and content
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="h-full transition-shadow hover:shadow-lg cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className={`rounded-lg p-3 ${card.bgColor}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
                {card.badge !== undefined && (
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                    {card.badge}
                  </span>
                )}
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg">{card.title}</CardTitle>
                <CardDescription className="mt-1">{card.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
