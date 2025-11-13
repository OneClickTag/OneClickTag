import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Server,
  Database,
  Wifi,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  HardDrive,
  Cpu,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { SystemHealthMetrics } from '@/types/analytics.types';

interface SystemHealthIndicatorsProps {
  data: SystemHealthMetrics;
  historyData?: Array<{
    timestamp: string;
    overall: number;
    api: number;
    gtm: number;
    database: number;
    realtime: number;
  }>;
  loading?: boolean;
  className?: string;
}

const getStatusColor = (status: 'healthy' | 'warning' | 'critical' | 'degraded' | 'down' | 'slow' | 'failing') => {
  switch (status) {
    case 'healthy':
      return 'text-green-600 bg-green-100';
    case 'warning':
    case 'degraded':
    case 'slow':
      return 'text-yellow-600 bg-yellow-100';
    case 'critical':
    case 'down':
    case 'failing':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

const getStatusIcon = (status: 'healthy' | 'warning' | 'critical' | 'degraded' | 'down' | 'slow' | 'failing') => {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="h-5 w-5" />;
    case 'warning':
    case 'degraded':
    case 'slow':
      return <AlertTriangle className="h-5 w-5" />;
    case 'critical':
    case 'down':
    case 'failing':
      return <XCircle className="h-5 w-5" />;
    default:
      return <Clock className="h-5 w-5" />;
  }
};

const HealthCard: React.FC<{
  title: string;
  status: string;
  metrics: Array<{ label: string; value: string | number; unit?: string }>;
  icon: React.ComponentType<{ className?: string }>;
}> = ({ title, status, metrics, icon: Icon }) => (
  <div className="bg-white rounded-lg border p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-gray-100">
          <Icon className="h-6 w-6 text-gray-600" />
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status as any)}`}>
        {getStatusIcon(status as any)}
        <span className="capitalize">{status}</span>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      {metrics.map((metric, index) => (
        <div key={index}>
          <p className="text-sm text-gray-600">{metric.label}</p>
          <p className="text-lg font-semibold">
            {metric.value}{metric.unit && <span className="text-sm text-gray-500 ml-1">{metric.unit}</span>}
          </p>
        </div>
      ))}
    </div>
  </div>
);

export function SystemHealthIndicators({ 
  data, 
  historyData = [], 
  loading, 
  className = '' 
}: SystemHealthIndicatorsProps) {
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-40"></div>
            ))}
          </div>
          <div className="bg-gray-200 rounded-lg h-64"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No system health data available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall Health Score */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">System Health Overview</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4" />
            <span>Last updated: {new Date(data.overall.lastUpdated).toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold ${
              data.overall.score >= 90 ? 'bg-green-100 text-green-600' :
              data.overall.score >= 70 ? 'bg-yellow-100 text-yellow-600' :
              'bg-red-100 text-red-600'
            }`}>
              {data.overall.score}
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-gray-200">
              <div 
                className={`absolute inset-0 rounded-full border-4 border-transparent ${
                  data.overall.score >= 90 ? 'border-green-500' :
                  data.overall.score >= 70 ? 'border-yellow-500' :
                  'border-red-500'
                }`}
                style={{
                  clipPath: `polygon(0 0, ${data.overall.score}% 0, ${data.overall.score}% 100%, 0 100%)`
                }}
              />
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-lg font-medium ${getStatusColor(data.overall.status)}`}>
            {getStatusIcon(data.overall.status)}
            <span className="capitalize">{data.overall.status}</span>
          </div>
        </div>
      </div>

      {/* System Components */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* API Health */}
        <HealthCard
          title="API Health"
          status={data.apiHealth.status}
          metrics={[
            { label: 'Response Time', value: data.apiHealth.responseTime, unit: 'ms' },
            { label: 'Error Rate', value: data.apiHealth.errorRate.toFixed(2), unit: '%' },
            { label: 'Uptime', value: data.apiHealth.uptime.toFixed(1), unit: '%' },
            { label: 'Requests/min', value: data.apiHealth.requestsPerMinute.toLocaleString() },
          ]}
          icon={Globe}
        />

        {/* GTM Sync */}
        <HealthCard
          title="GTM Sync"
          status={data.gtmSync.status}
          metrics={[
            { label: 'Success Rate', value: data.gtmSync.successRate.toFixed(1), unit: '%' },
            { label: 'Avg Sync Time', value: data.gtmSync.avgSyncTime, unit: 'ms' },
            { label: 'Pending Jobs', value: data.gtmSync.pendingJobs },
            { label: 'Failed Jobs', value: data.gtmSync.failedJobs },
          ]}
          icon={Zap}
        />

        {/* Database */}
        <HealthCard
          title="Database"
          status={data.database.status}
          metrics={[
            { label: 'Query Time', value: data.database.queryTime, unit: 'ms' },
            { label: 'Connections', value: data.database.connections },
            { label: 'Slow Queries', value: data.database.slowQueries },
            { label: 'Disk Usage', value: data.database.diskUsage.toFixed(1), unit: '%' },
          ]}
          icon={Database}
        />

        {/* Real-time */}
        <HealthCard
          title="Real-time"
          status={data.realtime.status}
          metrics={[
            { label: 'Active Connections', value: data.realtime.activeConnections },
            { label: 'Messages/sec', value: data.realtime.messagesPerSecond },
            { label: 'Connection Errors', value: data.realtime.connectionErrors },
            { label: 'Latency', value: data.realtime.latency, unit: 'ms' },
          ]}
          icon={Wifi}
        />
      </div>

      {/* Health History Chart */}
      {historyData.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Health Trends (Last 24 Hours)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="overall" 
                  stroke="#8884d8" 
                  strokeWidth={3}
                  name="Overall Health"
                />
                <Line 
                  type="monotone" 
                  dataKey="api" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="API Health"
                />
                <Line 
                  type="monotone" 
                  dataKey="gtm" 
                  stroke="#ffc658" 
                  strokeWidth={2}
                  name="GTM Sync"
                />
                <Line 
                  type="monotone" 
                  dataKey="database" 
                  stroke="#ff7c7c" 
                  strokeWidth={2}
                  name="Database"
                />
                <Line 
                  type="monotone" 
                  dataKey="realtime" 
                  stroke="#8dd1e1" 
                  strokeWidth={2}
                  name="Real-time"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* System Errors and Alerts */}
      {data.errors.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Recent Errors & Alerts</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {data.errors.slice(0, 10).map((error) => (
              <div key={error.id} className="p-6 flex items-start space-x-4">
                <div className={`p-2 rounded-full ${
                  error.type === 'error' ? 'bg-red-100' :
                  error.type === 'warning' ? 'bg-yellow-100' :
                  'bg-blue-100'
                }`}>
                  {error.type === 'error' ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : error.type === 'warning' ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">{error.message}</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        error.type === 'error' ? 'bg-red-100 text-red-800' :
                        error.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {error.type}
                      </span>
                      <span>{new Date(error.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-gray-600 mt-1">{error.message}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>Component: {error.component}</span>
                    {error.count > 1 && <span>Count: {error.count}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4 text-center">
          <Activity className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {data.apiHealth.requestsPerMinute.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Requests/min</div>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <Cpu className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {data.apiHealth.responseTime}ms
          </div>
          <div className="text-sm text-gray-600">Avg Response</div>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <HardDrive className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {data.database.diskUsage.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Disk Usage</div>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <Wifi className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {data.realtime.activeConnections}
          </div>
          <div className="text-sm text-gray-600">Active Connections</div>
        </div>
      </div>
    </div>
  );
}