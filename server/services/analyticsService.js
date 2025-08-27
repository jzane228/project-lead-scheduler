const { Lead, ScrapingConfig, LeadSource, User, Tag, LeadTag } = require('../models');
const { Op } = require('sequelize');

class AnalyticsService {
  constructor() {
    this.metrics = new Map();
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // ===== LEAD ANALYTICS =====
  
  async getLeadMetrics(userId, timeRange = '30d') {
    const cacheKey = `lead_metrics_${userId}_${timeRange}`;
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const { startDate, endDate } = this.getDateRange(timeRange);
    
    const metrics = await Promise.all([
      this.getLeadCounts(userId, startDate, endDate),
      this.getLeadQualityMetrics(userId, startDate, endDate),
      this.getLeadSourcePerformance(userId, startDate, endDate),
      this.getLeadConversionMetrics(userId, startDate, endDate),
      this.getLeadTrends(userId, startDate, endDate)
    ]);

    const result = {
      timeRange,
      period: { startDate, endDate },
      counts: metrics[0],
      quality: metrics[1],
      sources: metrics[2],
      conversion: metrics[3],
      trends: metrics[4],
      lastUpdated: new Date()
    };

    this.setCache(cacheKey, result);
    return result;
  }

  async getLeadCounts(userId, startDate, endDate) {
    const [total, newLeads, qualified, converted] = await Promise.all([
      Lead.count({ where: { user_id: userId } }),
      Lead.count({ 
        where: { 
          user_id: userId,
          createdAt: { [Op.between]: [startDate, endDate] }
        }
      }),
      Lead.count({ 
        where: { 
          user_id: userId,
          status: { [Op.in]: ['qualified', 'proposal'] }
        }
      }),
      Lead.count({ 
        where: { 
          user_id: userId,
          status: 'won'
        }
      })
    ]);

    return {
      total,
      newThisPeriod: newLeads,
      qualified,
      converted,
      conversionRate: total > 0 ? ((converted / total) * 100).toFixed(2) : 0
    };
  }

  async getLeadQualityMetrics(userId, startDate, endDate) {
    const leads = await Lead.findAll({
      where: {
        user_id: userId,
        createdAt: { [Op.between]: [startDate, endDate] }
      },
      attributes: ['score', 'confidence', 'company', 'contact_info', 'budget']
    });

    const qualityScores = leads.map(lead => {
      let score = 0;
      if (lead.company && lead.company !== 'Unknown') score += 25;
      if (lead.contact_info && lead.contact_info !== 'Unknown') score += 25;
      if (lead.budget) score += 25;
      if (lead.score) score += lead.score * 0.25;
      return Math.min(100, score);
    });

    const avgQuality = qualityScores.length > 0 
      ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length 
      : 0;

    return {
      averageQuality: avgQuality.toFixed(2),
      highQuality: qualityScores.filter(s => s >= 80).length,
      mediumQuality: qualityScores.filter(s => s >= 50 && s < 80).length,
      lowQuality: qualityScores.filter(s => s < 50).length,
      totalScored: qualityScores.length
    };
  }

  async getLeadSourcePerformance(userId, startDate, endDate) {
    const sources = await LeadSource.findAll({
      where: { user_id: userId },
      include: [{
        model: Lead,
        as: 'leads',
        where: {
          createdAt: { [Op.between]: [startDate, endDate] }
        },
        required: false
      }],
      attributes: ['name', 'type', 'success_rate']
    });

    return sources.map(source => ({
      name: source.name,
      type: source.type,
      successRate: source.success_rate || 0,
      leadCount: source.leads?.length || 0,
      averageQuality: this.calculateSourceQuality(source.leads || [])
    }));
  }

  async getLeadConversionMetrics(userId, startDate, endDate) {
    const leads = await Lead.findAll({
      where: {
        user_id: userId,
        createdAt: { [Op.between]: [startDate, endDate] }
      },
      attributes: ['status', 'priority', 'createdAt', 'updatedAt']
    });

    const statusCounts = {};
    const priorityCounts = {};
    const conversionTime = [];

    leads.forEach(lead => {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
      priorityCounts[lead.priority] = (priorityCounts[lead.priority] || 0) + 1;
      
      if (lead.status === 'won') {
        const timeToConvert = lead.updatedAt - lead.createdAt;
        conversionTime.push(timeToConvert / (1000 * 60 * 60 * 24)); // Convert to days
      }
    });

    return {
      statusBreakdown: statusCounts,
      priorityBreakdown: priorityCounts,
      averageTimeToConvert: conversionTime.length > 0 
        ? (conversionTime.reduce((a, b) => a + b, 0) / conversionTime.length).toFixed(1)
        : 0,
      conversionFunnel: this.buildConversionFunnel(statusCounts)
    };
  }

  async getLeadTrends(userId, startDate, endDate) {
    const leads = await Lead.findAll({
      where: {
        user_id: userId,
        createdAt: { [Op.between]: [startDate, endDate] }
      },
      attributes: ['createdAt', 'status', 'score'],
      order: [['createdAt', 'ASC']]
    });

    // Group by day
    const dailyStats = {};
    leads.forEach(lead => {
      const date = lead.createdAt.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { count: 0, totalScore: 0, qualified: 0 };
      }
      dailyStats[date].count++;
      dailyStats[date].totalScore += lead.score || 0;
      if (['qualified', 'proposal'].includes(lead.status)) {
        dailyStats[date].qualified++;
      }
    });

    return Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      leadCount: stats.count,
      averageScore: stats.count > 0 ? (stats.totalScore / stats.count).toFixed(2) : 0,
      qualifiedCount: stats.qualified,
      qualificationRate: stats.count > 0 ? ((stats.qualified / stats.count) * 100).toFixed(2) : 0
    }));
  }

  // ===== SCRAPING ANALYTICS =====

  async getScrapingMetrics(userId, timeRange = '30d') {
    const cacheKey = `scraping_metrics_${userId}_${timeRange}`;
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const { startDate, endDate } = this.getDateRange(timeRange);
    
    const metrics = await Promise.all([
      this.getScrapingPerformance(userId, startDate, endDate),
      this.getSourceEffectiveness(userId, startDate, endDate),
      this.getScrapingTrends(userId, startDate, endDate),
      this.getDataQualityMetrics(userId, startDate, endDate)
    ]);

    const result = {
      timeRange,
      period: { startDate, endDate },
      performance: metrics[0],
      sources: metrics[1],
      trends: metrics[2],
      dataQuality: metrics[3],
      lastUpdated: new Date()
    };

    this.setCache(cacheKey, result);
    return result;
  }

  async getScrapingPerformance(userId, startDate, endDate) {
    const configs = await ScrapingConfig.findAll({
      where: { user_id: userId }
    });

    // Get leads generated in the time period
    const leads = await Lead.count({
      where: {
        user_id: userId,
        createdAt: { [Op.between]: [startDate, endDate] }
      }
    });

    const activeConfigs = configs.filter(config => config.is_active).length;
    const totalRuns = configs.length;
    const successfulRuns = leads > 0 ? 1 : 0; // Simplified logic
    const totalLeads = leads;

    return {
      totalConfigurations: activeConfigs,
      totalRuns,
      successfulRuns,
      successRate: totalRuns > 0 ? ((successfulRuns / totalRuns) * 100).toFixed(2) : 0,
      totalLeadsGenerated: totalLeads,
      averageLeadsPerRun: totalLeads > 0 ? totalLeads.toFixed(2) : 0,
      mostProductiveConfig: null // Simplified for now
    };
  }

  async getSourceEffectiveness(userId, startDate, endDate) {
    const sources = await LeadSource.findAll({
      where: { user_id: userId },
      include: [{
        model: Lead,
        as: 'leads',
        where: {
          createdAt: { [Op.between]: [startDate, endDate] }
        },
        required: false
      }],
      attributes: ['name', 'type', 'success_rate', 'total_leads']
    });

    return sources.map(source => ({
      name: source.name,
      type: source.type,
      successRate: source.success_rate || 0,
      totalLeads: source.total_leads || 0,
      leadsThisPeriod: source.leads?.length || 0,
      averageQuality: this.calculateSourceQuality(source.leads || []),
      costPerLead: this.calculateCostPerLead(source.type, source.leads?.length || 0)
    }));
  }

  async getScrapingTrends(userId, startDate, endDate) {
    const leads = await Lead.findAll({
      where: {
        user_id: userId,
        createdAt: { [Op.between]: [startDate, endDate] }
      },
      attributes: ['createdAt', 'extraction_method', 'score'],
      order: [['createdAt', 'ASC']]
    });

    // Group by day and extraction method
    const dailyStats = {};
    leads.forEach(lead => {
      const date = lead.createdAt.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { total: 0, aiExtracted: 0, patternExtracted: 0, totalScore: 0 };
      }
      dailyStats[date].total++;
      dailyStats[date].totalScore += lead.score || 0;
      
      if (lead.extraction_method === 'ai') {
        dailyStats[date].aiExtracted++;
      } else {
        dailyStats[date].patternExtracted++;
      }
    });

    return Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      totalLeads: stats.total,
      aiExtracted: stats.aiExtracted,
      patternExtracted: stats.patternExtracted,
      averageScore: stats.total > 0 ? (stats.totalScore / stats.total).toFixed(2) : 0,
      aiUsageRate: stats.total > 0 ? ((stats.aiExtracted / stats.total) * 100).toFixed(2) : 0
    }));
  }

  async getDataQualityMetrics(userId, startDate, endDate) {
    const leads = await Lead.findAll({
      where: {
        user_id: userId,
        createdAt: { [Op.between]: [startDate, endDate] }
      },
      attributes: ['company', 'contact_info', 'budget', 'location', 'extraction_method']
    });

    const qualityMetrics = {
      companyCompleteness: 0,
      contactCompleteness: 0,
      budgetCompleteness: 0,
      locationCompleteness: 0,
      aiVsPattern: { ai: 0, pattern: 0 }
    };

    leads.forEach(lead => {
      if (lead.company && lead.company !== 'Unknown') qualityMetrics.companyCompleteness++;
      if (lead.contact_info && lead.contact_info !== 'Unknown') qualityMetrics.contactCompleteness++;
      // contactPhone field doesn't exist in Lead model
      if (lead.budget) qualityMetrics.budgetCompleteness++;
      if (lead.location && lead.location !== 'Unknown') qualityMetrics.locationCompleteness++;
      
      if (lead.extraction_method === 'ai') {
        qualityMetrics.aiVsPattern.ai++;
      } else {
        qualityMetrics.aiVsPattern.pattern++;
      }
    });

    const total = leads.length;
    return {
      totalLeads: total,
      companyCompleteness: total > 0 ? ((qualityMetrics.companyCompleteness / total) * 100).toFixed(2) : 0,
      contactCompleteness: total > 0 ? ((qualityMetrics.contactCompleteness / total) * 100).toFixed(2) : 0,
      budgetCompleteness: total > 0 ? ((qualityMetrics.budgetCompleteness / total) * 100).toFixed(2) : 0,
      locationCompleteness: total > 0 ? ((qualityMetrics.locationCompleteness / total) * 100).toFixed(2) : 0,
      aiExtractionRate: total > 0 ? ((qualityMetrics.aiVsPattern.ai / total) * 100).toFixed(2) : 0,
      patternExtractionRate: total > 0 ? ((qualityMetrics.aiVsPattern.pattern / total) * 100).toFixed(2) : 0
    };
  }

  // ===== USER ENGAGEMENT ANALYTICS =====

  async getUserEngagementMetrics(userId, timeRange = '30d') {
    const { startDate, endDate } = this.getDateRange(timeRange);
    
    const metrics = await Promise.all([
      this.getUserActivity(userId, startDate, endDate),
      this.getFeatureUsage(userId, startDate, endDate),
      this.getUserPreferences(userId)
    ]);

    return {
      timeRange,
      period: { startDate, endDate },
      activity: metrics[0],
      features: metrics[1],
      preferences: metrics[2],
      lastUpdated: new Date()
    };
  }

  async getUserActivity(userId, startDate, endDate) {
    // This would track user login times, feature usage, etc.
    // For now, we'll simulate based on lead creation activity
    const leads = await Lead.findAll({
      where: {
        user_id: userId,
        createdAt: { [Op.between]: [startDate, endDate] }
      },
      attributes: ['createdAt']
    });

    const activityByDay = {};
    leads.forEach(lead => {
      const date = lead.createdAt.toISOString().split('T')[0];
      activityByDay[date] = (activityByDay[date] || 0) + 1;
    });

    return {
      totalSessions: Object.keys(activityByDay).length,
      mostActiveDay: this.findMostActiveDay(activityByDay),
      averageActivityPerDay: leads.length > 0 ? (leads.length / Object.keys(activityByDay).length).toFixed(2) : 0,
      activityTrend: Object.entries(activityByDay).map(([date, count]) => ({ date, count }))
    };
  }

  async getFeatureUsage(userId, startDate, endDate) {
    // This would track which features the user uses most
    const usage = {
      scraping: 0,
      leadManagement: 0,
      export: 0,
      analytics: 0,
      settings: 0
    };

    // Simulate based on data availability
    const configs = await ScrapingConfig.count({ where: { user_id: userId } });
    const leads = await Lead.count({ where: { user_id: userId } });
    
    usage.scraping = configs;
    usage.leadManagement = leads;

    return usage;
  }

  async getUserPreferences(userId) {
    const user = await User.findByPk(userId);
    return {
      subscriptionTier: user.subscription_tier || 'free',
      maxScrapingConfigs: user.max_scraping_configs || 3,
      preferredExportFormat: user.preferred_export_format || 'excel',
      notificationPreferences: user.notification_preferences || {},
      uiPreferences: user.ui_preferences || {}
    };
  }

  // ===== BUSINESS INTELLIGENCE =====

  async getBusinessIntelligence(userId, timeRange = '30d') {
    const { startDate, endDate } = this.getDateRange(timeRange);
    
    const metrics = await Promise.all([
      this.getRevenueProjections(userId, startDate, endDate),
      this.getMarketInsights(userId, startDate, endDate),
      this.getCompetitiveAnalysis(userId, startDate, endDate),
      this.getROIMetrics(userId, startDate, endDate)
    ]);

    return {
      timeRange,
      period: { startDate, endDate },
      revenue: metrics[0],
      market: metrics[1],
      competitive: metrics[2],
      roi: metrics[3],
      lastUpdated: new Date()
    };
  }

  async getRevenueProjections(userId, startDate, endDate) {
    const leads = await Lead.findAll({
      where: {
        user_id: userId,
        createdAt: { [Op.between]: [startDate, endDate] },
        status: { [Op.in]: ['qualified', 'proposal', 'won'] }
      },
      attributes: ['budget', 'status', 'confidence']
    });

    let totalPipeline = 0;
    let weightedPipeline = 0;
    let conversionProbability = 0;

    leads.forEach(lead => {
      if (lead.budget) {
        totalPipeline += parseFloat(lead.budget);
        
        // Weight by confidence and status
        let weight = 0.1; // Base weight
        if (lead.status === 'qualified') weight = 0.3;
        else if (lead.status === 'proposal') weight = 0.6;
        else if (lead.status === 'proposal') weight = 0.8;
        else if (lead.status === 'won') weight = 1.0;
        
        weightedPipeline += parseFloat(lead.budget) * weight;
      }
    });

    return {
      totalPipeline: totalPipeline.toFixed(2),
      weightedPipeline: weightedPipeline.toFixed(2),
      averageDealSize: leads.length > 0 ? (totalPipeline / leads.length).toFixed(2) : 0,
      conversionProbability: totalPipeline > 0 ? ((weightedPipeline / totalPipeline) * 100).toFixed(2) : 0
    };
  }

  async getMarketInsights(userId, startDate, endDate) {
    const leads = await Lead.findAll({
      where: {
        user_id: userId,
        createdAt: { [Op.between]: [startDate, endDate] }
      },
      attributes: ['industry_type', 'location', 'projectType', 'budget']
    });

    const insights = {
      topIndustries: this.getTopValues(leads, 'industry_type'),
      topLocations: this.getTopValues(leads, 'location'),
      topProjectTypes: this.getTopValues(leads, 'projectType'),
      budgetDistribution: this.getBudgetDistribution(leads),
      marketTrends: this.analyzeMarketTrends(leads)
    };

    return insights;
  }

  async getCompetitiveAnalysis(userId, startDate, endDate) {
    // This would analyze competitive positioning based on lead data
    const leads = await Lead.findAll({
      where: {
        user_id: userId,
        createdAt: { [Op.between]: [startDate, endDate] }
      },
      attributes: ['score', 'priority', 'status', 'company']
    });

    return {
      averageLeadScore: leads.length > 0 ? (leads.reduce((sum, lead) => sum + (lead.score || 0), 0) / leads.length).toFixed(2) : 0,
      highPriorityLeads: leads.filter(lead => lead.priority === 'high').length,
      competitiveAdvantage: this.calculateCompetitiveAdvantage(leads),
      marketPosition: this.determineMarketPosition(leads)
    };
  }

  async getROIMetrics(userId, timeRange) {
    // This would calculate actual ROI based on subscription costs vs. lead value
    const user = await User.findByPk(userId);
    const subscriptionCost = this.getSubscriptionCost(user.subscription_tier);
    
    const leads = await Lead.findAll({
      where: { user_id: userId },
      attributes: ['budget', 'status']
    });

    const totalValue = leads
      .filter(lead => lead.status === 'won' && lead.budget)
      .reduce((sum, lead) => sum + parseFloat(lead.budget), 0);

    const roi = subscriptionCost > 0 ? ((totalValue - subscriptionCost) / subscriptionCost * 100).toFixed(2) : 0;

    return {
      subscriptionCost: subscriptionCost.toFixed(2),
      totalLeadValue: totalValue.toFixed(2),
      roi: roi,
      costPerLead: leads.length > 0 ? (subscriptionCost / leads.length).toFixed(2) : 0,
      valuePerLead: leads.length > 0 ? (totalValue / leads.length).toFixed(2) : 0
    };
  }

  // ===== HELPER METHODS =====

  getDateRange(timeRange) {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }
    
    return { startDate, endDate };
  }

  calculateSourceQuality(leads) {
    if (leads.length === 0) return 0;
    
    const qualityScores = leads.map(lead => {
      let score = 0;
      if (lead.company && lead.company !== 'Unknown') score += 25;
      if (lead.contact_info && lead.contact_info !== 'Unknown') score += 25;
      if (lead.budget) score += 25;
      if (lead.score) score += lead.score * 0.25;
      return Math.min(100, score);
    });

    return (qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length).toFixed(2);
  }

  calculateCostPerLead(sourceType, leadCount) {
    if (leadCount === 0) return 0;
    
    const sourceCosts = {
      'google': 0.50,
      'bing': 0.30,
      'news': 0.20,
      'rss': 0.10,
      'scrapy': 0.15
    };
    
    return (sourceCosts[sourceType] || 0.25).toFixed(2);
  }

  findMostProductiveConfig(configs) {
    if (configs.length === 0) return null;
    
    // Simplified version that doesn't rely on Lead association
    return configs[0]; // Return first config for now
  }

  buildConversionFunnel(statusCounts) {
    const funnel = {
      new: statusCounts.new || 0,
      qualified: statusCounts.qualified || 0,
      proposal: statusCounts.proposal || 0,
      proposal: statusCounts.proposal || 0,
      won: statusCounts.won || 0
    };

    return Object.entries(funnel).map(([stage, count]) => ({
      stage,
      count,
      conversionRate: this.calculateFunnelConversionRate(funnel, stage)
    }));
  }

  calculateFunnelConversionRate(funnel, stage) {
    const stages = ['new', 'qualified', 'proposal', 'won'];
    const stageIndex = stages.indexOf(stage);
    
    if (stageIndex === 0) return 100; // First stage is always 100%
    
    const previousStage = stages[stageIndex - 1];
    const previousCount = funnel[previousStage];
    
    return previousCount > 0 ? ((funnel[stage] / previousCount) * 100).toFixed(2) : 0;
  }

  getTopValues(leads, field, limit = 5) {
    const counts = {};
    leads.forEach(lead => {
      const value = lead[field];
      if (value && value !== 'Unknown') {
        counts[value] = (counts[value] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([value, count]) => ({ value, count }));
  }

  getBudgetDistribution(leads) {
    const ranges = {
      '0-10k': 0,
      '10k-50k': 0,
      '50k-100k': 0,
      '100k-500k': 0,
      '500k+': 0
    };

    leads.forEach(lead => {
      if (lead.budget) {
        const budget = parseFloat(lead.budget);
        if (budget <= 10000) ranges['0-10k']++;
        else if (budget <= 50000) ranges['10k-50k']++;
        else if (budget <= 100000) ranges['50k-100k']++;
        else if (budget <= 500000) ranges['100k-500k']++;
        else ranges['500k+']++;
      }
    });

    return ranges;
  }

  analyzeMarketTrends(leads) {
    // Group by month and analyze trends
    const monthlyStats = {};
    leads.forEach(lead => {
      const month = lead.createdAt.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyStats[month]) {
        monthlyStats[month] = { count: 0, totalBudget: 0 };
      }
      monthlyStats[month].count++;
      if (lead.budget) {
        monthlyStats[month].totalBudget += parseFloat(lead.budget);
      }
    });

    return Object.entries(monthlyStats).map(([month, stats]) => ({
      month,
      leadCount: stats.count,
      averageBudget: stats.count > 0 ? (stats.totalBudget / stats.count).toFixed(2) : 0
    }));
  }

  calculateCompetitiveAdvantage(leads) {
    if (leads.length === 0) return 'Unknown';
    
    const avgScore = leads.reduce((sum, lead) => sum + (lead.score || 0), 0) / leads.length;
    const highPriorityRate = (leads.filter(lead => lead.priority === 'high').length / leads.length) * 100;
    
    if (avgScore >= 80 && highPriorityRate >= 30) return 'High';
    if (avgScore >= 60 && highPriorityRate >= 20) return 'Medium';
    return 'Low';
  }

  determineMarketPosition(leads) {
    if (leads.length === 0) return 'Unknown';
    
    const qualifiedRate = (leads.filter(lead => lead.status === 'qualified').length / leads.length) * 100;
    const wonRate = (leads.filter(lead => lead.status === 'won').length / leads.length) * 100;
    
    if (qualifiedRate >= 40 && wonRate >= 20) return 'Market Leader';
    if (qualifiedRate >= 25 && wonRate >= 10) return 'Strong Contender';
    if (qualifiedRate >= 15 && wonRate >= 5) return 'Established Player';
    return 'Emerging';
  }

  getSubscriptionCost(tier) {
    const costs = {
      'free': 0,
      'basic': 29,
      'pro': 99,
      'enterprise': 299
    };
    return costs[tier] || 0;
  }

  findMostActiveDay(activityByDay) {
    if (Object.keys(activityByDay).length === 0) return null;
    
    return Object.entries(activityByDay)
      .sort(([,a], [,b]) => b - a)[0];
  }

  // ===== CACHE MANAGEMENT =====

  isCacheValid(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    return Date.now() - cached.timestamp < this.cacheTimeout;
  }

  setCache(key, data) {
    this.cache.set(key, {
      ...data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }

  // ===== REAL-TIME UPDATES =====

  async updateMetrics(userId, action, data) {
    // This would update metrics in real-time as users interact
    const metricKey = `${userId}_${action}`;
    const current = this.metrics.get(metricKey) || 0;
    this.metrics.set(metricKey, current + 1);
    
    // Invalidate related cache
    this.invalidateRelatedCache(userId, action);
  }

  invalidateRelatedCache(userId, action) {
    const keysToInvalidate = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(userId)) {
        keysToInvalidate.push(key);
      }
    }
    
    keysToInvalidate.forEach(key => this.cache.delete(key));
  }

  // ===== EXPORT ANALYTICS =====

  async exportAnalytics(userId, timeRange, format = 'json') {
    const analytics = await this.getLeadMetrics(userId, timeRange);
    
    switch (format) {
      case 'json':
        return JSON.stringify(analytics, null, 2);
      case 'csv':
        return this.convertToCSV(analytics);
      default:
        return analytics;
    }
  }

  convertToCSV(data) {
    // Convert analytics data to CSV format
    const rows = [];
    
    // Add headers
    rows.push(['Metric', 'Value', 'Details']);
    
    // Add data rows
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([subKey, subValue]) => {
          rows.push([`${key}.${subKey}`, subValue, '']);
        });
      } else {
        rows.push([key, value, '']);
      }
    });
    
    return rows.map(row => row.join(',')).join('\n');
  }
}

module.exports = AnalyticsService;
