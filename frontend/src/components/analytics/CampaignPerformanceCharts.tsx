import React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
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
  Target,
  DollarSign,
  MousePointer,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { CampaignPerformance } from '@/types/analytics.types';

interface CampaignPerformanceChartsProps {
  data: CampaignPerformance[];
  loading?: boolean;
  className?: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

const getTrendIcon = (trend: 'up' | 'down' | 'stable', _percentage: number) => {
  if (trend === 'up') return <ArrowUpRight className="h-4 w-4 text-green-600" />;
  if (trend === 'down') return <ArrowDownRight className="h-4 w-4 text-red-600" />;
  return <Minus className="h-4 w-4 text-gray-400" />;
};

const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
  if (trend === 'up') return 'text-green-600';
  if (trend === 'down') return 'text-red-600';
  return 'text-gray-400';
};

const PerformanceCard: React.FC<{
  title: string;
  value: string | number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}> = ({ title, value, trend, trendValue, icon: Icon, color = 'blue' }) => (
  <div className="bg-white rounded-lg border p-6">
    <div className="flex items-center justify-between">
      <div className={`p-3 rounded-lg bg-${color}-100`}>
        <Icon className={`h-6 w-6 text-${color}-600`} />
      </div>
      <div className={`flex items-center space-x-1 ${getTrendColor(trend)}`}>
        {getTrendIcon(trend, trendValue)}
        <span className="text-sm font-medium">
          {Math.abs(trendValue).toFixed(1)}%
        </span>
      </div>
    </div>
    <div className="mt-4">
      <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

export function CampaignPerformanceCharts({ data, loading, className = '' }: CampaignPerformanceChartsProps) {
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
            ))}
          </div>
          <div className="bg-gray-200 rounded-lg h-64"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No campaign performance data available</p>
      </div>
    );
  }

  // Calculate aggregate metrics
  const aggregateMetrics = data.reduce(
    (acc, campaign) => ({
      totalCampaigns: acc.totalCampaigns + 1,
      totalEvents: acc.totalEvents + campaign.totalEvents,
      totalConversions: acc.totalConversions + campaign.totalConversions,
      totalRevenue: acc.totalRevenue + campaign.totalRevenue,
      avgTrend: acc.avgTrend + campaign.trendPercentage,
    }),
    {
      totalCampaigns: 0,
      totalEvents: 0,
      totalConversions: 0,
      totalRevenue: 0,
      avgTrend: 0,
    }
  );

  const avgConversionRate = data.length > 0 
    ? data.reduce((sum, campaign) => sum + campaign.conversionRate, 0) / data.length 
    : 0;

  const avgROI = data.length > 0 
    ? data.reduce((sum, campaign) => sum + campaign.roi, 0) / data.length 
    : 0;

  // Performance over time (aggregate daily metrics)
  const performanceOverTime = data[0]?.dailyMetrics?.map((day, index) => ({
    date: new Date(day.date).toLocaleDateString(),
    events: data.reduce((sum, campaign) => 
      sum + (campaign.dailyMetrics[index]?.events || 0), 0),
    conversions: data.reduce((sum, campaign) => 
      sum + (campaign.dailyMetrics[index]?.conversions || 0), 0),
    revenue: data.reduce((sum, campaign) => 
      sum + (campaign.dailyMetrics[index]?.revenue || 0), 0),
  })) || [];

  // Top performing campaigns
  const topPerformers = [...data]
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 10)
    .map(campaign => ({
      name: campaign.campaignName.length > 20 
        ? campaign.campaignName.substring(0, 20) + '...' 
        : campaign.campaignName,
      roi: campaign.roi,
      revenue: campaign.totalRevenue,
      conversions: campaign.totalConversions,
      conversionRate: campaign.conversionRate,
    }));

  // Campaign type distribution
  const typeDistribution = data.reduce((acc, campaign) => {
    const existing = acc.find(item => item.type === campaign.type);
    if (existing) {
      existing.count += 1;
      existing.revenue += campaign.totalRevenue;
      existing.conversions += campaign.totalConversions;
    } else {
      acc.push({
        type: campaign.type,
        count: 1,
        revenue: campaign.totalRevenue,
        conversions: campaign.totalConversions,
      });
    }
    return acc;
  }, [] as Array<{ type: string; count: number; revenue: number; conversions: number }>);

  // ROI vs Conversion Rate scatter plot
  const roiVsConversionData = data.map(campaign => ({
    name: campaign.campaignName.length > 15 
      ? campaign.campaignName.substring(0, 15) + '...' 
      : campaign.campaignName,
    conversionRate: campaign.conversionRate,
    roi: campaign.roi,
    revenue: campaign.totalRevenue,
  }));

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <PerformanceCard
          title="Total Campaigns"
          value={aggregateMetrics.totalCampaigns.toLocaleString()}
          trend="stable"
          trendValue={0}
          icon={Target}
          color="blue"
        />
        <PerformanceCard
          title="Total Events"
          value={aggregateMetrics.totalEvents.toLocaleString()}
          trend={aggregateMetrics.avgTrend > 0 ? 'up' : aggregateMetrics.avgTrend < 0 ? 'down' : 'stable'}
          trendValue={aggregateMetrics.avgTrend / data.length}
          icon={MousePointer}
          color="green"
        />
        <PerformanceCard
          title="Total Conversions"
          value={aggregateMetrics.totalConversions.toLocaleString()}
          trend={avgConversionRate > 3 ? 'up' : avgConversionRate > 1 ? 'stable' : 'down'}
          trendValue={avgConversionRate}
          icon={Eye}
          color="purple"
        />
        <PerformanceCard
          title="Total Revenue"
          value={`$${aggregateMetrics.totalRevenue.toLocaleString()}`}
          trend={avgROI > 100 ? 'up' : avgROI > 50 ? 'stable' : 'down'}
          trendValue={avgROI}
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
            Across all campaigns
          </div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-2">Avg ROI</h3>
          <div className="text-3xl font-bold text-green-600">
            {avgROI.toFixed(0)}%
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Return on investment
          </div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-2">Avg Revenue per Campaign</h3>
          <div className="text-3xl font-bold text-purple-600">
            ${(aggregateMetrics.totalRevenue / aggregateMetrics.totalCampaigns).toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Revenue distribution
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Over Time */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Performance Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceOverTime}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ffc658" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'revenue' ? `$${value.toLocaleString()}` : value.toLocaleString(),
                    name === 'revenue' ? 'Revenue' : name === 'conversions' ? 'Conversions' : 'Events'
                  ]}
                />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="conversions"
                  stroke="#82ca9d"
                  fillOpacity={1}
                  fill="url(#colorConversions)"
                  name="Conversions"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#ffc658"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  name="Revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performing Campaigns */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Top Performing Campaigns (ROI)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPerformers} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  width={100}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'roi' ? `${value.toFixed(1)}%` : 
                    name === 'revenue' ? `$${value.toLocaleString()}` : 
                    value.toLocaleString(),
                    name === 'roi' ? 'ROI' : 
                    name === 'revenue' ? 'Revenue' : 
                    name === 'conversions' ? 'Conversions' : 'Conversion Rate'
                  ]}
                />
                <Bar dataKey="roi" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Campaign Type Distribution */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Campaign Type Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percent }) => `${type.replace('_', ' ')} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {typeDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [
                    value.toLocaleString(),
                    'Campaigns'
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROI vs Conversion Rate Scatter */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">ROI vs Conversion Rate</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={roiVsConversionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="conversionRate" 
                  name="Conversion Rate"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis 
                  type="number" 
                  dataKey="roi" 
                  name="ROI"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value: number, name: string) => [
                    name === 'roi' ? `${value.toFixed(1)}%` : 
                    name === 'conversionRate' ? `${value.toFixed(2)}%` : 
                    `$${value.toLocaleString()}`,
                    name === 'roi' ? 'ROI' : 
                    name === 'conversionRate' ? 'Conversion Rate' : 'Revenue'
                  ]}
                />
                <Scatter fill="#8884d8" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance by Type */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Performance by Campaign Type</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="type" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.replace('_', ' ')}
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
                  name === 'revenue' ? `$${value.toLocaleString()}` : value.toLocaleString(),
                  name === 'revenue' ? 'Revenue' : name === 'conversions' ? 'Conversions' : 'Count'
                ]}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Count" />
              <Bar yAxisId="left" dataKey="conversions" fill="#82ca9d" name="Conversions" />
              <Bar yAxisId="right" dataKey="revenue" fill="#ffc658" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Campaign Performance Table */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Campaign Performance Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-900">Campaign</th>
                <th className="px-6 py-3 text-left font-medium text-gray-900">Customer</th>
                <th className="px-6 py-3 text-left font-medium text-gray-900">Type</th>
                <th className="px-6 py-3 text-right font-medium text-gray-900">Events</th>
                <th className="px-6 py-3 text-right font-medium text-gray-900">Conversions</th>
                <th className="px-6 py-3 text-right font-medium text-gray-900">Conv. Rate</th>
                <th className="px-6 py-3 text-right font-medium text-gray-900">Revenue</th>
                <th className="px-6 py-3 text-right font-medium text-gray-900">ROI</th>
                <th className="px-6 py-3 text-right font-medium text-gray-900">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.slice(0, 20).map((campaign) => (
                <tr key={campaign.campaignId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{campaign.campaignName}</div>
                    <div className="text-gray-500 text-xs capitalize">
                      {campaign.status}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-900">{campaign.customerName}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                      {campaign.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    {campaign.totalEvents.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    {campaign.totalConversions.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-medium ${
                      campaign.conversionRate > 5 ? 'text-green-600' :
                      campaign.conversionRate > 2 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {campaign.conversionRate.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    ${campaign.totalRevenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-medium ${
                      campaign.roi > 100 ? 'text-green-600' :
                      campaign.roi > 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {campaign.roi.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={`flex items-center justify-end space-x-1 ${getTrendColor(campaign.performanceTrend)}`}>
                      {getTrendIcon(campaign.performanceTrend, campaign.trendPercentage)}
                      <span className="text-sm font-medium">
                        {Math.abs(campaign.trendPercentage).toFixed(1)}%
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