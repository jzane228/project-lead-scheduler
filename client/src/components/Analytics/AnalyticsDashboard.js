import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import {
  ChartBarIcon,
  ChartPieIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch analytics data
  const { data: leadMetrics, isLoading: leadsLoading } = useQuery(
    ['leadMetrics', timeRange],
    async () => {
      const response = await axios.get(`/api/analytics/leads-auth?timeRange=${timeRange}`);
      return response.data;
    },
    { refetchInterval: 300000 } // Refresh every 5 minutes
  );

  const { data: scrapingMetrics, isLoading: scrapingLoading } = useQuery(
    ['scrapingMetrics', timeRange],
    async () => {
      const response = await axios.get(`/api/analytics/scraping?timeRange=${timeRange}`);
      return response.data;
    },
    { refetchInterval: 300000 }
  );

  const { data: businessIntelligence, isLoading: biLoading } = useQuery(
    ['businessIntelligence', timeRange],
    async () => {
      const response = await axios.get(`/api/analytics/business?timeRange=${timeRange}`);
      return response.data;
    },
    { refetchInterval: 300000 }
  );

  const isLoading = leadsLoading || scrapingLoading || biLoading;

  // Color schemes for charts
  const chartColors = {
    primary: '#3B82F6',
    secondary: '#10B981',
    accent: '#F59E0B',
    danger: '#EF4444',
    warning: '#F97316',
    info: '#06B6D4'
  };

  const pieColors = [chartColors.primary, chartColors.secondary, chartColors.accent, chartColors.danger, chartColors.warning];

  // Prepare chart data
  const prepareChartData = (data, type) => {
    if (!data) return [];
    
    switch (type) {
      case 'trends':
        return data.trends?.map(item => ({
          date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          leads: item.leadCount,
          qualified: item.qualifiedCount,
          rate: parseFloat(item.qualificationRate)
        })) || [];
      
      case 'status':
        return Object.entries(data.conversion?.statusBreakdown || {}).map(([status, count]) => ({
          status: status.charAt(0).toUpperCase() + status.slice(1),
          count,
          fill: getStatusColor(status)
        }));
      
      case 'priority':
        return Object.entries(data.conversion?.priorityBreakdown || {}).map(([priority, count]) => ({
          priority: priority.charAt(0).toUpperCase() + priority.slice(1),
          count,
          fill: getPriorityColor(priority)
        }));
      
      case 'sources':
        return data.sources?.map(source => ({
          name: source.name,
          leads: source.leadCount,
          quality: parseFloat(source.averageQuality),
          fill: getSourceColor(source.type)
        })) || [];
      
      default:
        return [];
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'new': chartColors.info,
      'qualified': chartColors.secondary,
      'proposal': chartColors.accent,
      'negotiation': chartColors.warning,
      'won': chartColors.primary,
      'lost': chartColors.danger
    };
    return colors[status] || chartColors.info;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'high': chartColors.danger,
      'medium': chartColors.accent,
      'low': chartColors.secondary
    };
    return colors[priority] || chartColors.info;
  };

  const getSourceColor = (type) => {
    const colors = {
      'google': chartColors.primary,
      'bing': chartColors.secondary,
      'news': chartColors.accent,
      'rss': chartColors.warning,
      'scrapy': chartColors.info
    };
    return colors[type] || chartColors.info;
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-80 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-6">
            <div className="flex items-center mb-4 sm:mb-0">
              <ChartBarIcon className="h-8 w-8 text-indigo-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-sm text-gray-600">Real-time insights into your lead generation performance</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="block px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
              
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <InformationCircleIcon className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: ChartBarIcon },
              { id: 'leads', label: 'Lead Analytics', icon: UserGroupIcon },
              { id: 'scraping', label: 'Scraping Performance', icon: ArrowTrendingUpIcon },
              { id: 'business', label: 'Business Intelligence', icon: CurrencyDollarIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <OverviewTab 
            leadMetrics={leadMetrics}
            scrapingMetrics={scrapingMetrics}
            businessIntelligence={businessIntelligence}
            chartColors={chartColors}
            prepareChartData={prepareChartData}
            isMobile={isMobile}
          />
        )}
        
        {activeTab === 'leads' && (
          <LeadsTab 
            leadMetrics={leadMetrics}
            chartColors={chartColors}
            prepareChartData={prepareChartData}
            isMobile={isMobile}
          />
        )}
        
        {activeTab === 'scraping' && (
          <ScrapingTab 
            scrapingMetrics={scrapingMetrics}
            chartColors={chartColors}
            prepareChartData={prepareChartData}
            isMobile={isMobile}
          />
        )}
        
        {activeTab === 'business' && (
          <BusinessTab 
            businessIntelligence={businessIntelligence}
            chartColors={chartColors}
            prepareChartData={prepareChartData}
            isMobile={isMobile}
          />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ leadMetrics, scrapingMetrics, businessIntelligence, chartColors, prepareChartData, isMobile }) => {
  if (!leadMetrics || !scrapingMetrics || !businessIntelligence) return null;

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Leads"
          value={leadMetrics.counts?.total || 0}
          change={leadMetrics.counts?.newThisPeriod || 0}
          changeLabel="This period"
          icon={UserGroupIcon}
          color="blue"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${leadMetrics.counts?.conversionRate || 0}%`}
          change={parseFloat(leadMetrics.counts?.conversionRate || 0) - 5}
          changeLabel="vs last period"
          icon={CheckCircleIcon}
          color="green"
        />
        <MetricCard
          title="Pipeline Value"
          value={`$${(businessIntelligence.revenue?.totalPipeline || 0).toLocaleString()}`}
          change={parseFloat(businessIntelligence.revenue?.conversionProbability || 0)}
          changeLabel="conversion probability"
          icon={CurrencyDollarIcon}
          color="yellow"
        />
        <MetricCard
          title="Scraping Success"
          value={`${scrapingMetrics.performance?.successRate || 0}%`}
          change={scrapingMetrics.performance?.averageLeadsPerRun || 0}
          changeLabel="avg leads per run"
                          icon={ArrowTrendingUpIcon}
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Trends */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Generation Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={prepareChartData(leadMetrics, 'trends')}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="leads" stroke={chartColors.primary} strokeWidth={2} />
              <Line type="monotone" dataKey="qualified" stroke={chartColors.secondary} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={prepareChartData(leadMetrics, 'status')}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="count"
                label={({ status, count }) => `${status}: ${count}`}
              >
                {prepareChartData(leadMetrics, 'status').map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quality Metrics */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Quality Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QualityMetric
            label="Company Completeness"
            value={scrapingMetrics.dataQuality?.companyCompleteness || 0}
            color="green"
          />
          <QualityMetric
            label="Contact Completeness"
            value={scrapingMetrics.dataQuality?.contactCompleteness || 0}
            color="blue"
          />
          <QualityMetric
            label="Budget Completeness"
            value={scrapingMetrics.dataQuality?.budgetCompleteness || 0}
            color="yellow"
          />
          <QualityMetric
            label="Location Completeness"
            value={scrapingMetrics.dataQuality?.locationCompleteness || 0}
            color="purple"
          />
        </div>
      </div>
    </div>
  );
};

// Leads Tab Component
const LeadsTab = ({ leadMetrics, chartColors, prepareChartData, isMobile }) => {
  if (!leadMetrics) return null;

  return (
    <div className="space-y-6">
      {/* Lead Quality Overview */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Quality Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{leadMetrics.quality?.averageQuality || 0}%</div>
            <div className="text-sm text-gray-600">Average Quality</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{leadMetrics.quality?.highQuality || 0}</div>
            <div className="text-sm text-gray-600">High Quality</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{leadMetrics.quality?.mediumQuality || 0}</div>
            <div className="text-sm text-gray-600">Medium Quality</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{leadMetrics.quality?.lowQuality || 0}</div>
            <div className="text-sm text-gray-600">Low Quality</div>
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
        <div className="space-y-4">
          {leadMetrics.conversion?.conversionFunnel?.map((stage, index) => (
            <div key={stage.stage} className="flex items-center">
              <div className="w-24 text-sm font-medium text-gray-600 capitalize">{stage.stage}</div>
              <div className="flex-1 mx-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${stage.conversionRate}%` }}
                  ></div>
                </div>
              </div>
              <div className="w-20 text-right text-sm font-medium text-gray-900">
                {stage.count} ({stage.conversionRate}%)
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Source Performance */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Source Performance</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={prepareChartData(leadMetrics, 'sources')}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="leads" fill={chartColors.primary} />
            <Bar dataKey="quality" fill={chartColors.secondary} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Scraping Tab Component
