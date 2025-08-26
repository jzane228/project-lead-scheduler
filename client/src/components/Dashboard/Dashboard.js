import React from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import {
  UserGroupIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  GlobeAltIcon,
  ArrowUpIcon,
  CloudIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const { data: stats, isLoading } = useQuery('dashboardStats', async () => {
    const response = await axios.get('/api/dashboard/stats');
    return response.data;
  });

  const { data: recentLeads, isLoading: leadsLoading } = useQuery('recentLeads', async () => {
    const response = await axios.get('/api/leads?limit=5');
    return response.data;
  });

  const { data: upcomingExports, isLoading: exportsLoading } = useQuery('upcomingExports', async () => {
    const response = await axios.get('/api/export/upcoming');
    return response.data;
  });

  const statCards = [
    {
      name: 'Total Leads',
      value: stats?.totalLeads || 0,
      change: stats?.leadsChange || 0,
      changeType: 'increase',
      icon: UserGroupIcon,
      color: 'bg-blue-500'
    },
    {
      name: 'Active Scraping Configs',
      value: stats?.activeScrapingConfigs || 0,
      change: stats?.configsChange || 0,
      changeType: 'increase',
      icon: DocumentTextIcon,
      color: 'bg-green-500'
    },
    {
      name: 'Monthly Growth',
      value: `${stats?.monthlyGrowth || 0}%`,
      change: stats?.growthChange || 0,
      changeType: 'increase',
      icon: ArrowTrendingUpIcon,
      color: 'bg-purple-500'
    },
    {
      name: 'Pending Exports',
      value: stats?.pendingExports || 0,
      change: stats?.exportsChange || 0,
      changeType: 'decrease',
      icon: ClockIcon,
      color: 'bg-yellow-500'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'reviewed':
        return 'bg-yellow-100 text-yellow-800';
      case 'contacted':
        return 'bg-purple-100 text-purple-800';
      case 'qualified':
        return 'bg-green-100 text-green-800';
      case 'converted':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back! Here's what's happening with your lead generation today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`${stat.color} rounded-md p-3`}>
                    <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                    <dd className="text-lg font-medium text-gray-900">{stat.value}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className={`font-medium ${
                  stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.changeType === 'increase' ? '+' : ''}{stat.change}%
                </span>
                <span className="text-gray-500"> from last month</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Leads</h3>
            <p className="mt-1 text-sm text-gray-500">Latest leads discovered by your scraping configurations</p>
          </div>
          <div className="divide-y divide-gray-200">
            {leadsLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : recentLeads?.leads?.length > 0 ? (
              recentLeads.leads.map((lead) => (
                <div key={lead.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{lead.title}</p>
                      <p className="text-sm text-gray-500 truncate">{lead.company}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(lead.priority)}`}>
                        {lead.priority}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <GlobeAltIcon className="h-4 w-4 mr-1" />
                      <span className="truncate">{lead.sourceUrl}</span>
                    </div>
                    <span>{new Date(lead.scrapedDate).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No leads yet</h3>
                <p className="mt-1 text-sm text-gray-500">Start by creating a scraping configuration to discover leads.</p>
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-200">
            <a href="/leads" className="text-sm font-medium text-primary-600 hover:text-primary-500">
              View all leads →
            </a>
          </div>
        </div>

        {/* Upcoming Exports */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Upcoming Exports</h3>
            <p className="mt-1 text-sm text-gray-500">Scheduled exports for the next 7 days</p>
          </div>
          <div className="divide-y divide-gray-200">
            {exportsLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : upcomingExports?.length > 0 ? (
              upcomingExports.map((exportSchedule) => (
                <div key={exportSchedule.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{exportSchedule.name}</p>
                      <p className="text-sm text-gray-500 truncate">{exportSchedule.description}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {exportSchedule.exportFormat}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      <span>{exportSchedule.frequency}</span>
                    </div>
                    <span>{new Date(exportSchedule.nextRun).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">
                <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming exports</h3>
                <p className="mt-1 text-sm text-gray-500">Create export schedules to automatically export your leads.</p>
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-200">
            <a href="/export" className="text-sm font-medium text-primary-600 hover:text-primary-500">
              Manage exports →
            </a>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          <p className="mt-1 text-sm text-gray-500">Get started quickly with these common tasks</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <a
              href="/scraping/new"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
            >
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">New Scraping Config</p>
                <p className="text-sm text-gray-500">Set up automated lead discovery</p>
              </div>
            </a>

            <a
              href="/export/new"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
            >
              <div className="flex-shrink-0">
                <ArrowUpIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Export Schedule</p>
                <p className="text-sm text-gray-500">Automate lead exports</p>
              </div>
            </a>

            <a
              href="/crm/new"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
            >
              <div className="flex-shrink-0">
                <CloudIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">CRM Integration</p>
                <p className="text-sm text-gray-500">Connect to your CRM</p>
              </div>
            </a>

            <a
              href="/leads"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
            >
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">View Leads</p>
                <p className="text-sm text-gray-500">Browse discovered leads</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
