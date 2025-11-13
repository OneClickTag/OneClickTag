import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Users, Target, BarChart3, Plus } from 'lucide-react';

export function ExampleWithLayout() {
  return (
    <MainLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600">
              Welcome to OneClickTag. Manage your customers, campaigns, and analytics.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-lg bg-blue-100">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-green-600">+12%</span>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-600">Total Customers</h3>
                <p className="text-2xl font-bold text-gray-900">1,234</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-lg bg-green-100">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
                <span className="text-sm font-medium text-green-600">+8%</span>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-600">Active Campaigns</h3>
                <p className="text-2xl font-bold text-gray-900">89</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-lg bg-purple-100">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-green-600">+15%</span>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-600">Total Conversions</h3>
                <p className="text-2xl font-bold text-gray-900">12,456</p>
              </div>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Customer
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Campaign
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">New customer registered</p>
                    <p className="text-xs text-gray-500">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Campaign "Summer Sale" created</p>
                    <p className="text-xs text-gray-500">1 hour ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">15 new conversions tracked</p>
                    <p className="text-xs text-gray-500">3 hours ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search Demo Section */}
          <div className="mt-8 bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Search Features</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Global Search</h4>
                <p className="text-sm text-blue-700 mb-3">
                  The global search feature is now available! Use the search bar in the header or press{' '}
                  <kbd className="px-2 py-1 bg-blue-100 border border-blue-300 rounded text-xs font-mono">
                    Cmd+K
                  </kbd>{' '}
                  (or{' '}
                  <kbd className="px-2 py-1 bg-blue-100 border border-blue-300 rounded text-xs font-mono">
                    Ctrl+K
                  </kbd>{' '}
                  on Windows) to search across customers, campaigns, and tags.
                </p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Fuzzy search with smart matching</li>
                  <li>• Keyboard navigation with arrow keys</li>
                  <li>• Search history and suggestions</li>
                  <li>• Filter by content type and status</li>
                  <li>• Real-time results as you type</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}