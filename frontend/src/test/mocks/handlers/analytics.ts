/**
 * MSW handlers for analytics endpoints
 */

import { http, HttpResponse } from 'msw'

export const analyticsHandlers = [
  // Get dashboard analytics
  http.get('/api/analytics/dashboard', ({ request }) => {
    const url = new URL(request.url)
    const dateRange = url.searchParams.get('dateRange') || '30d'
    const customerId = url.searchParams.get('customerId')

    // Generate mock data based on date range
    const getDaysFromRange = (range: string) => {
      if (range === '7d') return 7
      if (range === '30d') return 30
      if (range === '90d') return 90
      if (range === '1y') return 365
      return 30
    }

    const days = getDaysFromRange(dateRange)
    const multiplier = customerId ? 0.3 : 1 // Lower numbers for specific customer

    return HttpResponse.json({
      summary: {
        totalImpressions: Math.floor((Math.random() * 100000 + 10000) * multiplier),
        totalClicks: Math.floor((Math.random() * 10000 + 1000) * multiplier),
        totalConversions: Math.floor((Math.random() * 1000 + 100) * multiplier),
        totalRevenue: Math.floor((Math.random() * 50000 + 5000) * multiplier),
        clickThroughRate: (Math.random() * 5 + 1).toFixed(2),
        conversionRate: (Math.random() * 10 + 2).toFixed(2),
        costPerAcquisition: (Math.random() * 50 + 10).toFixed(2),
        returnOnAdSpend: (Math.random() * 3 + 1).toFixed(2),
      },
      trends: Array.from({ length: days }, (_, index) => {
        const date = new Date()
        date.setDate(date.getDate() - (days - index - 1))

        return {
          date: date.toISOString().split('T')[0],
          impressions: Math.floor((Math.random() * 1000 + 100) * multiplier),
          clicks: Math.floor((Math.random() * 100 + 10) * multiplier),
          conversions: Math.floor((Math.random() * 20 + 1) * multiplier),
          revenue: Math.floor((Math.random() * 500 + 50) * multiplier),
        }
      }),
      topCampaigns: Array.from({ length: 5 }, (_, index) => ({
        id: `campaign-${index + 1}`,
        name: `Top Campaign ${index + 1}`,
        impressions: Math.floor((Math.random() * 10000 + 1000) * multiplier),
        clicks: Math.floor((Math.random() * 1000 + 100) * multiplier),
        conversions: Math.floor((Math.random() * 100 + 10) * multiplier),
        revenue: Math.floor((Math.random() * 5000 + 500) * multiplier),
      })),
      topCustomers: customerId ? [] : Array.from({ length: 5 }, (_, index) => ({
        id: `customer-${index + 1}`,
        name: `Top Customer ${index + 1}`,
        company: `Company ${index + 1}`,
        revenue: Math.floor(Math.random() * 10000 + 1000),
        conversions: Math.floor(Math.random() * 200 + 20),
        campaigns: Math.floor(Math.random() * 10 + 2),
      })),
    })
  }),

  // Get campaign performance comparison
  http.get('/api/analytics/campaigns/compare', ({ request }) => {
    const url = new URL(request.url)
    const campaignIds = url.searchParams.get('campaigns')?.split(',') || []

    const comparisonData = campaignIds.map(id => ({
      campaignId: id,
      name: `Campaign ${id}`,
      impressions: Math.floor(Math.random() * 10000 + 1000),
      clicks: Math.floor(Math.random() * 1000 + 100),
      conversions: Math.floor(Math.random() * 100 + 10),
      cost: Math.floor(Math.random() * 1000 + 100),
      revenue: Math.floor(Math.random() * 5000 + 500),
      clickThroughRate: (Math.random() * 5 + 1).toFixed(2),
      conversionRate: (Math.random() * 10 + 2).toFixed(2),
    }))

    return HttpResponse.json({
      campaigns: comparisonData,
      averages: {
        impressions: comparisonData.reduce((sum, c) => sum + c.impressions, 0) / comparisonData.length,
        clicks: comparisonData.reduce((sum, c) => sum + c.clicks, 0) / comparisonData.length,
        conversions: comparisonData.reduce((sum, c) => sum + c.conversions, 0) / comparisonData.length,
        cost: comparisonData.reduce((sum, c) => sum + c.cost, 0) / comparisonData.length,
        revenue: comparisonData.reduce((sum, c) => sum + c.revenue, 0) / comparisonData.length,
      },
    })
  }),

  // Get funnel analysis
  http.get('/api/analytics/funnel', ({ request }) => {
    const url = new URL(request.url)
    const campaignId = url.searchParams.get('campaignId')
    const dateRange = url.searchParams.get('dateRange') || '30d'

    return HttpResponse.json({
      campaignId,
      dateRange,
      stages: [
        { name: 'Impressions', count: 100000, percentage: 100 },
        { name: 'Clicks', count: 5000, percentage: 5 },
        { name: 'Landing Page Views', count: 4500, percentage: 4.5 },
        { name: 'Form Submissions', count: 1000, percentage: 1 },
        { name: 'Conversions', count: 200, percentage: 0.2 },
      ],
      dropOffAnalysis: [
        { from: 'Impressions', to: 'Clicks', dropOffRate: 95, dropOffCount: 95000 },
        { from: 'Clicks', to: 'Landing Page Views', dropOffRate: 10, dropOffCount: 500 },
        { from: 'Landing Page Views', to: 'Form Submissions', dropOffRate: 77.8, dropOffCount: 3500 },
        { from: 'Form Submissions', to: 'Conversions', dropOffRate: 80, dropOffCount: 800 },
      ],
    })
  }),

  // Get cohort analysis
  http.get('/api/analytics/cohorts', ({ request }) => {
    const url = new URL(request.url)
    const customerId = url.searchParams.get('customerId')

    return HttpResponse.json({
      customerId,
      cohorts: Array.from({ length: 12 }, (_, monthIndex) => {
        const date = new Date()
        date.setMonth(date.getMonth() - monthIndex)
        
        return {
          period: date.toISOString().substring(0, 7), // YYYY-MM format
          newCustomers: Math.floor(Math.random() * 500 + 50),
          retentionRates: Array.from({ length: 12 }, (_, retentionMonth) => ({
            month: retentionMonth + 1,
            rate: Math.max(0, (Math.random() * 0.8 + 0.2) * Math.pow(0.9, retentionMonth)),
          })),
        }
      }),
    })
  }),

  // Get attribution analysis
  http.get('/api/analytics/attribution', ({ request }) => {
    const url = new URL(request.url)
    const model = url.searchParams.get('model') || 'last_click'

    const channels = ['Direct', 'Organic Search', 'Paid Search', 'Social Media', 'Email', 'Referral']
    
    return HttpResponse.json({
      attributionModel: model,
      channels: channels.map(channel => ({
        name: channel,
        conversions: Math.floor(Math.random() * 1000 + 100),
        revenue: Math.floor(Math.random() * 10000 + 1000),
        cost: Math.floor(Math.random() * 5000 + 500),
        roas: (Math.random() * 3 + 1).toFixed(2),
        attribution: {
          firstTouch: Math.floor(Math.random() * 100),
          lastTouch: Math.floor(Math.random() * 100),
          linear: Math.floor(Math.random() * 100),
          timeDecay: Math.floor(Math.random() * 100),
        },
      })),
      touchpointAnalysis: Array.from({ length: 5 }, (_, index) => ({
        position: index + 1,
        averageConversions: Math.floor(Math.random() * 200 + 50),
        topChannels: channels.slice(0, 3).map(channel => ({
          name: channel,
          percentage: Math.floor(Math.random() * 40 + 10),
        })),
      })),
    })
  }),

  // Get A/B test results
  http.get('/api/analytics/ab-tests', ({ request }) => {
    const url = new URL(request.url)
    const campaignId = url.searchParams.get('campaignId')

    return HttpResponse.json({
      campaignId,
      tests: Array.from({ length: 3 }, (_, index) => ({
        id: `test-${index + 1}`,
        name: `A/B Test ${index + 1}`,
        status: index === 0 ? 'running' : index === 1 ? 'completed' : 'paused',
        startDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: index === 1 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null,
        variants: [
          {
            name: 'Control',
            traffic: 50,
            conversions: Math.floor(Math.random() * 100 + 20),
            conversionRate: (Math.random() * 5 + 2).toFixed(2),
            revenue: Math.floor(Math.random() * 5000 + 1000),
          },
          {
            name: 'Variant A',
            traffic: 50,
            conversions: Math.floor(Math.random() * 120 + 25),
            conversionRate: (Math.random() * 6 + 2.5).toFixed(2),
            revenue: Math.floor(Math.random() * 6000 + 1200),
          },
        ],
        significance: Math.random() > 0.5 ? 'significant' : 'not_significant',
        confidence: (Math.random() * 20 + 80).toFixed(1),
      })),
    })
  }),

  // Export analytics data
  http.get('/api/analytics/export', ({ request }) => {
    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'csv'
    const type = url.searchParams.get('type') || 'dashboard'

    if (format === 'csv') {
      let csvContent = ''
      
      if (type === 'dashboard') {
        csvContent = [
          'Date,Impressions,Clicks,Conversions,Revenue',
          ...Array.from({ length: 30 }, (_, index) => {
            const date = new Date()
            date.setDate(date.getDate() - index)
            return `${date.toISOString().split('T')[0]},${Math.floor(Math.random() * 1000 + 100)},${Math.floor(Math.random() * 100 + 10)},${Math.floor(Math.random() * 20 + 1)},${Math.floor(Math.random() * 500 + 50)}`
          })
        ].join('\n')
      }

      return new HttpResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=analytics-${type}.csv`,
        },
      })
    }

    // Default JSON export
    return HttpResponse.json({
      type,
      exportedAt: new Date().toISOString(),
      data: {
        summary: 'Analytics data would be here',
      },
    })
  }),

  // Real-time analytics
  http.get('/api/analytics/realtime', () => {
    return HttpResponse.json({
      activeUsers: Math.floor(Math.random() * 500 + 100),
      activePages: Math.floor(Math.random() * 50 + 10),
      realtimeConversions: Math.floor(Math.random() * 10 + 1),
      topPages: Array.from({ length: 5 }, (_, index) => ({
        page: `/page-${index + 1}`,
        activeUsers: Math.floor(Math.random() * 100 + 10),
        pageViews: Math.floor(Math.random() * 200 + 20),
      })),
      trafficSources: [
        { source: 'Direct', percentage: Math.floor(Math.random() * 30 + 20) },
        { source: 'Organic Search', percentage: Math.floor(Math.random() * 25 + 15) },
        { source: 'Social Media', percentage: Math.floor(Math.random() * 20 + 10) },
        { source: 'Referral', percentage: Math.floor(Math.random() * 15 + 5) },
      ],
      lastUpdated: new Date().toISOString(),
    })
  }),
]