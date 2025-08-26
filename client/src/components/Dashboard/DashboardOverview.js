import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon, 
  ArrowTrendingUpIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  Cog6ToothIcon,
  CloudIcon,
  DocumentArrowDownIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const DashboardOverview = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Update mobile state on window resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery(
    ['dashboard-overview', timeRange],
    async () => {
      const [stats, overview, recentActivity, quickActions, alerts] = await Promise.all([
        axios.get(`/api/dashboard/stats?timeRange=${timeRange}`),
        axios.get(`/api/dashboard/overview?timeRange=${timeRange}`),
        axios.get('/api/dashboard/recent-activity'),
        axios.get('/api/dashboard/quick-actions'),
        axios.get('/api/dashboard/alerts')
      ]);

      return {
        stats: stats.data,
        overview: overview.data,
        recentActivity: recentActivity.data,
        quickActions: quickActions.data,
        alerts: alerts.data
      };
    },
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );

  // Prepare chart data
  const prepareChartData = (data, type = 'line') => {
    if (!data || !Array.isArray(data)) return [];
    
    if (type === 'line') {
      return data.map(item => ({
        name: item.date || item.name,
        value: item.value || item.count,
        ...item
      }));
    }
    
    return data;
  };

  // Get metric change indicator
  const getMetricChange = (change) => {
    if (!change) return null;
    
    const isPositive = change > 0;
    return (
      <div className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <ArrowUpIcon className="w-4 h-4 mr-1" />
        ) : (
          <ArrowDownIcon className="w-4 h-4 mr-1" />
        )}
        {Math.abs(change)}%
      </div>
    );
  };

  // Get alert icon
  const getAlertIcon = (type) => {
    switch (type) {
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  // Get alert color
  const getAlertColor = (type) => {
    switch (type) {
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const { stats, overview, recentActivity, quickActions, alerts } = dashboardData || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
            <p className="text-gray-600">
              Monitor your lead generation performance and system health
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Leads"
          value={stats?.leads?.total || 0}
          change={stats?.leads?.change}
          getMetricChange={getMetricChange}
          icon={UserGroupIcon}
          color="blue"
        />
        <MetricCard
          title="Active Scraping"
          value={stats?.scraping?.activeConfigs || 0}
          change={stats?.scraping?.configsChange}
          getMetricChange={getMetricChange}
          icon={ChartBarIcon}
          color="green"
        />
        <MetricCard
          title="CRM Synced"
          value={stats?.crm?.totalSynced || 0}
          change={null}
          getMetricChange={getMetricChange}
          icon={CloudIcon}
          color="purple"
        />
        <MetricCard
          title="Monthly Growth"
          value={`${stats?.performance?.monthlyGrowth || 0}%`}
          change={stats?.performance?.growthChange}
          getMetricChange={getMetricChange}
          icon={ArrowTrendingUpIcon}
          color="orange"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Lead Trends */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Generation Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={prepareChartData(overview?.charts?.leadTrends)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Source Performance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Source Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={prepareChartData(overview?.charts?.sourcePerformance, 'bar')}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="leads" fill="#10B981" />
              <Bar dataKey="quality" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Content Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <button className="text-sm text-blue-600 hover:text-blue-700">
                View All
              </button>
            </div>
            
            <div className="space-y-4">
              {recentActivity?.activities?.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    {activity.type === 'lead' && <UserGroupIcon className="w-5 h-5 text-blue-500" />}
                    {activity.type === 'scraping' && <ChartBarIcon className="w-5 h-5 text-green-500" />}
                    {activity.type === 'export' && <DocumentArrowDownIcon className="w-5 h-5 text-purple-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.action === 'created' ? 'New lead created' : 
                       activity.action === 'completed' ? 'Scraping completed' : activity.action}
                    </p>
                    <p className="text-sm text-gray-500">
                      {activity.title || activity.company || 'N/A'}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-sm text-gray-500">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions & Alerts */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {quickActions?.map((action) => (
                <button
                  key={action.id}
                  onClick={() => window.location.href = action.url}
                  className="w-full flex items-center space-x-3 p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${action.color}-100`}>
                    {action.icon === 'scraping' && <ChartBarIcon className="w-5 h-5 text-blue-600" />}
                    {action.icon === 'export' && <DocumentArrowDownIcon className="w-5 h-5 text-green-600" />}
                    {action.icon === 'crm' && <CloudIcon className="w-5 h-5 text-purple-600" />}
                    {action.icon === 'analytics' && <ArrowTrendingUpIcon className="w-5 h-5 text-orange-600" />}
                    {action.icon === 'tags' && <TagIcon className="w-5 h-5 text-indigo-600" />}
                    {action.icon === 'settings' && <Cog6ToothIcon className="w-5 h-5 text-gray-600" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{action.title}</div>
                    <div className="text-xs text-gray-500">{action.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* System Alerts */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">System Alerts</h3>
              <div className="flex space-x-2">
                {alerts?.critical > 0 && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                    {alerts.critical}
                  </span>
                )}
                {alerts?.warnings > 0 && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                    {alerts.warnings}
                  </span>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              {alerts?.alerts?.slice(0, 3).map((alert, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg ${getAlertColor(alert.type)}`}
                >
                  <div className="flex items-start space-x-3">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                      {alert.action && (
                        <button className="text-sm text-blue-600 hover:text-blue-700 mt-2">
                          {alert.action}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {(!alerts?.alerts || alerts.alerts.length === 0) && (
                <div className="text-center py-4">
                  <CheckCircleIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">All systems operational</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="mt-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats?.leads?.quality || 0}%
              </div>
              <div className="text-sm text-gray-500">Lead Quality Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats?.leads?.conversion || 0}%
              </div>
              <div className="text-sm text-gray-500">Conversion Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats?.scraping?.successRate || 0}%
              </div>
              <div className="text-sm text-gray-500">Scraping Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats?.performance?.avgResponseTime || 0}ms
              </div>
              <div className="text-sm text-gray-500">Avg Response Time</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
const MetricCard = ({ title, value, change, getMetricChange, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${colorClasses[color]} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${colorClasses[color].replace('bg-', 'text-')}`} />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
      {change && (
        <div className="mt-4">
          {getMetricChange(change)}
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;