const ScrapingTab = ({ scrapingMetrics, chartColors, prepareChartData, isMobile }) => {
  if (!scrapingMetrics) return null;

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Configurations</h3>
          <div className="text-3xl font-bold text-indigo-600">{scrapingMetrics.performance?.totalConfigurations || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Success Rate</h3>
          <div className="text-3xl font-bold text-green-600">{scrapingMetrics.performance?.successRate || 0}%</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Avg Leads/Run</h3>
          <div className="text-3xl font-bold text-blue-600">{scrapingMetrics.performance?.averageLeadsPerRun || 0}</div>
        </div>
      </div>

      {/* AI vs Pattern Extraction */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Extraction Method Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-2">AI Extraction</h4>
            <div className="text-2xl font-bold text-purple-600">{scrapingMetrics.dataQuality?.aiExtractionRate || 0}%</div>
            <div className="text-sm text-gray-600">of leads use AI extraction</div>
          </div>
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-2">Pattern Extraction</h4>
            <div className="text-2xl font-bold text-orange-600">{scrapingMetrics.dataQuality?.patternExtractionRate || 0}%</div>
            <div className="text-sm text-gray-600">of leads use pattern extraction</div>
          </div>
        </div>
      </div>

      {/* Scraping Trends */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scraping Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={prepareChartData(scrapingMetrics, 'trends')}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="totalLeads" stroke={chartColors.primary} strokeWidth={2} />
            <Line type="monotone" dataKey="aiExtracted" stroke={chartColors.secondary} strokeWidth={2} />
            <Line type="monotone" dataKey="patternExtracted" stroke={chartColors.accent} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Business Tab Component
const BusinessTab = ({ businessIntelligence, chartColors, prepareChartData, isMobile }) => {
  if (!businessIntelligence) return null;

  return (
    <div className="space-y-6">
      {/* Revenue Projections */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Projections</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              ${(businessIntelligence.revenue?.totalPipeline || 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Pipeline</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              ${(businessIntelligence.revenue?.weightedPipeline || 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Weighted Pipeline</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              ${(businessIntelligence.revenue?.averageDealSize || 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Average Deal Size</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {businessIntelligence.revenue?.conversionProbability || 0}%
            </div>
            <div className="text-sm text-gray-600">Conversion Probability</div>
          </div>
        </div>
      </div>

      {/* Market Insights */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Insights</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-3">Top Industries</h4>
            <div className="space-y-2">
              {businessIntelligence.market?.topIndustries?.map((industry, index) => (
                <div key={industry.value} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{industry.value}</span>
                  <span className="text-sm font-medium text-gray-900">{industry.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-3">Top Locations</h4>
            <div className="space-y-2">
              {businessIntelligence.market?.topLocations?.map((location, index) => (
                <div key={location.value} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{location.value}</span>
                  <span className="text-sm font-medium text-gray-900">{location.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Competitive Analysis */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Competitive Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{businessIntelligence.competitive?.averageLeadScore || 0}</div>
            <div className="text-sm text-gray-600">Average Lead Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{businessIntelligence.competitive?.highPriorityLeads || 0}</div>
            <div className="text-sm text-gray-600">High Priority Leads</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{businessIntelligence.competitive?.competitiveAdvantage || 'Unknown'}</div>
            <div className="text-sm text-gray-600">Competitive Advantage</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{businessIntelligence.competitive?.marketPosition || 'Unknown'}</div>
            <div className="text-sm text-gray-600">Market Position</div>
          </div>
        </div>
      </div>

      {/* ROI Metrics */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">ROI Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">${businessIntelligence.roi?.subscriptionCost || 0}</div>
            <div className="text-sm text-gray-600">Subscription Cost</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">${businessIntelligence.roi?.totalLeadValue || 0}</div>
            <div className="text-sm text-gray-600">Total Lead Value</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{businessIntelligence.roi?.roi || 0}%</div>
            <div className="text-sm text-gray-600">ROI</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">${businessIntelligence.roi?.costPerLead || 0}</div>
            <div className="text-sm text-gray-600">Cost Per Lead</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, change, changeLabel, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    purple: 'text-purple-600',
    red: 'text-red-600'
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center">
        <div className={`p-2 rounded-lg bg-${color}-100`}>
          <Icon className={`h-6 w-6 ${colorClasses[color]}`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
      <div className="mt-4">
        <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? '+' : ''}{change}
        </span>
        <span className="text-sm text-gray-600 ml-1">{changeLabel}</span>
      </div>
    </div>
  );
};

// Quality Metric Component
const QualityMetric = ({ label, value, color }) => {
  const colorClasses = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    yellow: 'text-yellow-600',
    purple: 'text-purple-600'
  };

  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}%</div>
      <div className="text-sm text-gray-600">{label}</div>
      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
        <div
          className={`bg-${color}-600 h-2 rounded-full transition-all duration-500`}
          style={{ width: `${value}%` }}
        ></div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
