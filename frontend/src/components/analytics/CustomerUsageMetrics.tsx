import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import type { CustomerUsageMetrics as CustomerUsageMetricsType } from '@/types/analytics.types';

interface CustomerUsageMetricsProps {
  data: CustomerUsageMetricsType[];
  loading?: boolean;
  className?: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}> = ({ title, value, change, icon: Icon, color = 'blue' }) => {
  const getTrendIcon = () => {
    if (change === undefined) return null;
    if (change > 0) return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    if (change < 0) return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (change === undefined) return '';
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-400';
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="text-sm font-medium">
              {Math.abs(change).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
};

export function CustomerUsageMetrics({ data, loading, className = '' }: CustomerUsageMetricsProps) {
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No customer usage data available</p>
      </div>
    );
  }

  // Calculate aggregate metrics
  const aggregateMetrics = data.reduce(
    (acc, customer) => ({
      totalCustomers: acc.totalCustomers + 1,
      totalCampaigns: acc.totalCampaigns + customer.totalCampaigns,
      totalEvents: acc.totalEvents + customer.totalEvents,
      totalConversions: acc.totalConversions + customer.totalConversions,
      totalRevenue: acc.totalRevenue + customer.totalRevenue,
      avgGrowthCampaigns: acc.avgGrowthCampaigns + customer.usageGrowth.campaigns,
      avgGrowthRevenue: acc.avgGrowthRevenue + customer.usageGrowth.revenue,
    }),
    {
      totalCustomers: 0,
      totalCampaigns: 0,
      totalEvents: 0,
      totalConversions: 0,
      totalRevenue: 0,
      avgGrowthCampaigns: 0,
      avgGrowthRevenue: 0,
    }
  );

  const avgConversionRate = data.length > 0 
    ? data.reduce((sum, customer) => sum + customer.conversionRate, 0) / data.length 
    : 0;

  // Prepare chart data
  const topCustomersByRevenue = [...data]
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10)
    .map(customer => ({
      name: customer.customerName.length > 15 
        ? customer.customerName.substring(0, 15) + '...' 
        : customer.customerName,
      revenue: customer.totalRevenue,
      conversions: customer.totalConversions,
      campaigns: customer.totalCampaigns,
    }));

  const campaignDistribution = data.map(customer => ({
    name: customer.customerName.length > 10 
      ? customer.customerName.substring(0, 10) + '...' 
      : customer.customerName,
    value: customer.totalCampaigns,
  })).slice(0, 8);

  // Monthly usage trend (aggregate)
  const monthlyTrend = data[0]?.monthlyUsage?.map((month, index) => ({
    month: month.month,
    totalRevenue: data.reduce((sum, customer) => 
      sum + (customer.monthlyUsage[index]?.revenue || 0), 0),
    totalConversions: data.reduce((sum, customer) => 
      sum + (customer.monthlyUsage[index]?.conversions || 0), 0),
    totalCampaigns: data.reduce((sum, customer) => 
      sum + (customer.monthlyUsage[index]?.campaigns || 0), 0),
  })) || [];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Customers"
          value={aggregateMetrics.totalCustomers.toLocaleString()}
          change={aggregateMetrics.avgGrowthCampaigns / data.length}
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Total Campaigns"
          value={aggregateMetrics.totalCampaigns.toLocaleString()}
          change={aggregateMetrics.avgGrowthCampaigns / data.length}
          icon={Target}
          color="green"
        />
        <MetricCard
          title="Total Events"
          value={aggregateMetrics.totalEvents.toLocaleString()}
          icon={Activity}
          color="purple"
        />
        <MetricCard
          title="Total Revenue"
          value={`$${aggregateMetrics.totalRevenue.toLocaleString()}`}
          change={aggregateMetrics.avgGrowthRevenue / data.length}
          icon={DollarSign}
          color="yellow"
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-2">Avg Conversion Rate</h3>
          <div className="text-3xl font-bold text-blue-600">
            {avgConversionRate.toFixed(2)}%
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Across all customers
          </div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-2">Avg Revenue per Customer</h3>
          <div className="text-3xl font-bold text-green-600">
            ${(aggregateMetrics.totalRevenue / aggregateMetrics.totalCustomers).toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Total revenue divided by customers
          </div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-2">Avg Campaigns per Customer</h3>
          <div className="text-3xl font-bold text-purple-600">
            {(aggregateMetrics.totalCampaigns / aggregateMetrics.totalCustomers).toFixed(1)}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Campaign distribution
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers by Revenue */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Top Customers by Revenue</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCustomersByRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'revenue' ? `$${value.toLocaleString()}` : value.toLocaleString(),
                    name === 'revenue' ? 'Revenue' : name === 'conversions' ? 'Conversions' : 'Campaigns'
                  ]}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Campaign Distribution */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Campaign Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={campaignDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {campaignDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, 'Campaigns']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Usage Trend */}
      {monthlyTrend.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Usage Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name.includes('Revenue') ? `$${value.toLocaleString()}` : value.toLocaleString(),
                    name.replace('total', '').replace(/([A-Z])/g, ' $1').trim()
                  ]}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="totalCampaigns" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Total Campaigns"
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="totalConversions" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="Total Conversions"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="totalRevenue" 
                  stroke="#ffc658" 
                  strokeWidth={2}
                  name="Total Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Customer Details Table */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Customer Usage Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-900">Customer</th>
                <th className="px-6 py-3 text-right font-medium text-gray-900">Campaigns</th>
                <th className="px-6 py-3 text-right font-medium text-gray-900">Events</th>
                <th className="px-6 py-3 text-right font-medium text-gray-900">Conversions</th>
                <th className="px-6 py-3 text-right font-medium text-gray-900">Conv. Rate</th>
                <th className="px-6 py-3 text-right font-medium text-gray-900">Revenue</th>
                <th className="px-6 py-3 text-right font-medium text-gray-900">Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((customer) => (
                <tr key={customer.customerId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{customer.customerName}</div>
                      <div className="text-gray-500 text-xs">
                        Last activity: {new Date(customer.lastActivity).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-gray-900">{customer.totalCampaigns}</div>
                    <div className="text-xs text-gray-500">{customer.activeCampaigns} active</div>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    {customer.totalEvents.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    {customer.totalConversions.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-medium ${
                      customer.conversionRate > 5 ? 'text-green-600' :
                      customer.conversionRate > 2 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {customer.conversionRate.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    ${customer.totalRevenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={`flex items-center justify-end space-x-1 ${
                      customer.usageGrowth.revenue > 0 ? 'text-green-600' :
                      customer.usageGrowth.revenue < 0 ? 'text-red-600' : 'text-gray-400'
                    }`}>
                      {customer.usageGrowth.revenue > 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : customer.usageGrowth.revenue < 0 ? (
                        <TrendingDown className="h-4 w-4" />
                      ) : (
                        <Minus className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">
                        {Math.abs(customer.usageGrowth.revenue).toFixed(1)}%
                      </span>
                    </div>
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