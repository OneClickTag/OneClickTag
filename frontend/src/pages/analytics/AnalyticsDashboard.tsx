import React from 'react';
import {
  BarChart3,
  Users,
  Target,
  Server,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Bell,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilters';
import { CustomerUsageMetrics } from '@/components/analytics/CustomerUsageMetrics';
import { CampaignPerformanceCharts } from '@/components/analytics/CampaignPerformanceCharts';
import { SystemHealthIndicators } from '@/components/analytics/SystemHealthIndicators';
import { DataExport } from '@/components/analytics/DataExport';
import { AnalyticsFilters as Filters } from '@/types/analytics.types';
import {
  useDashboardOverview,
  useCustomerUsageMetrics,
  useCampaignPerformance,
  useSystemHealth,
  useSystemHealthHistory,
  useRealTimeMetrics,
  useAnalyticsAlerts,
  useRefreshAnalytics,
  useMarkAlertAsRead,
} from '@/hooks/useAnalytics';

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = React.useState('overview');
  const [filters, setFilters] = React.useState<Filters>({
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
      to: new Date().toISOString().split('T')[0], // today
    },
    customerIds: [],
    campaignTypes: [],
    status: [],
  });

  const [showAlerts, setShowAlerts] = React.useState(false);

  // Data queries
  const { data: overviewData, isLoading: overviewLoading, error: overviewError } = useDashboardOverview(filters);
  const { data: customerUsageData, isLoading: customerUsageLoading } = useCustomerUsageMetrics(filters);
  const { data: campaignPerformanceData, isLoading: campaignPerformanceLoading } = useCampaignPerformance(filters);
  const { data: systemHealthData, isLoading: systemHealthLoading } = useSystemHealth();
  const { data: systemHealthHistoryData } = useSystemHealthHistory(filters);
  const { data: realTimeData } = useRealTimeMetrics();
  const { data: alertsData } = useAnalyticsAlerts();

  // Mutations
  const refreshAnalytics = useRefreshAnalytics();
  const markAlertAsRead = useMarkAlertAsRead();

  const handleRefresh = async () => {
    try {
      await refreshAnalytics.mutateAsync();
    } catch (error) {
      console.error('Failed to refresh analytics:', error);
    }
  };

  const handleAlertRead = async (alertId: string) => {
    try {
      await markAlertAsRead.mutateAsync(alertId);
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const unreadAlerts = alertsData?.filter(alert => !alert.isRead) || [];

  // Export configuration
  const exportTypes = [
    {
      type: 'overview' as const,
      label: 'Dashboard Overview',
      description: 'Complete dashboard overview with key metrics',
      icon: BarChart3,
    },
    {
      type: 'customer_usage' as const,
      label: 'Customer Usage',
      description: 'Detailed customer usage metrics and trends',
      icon: Users,
    },
    {
      type: 'campaign_performance' as const,
      label: 'Campaign Performance',
      description: 'Campaign performance analytics and ROI data',
      icon: Target,
    },
    {
      type: 'system_health' as const,
      label: 'System Health',
      description: 'System health metrics and monitoring data',
      icon: Server,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <BarChart3 className="h-6 w-6 mr-2 text-primary" />
                Analytics Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Monitor performance, track usage, and analyze system health
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* Real-time Metrics */}
              {realTimeData && (
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-gray-600">Live: {realTimeData.activeUsers} users</span>
                  </div>
                  <div className="text-gray-600">
                    {realTimeData.eventsPerMinute}/min events
                  </div>
                </div>
              )}

              {/* Alerts */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAlerts(!showAlerts)}
                  className="relative"
                >
                  <Bell className="h-4 w-4" />
                  {unreadAlerts.length > 0 && (
                    <span className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadAlerts.length}
                    </span>
                  )}
                </Button>

                {showAlerts && alertsData && (
                  <div className="absolute right-0 top-10 w-80 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold">Alerts & Notifications</h3>
                    </div>
                    {alertsData.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No alerts
                      </div>
                    ) : (
                      <div className="divide-y">
                        {alertsData.slice(0, 10).map((alert) => (
                          <div
                            key={alert.id}
                            className={`p-4 hover:bg-gray-50 cursor-pointer ${
                              !alert.isRead ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => handleAlertRead(alert.id)}
                          >
                            <div className="flex items-start space-x-2">
                              <AlertCircle className={`h-4 w-4 mt-0.5 ${
                                alert.severity === 'critical' ? 'text-red-500' :
                                alert.severity === 'high' ? 'text-orange-500' :
                                alert.severity === 'medium' ? 'text-yellow-500' :
                                'text-blue-500'
                              }`} />
                              <div className="flex-1">
                                <h4 className="text-sm font-medium">{alert.title}</h4>
                                <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(alert.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Refresh */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshAnalytics.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshAnalytics.isPending ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              {/* Export */}
              <DataExport filters={filters} availableTypes={exportTypes} />
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6">
            <AnalyticsFilters
              filters={filters}
              onChange={setFilters}
              showCustomerFilter={true}
              showCampaignTypeFilter={true}
              showStatusFilter={true}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Customer Usage</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Campaign Performance</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center space-x-2">
              <Server className="h-4 w-4" />
              <span>System Health</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {overviewLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-gray-200 rounded-lg h-32 animate-pulse"></div>
                ))}
              </div>
            ) : overviewError ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600">Failed to load overview data</p>
                <Button onClick={handleRefresh} className="mt-2">
                  Retry
                </Button>
              </div>
            ) : overviewData ? (
              <div className="space-y-6">
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg border p-6">
                    <div className="flex items-center justify-between">
                      <div className="p-3 rounded-lg bg-blue-100">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                      {overviewData.data.growth.customers !== 0 && (
                        <div className={`text-sm font-medium ${
                          overviewData.data.growth.customers > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {overviewData.data.growth.customers > 0 ? '+' : ''}{overviewData.data.growth.customers.toFixed(1)}%
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-600">Total Customers</h3>
                      <p className="text-2xl font-bold text-gray-900">{overviewData.data.totalCustomers.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border p-6">
                    <div className="flex items-center justify-between">
                      <div className="p-3 rounded-lg bg-green-100">
                        <Target className="h-6 w-6 text-green-600" />
                      </div>
                      {overviewData.data.growth.campaigns !== 0 && (
                        <div className={`text-sm font-medium ${
                          overviewData.data.growth.campaigns > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {overviewData.data.growth.campaigns > 0 ? '+' : ''}{overviewData.data.growth.campaigns.toFixed(1)}%
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-600">Total Campaigns</h3>
                      <p className="text-2xl font-bold text-gray-900">{overviewData.data.totalCampaigns.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border p-6">
                    <div className="flex items-center justify-between">
                      <div className="p-3 rounded-lg bg-purple-100">
                        <BarChart3 className="h-6 w-6 text-purple-600" />
                      </div>
                      {overviewData.data.growth.conversions !== 0 && (
                        <div className={`text-sm font-medium ${
                          overviewData.data.growth.conversions > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {overviewData.data.growth.conversions > 0 ? '+' : ''}{overviewData.data.growth.conversions.toFixed(1)}%
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-600">Total Conversions</h3>
                      <p className="text-2xl font-bold text-gray-900">{overviewData.data.totalConversions.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border p-6">
                    <div className="flex items-center justify-between">
                      <div className="p-3 rounded-lg bg-yellow-100">
                        <TrendingUp className="h-6 w-6 text-yellow-600" />
                      </div>
                      {overviewData.data.growth.revenue !== 0 && (
                        <div className={`text-sm font-medium ${
                          overviewData.data.growth.revenue > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {overviewData.data.growth.revenue > 0 ? '+' : ''}{overviewData.data.growth.revenue.toFixed(1)}%
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
                      <p className="text-2xl font-bold text-gray-900">${overviewData.data.totalRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Additional overview content would go here */}
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {overviewData.data.recentActivity.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.description}</p>
                          <p className="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleString()}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          activity.type === 'campaign_created' ? 'bg-blue-100 text-blue-800' :
                          activity.type === 'conversion' ? 'bg-green-100 text-green-800' :
                          activity.type === 'customer_added' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {activity.type.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </TabsContent>

          {/* Customer Usage Tab */}
          <TabsContent value="customers">
            <CustomerUsageMetrics
              data={customerUsageData?.data || []}
              loading={customerUsageLoading}
            />
          </TabsContent>

          {/* Campaign Performance Tab */}
          <TabsContent value="campaigns">
            <CampaignPerformanceCharts
              data={campaignPerformanceData?.data || []}
              loading={campaignPerformanceLoading}
            />
          </TabsContent>

          {/* System Health Tab */}
          <TabsContent value="system">
            <SystemHealthIndicators
              data={systemHealthData!}
              historyData={systemHealthHistoryData?.data}
              loading={systemHealthLoading}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Click outside to close alerts */}
      {showAlerts && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowAlerts(false)}
        />
      )}
    </div>
  );
}