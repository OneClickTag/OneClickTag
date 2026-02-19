'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCustomers, useDeleteCustomer } from '@/hooks/use-customers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function CustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, refetch } = useCustomers({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
  });

  const deleteCustomer = useDeleteCustomer();

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      await deleteCustomer.mutateAsync(id);
      refetch();
    }
  };

  const columns = [
    {
      accessorKey: 'fullName',
      header: 'Name',
      cell: ({ row }: { row: { original: { id: string; fullName: string; email: string } } }) => (
        <div>
          <Link
            href={`/customers/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.fullName}
          </Link>
          <p className="text-sm text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: 'company',
      header: 'Company',
      cell: ({ row }: { row: { original: { company?: string } } }) => row.original.company || '-',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: { row: { original: { status: string } } }) => (
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            row.original.status === 'ACTIVE'
              ? 'bg-green-100 text-green-700'
              : row.original.status === 'INACTIVE'
                ? 'bg-gray-100 text-gray-700'
                : 'bg-red-100 text-red-700'
          }`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: 'googleAccountId',
      header: 'Google Connected',
      cell: ({ row }: { row: { original: { googleAccountId?: string } } }) =>
        row.original.googleAccountId ? (
          <CheckCircle className="h-5 w-5 text-green-600" />
        ) : (
          <XCircle className="h-5 w-5 text-gray-400" />
        ),
    },
    {
      id: 'actions',
      cell: ({ row }: { row: { original: { id: string } } }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/customers/${row.original.id}`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => handleDelete(row.original.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Customers</h1>
        <Link href="/customers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={data?.data || []}
              pageCount={data?.pagination?.totalPages || 1}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onRowClick={(row: { id: string }) => router.push(`/customers/${row.id}`)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
