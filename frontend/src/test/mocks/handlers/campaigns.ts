/**
 * MSW handlers for campaign endpoints
 */

import { http, HttpResponse } from 'msw'
import { generateMockCampaign, generateMockCampaigns } from '../../fixtures/campaigns'

// In-memory storage for campaigns (reset between tests)
let campaignsStore = generateMockCampaigns(15)

export const campaignHandlers = [
  // Get all campaigns
  http.get('/api/campaigns', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const search = url.searchParams.get('search')
    const status = url.searchParams.get('status')
    const type = url.searchParams.get('type')
    const customerId = url.searchParams.get('customerId')

    let filteredCampaigns = [...campaignsStore]

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase()
      filteredCampaigns = filteredCampaigns.filter(campaign =>
        campaign.name.toLowerCase().includes(searchLower) ||
        campaign.description?.toLowerCase().includes(searchLower)
      )
    }

    if (status) {
      filteredCampaigns = filteredCampaigns.filter(campaign => campaign.status === status)
    }

    if (type) {
      filteredCampaigns = filteredCampaigns.filter(campaign => campaign.type === type)
    }

    if (customerId) {
      filteredCampaigns = filteredCampaigns.filter(campaign => campaign.customerId === customerId)
    }

    // Pagination
    const total = filteredCampaigns.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const paginatedCampaigns = filteredCampaigns.slice(offset, offset + limit)

    return HttpResponse.json({
      data: paginatedCampaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      filters: {
        search,
        status,
        type,
        customerId,
      },
    })
  }),

  // Get campaign by ID
  http.get('/api/campaigns/:id', ({ params }) => {
    const { id } = params
    const campaign = campaignsStore.find(c => c.id === id)

    if (campaign) {
      return HttpResponse.json(campaign)
    }

    return HttpResponse.json(
      { message: 'Campaign not found' },
      { status: 404 }
    )
  }),

  // Create campaign
  http.post('/api/campaigns', async ({ request }) => {
    const body = await request.json() as any

    // Validate required fields
    if (!body.name || !body.customerId || !body.type) {
      return HttpResponse.json(
        { 
          message: 'Validation failed',
          errors: {
            name: body.name ? undefined : 'Name is required',
            customerId: body.customerId ? undefined : 'Customer ID is required',
            type: body.type ? undefined : 'Type is required',
          }
        },
        { status: 400 }
      )
    }

    const newCampaign = generateMockCampaign({
      ...body,
      id: `campaign-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    campaignsStore.push(newCampaign)

    return HttpResponse.json(newCampaign, { status: 201 })
  }),

  // Update campaign
  http.put('/api/campaigns/:id', async ({ params, request }) => {
    const { id } = params
    const body = await request.json() as any
    const campaignIndex = campaignsStore.findIndex(c => c.id === id)

    if (campaignIndex === -1) {
      return HttpResponse.json(
        { message: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Update campaign
    const updatedCampaign = {
      ...campaignsStore[campaignIndex],
      ...body,
      updatedAt: new Date().toISOString(),
    }

    campaignsStore[campaignIndex] = updatedCampaign

    return HttpResponse.json(updatedCampaign)
  }),

  // Delete campaign
  http.delete('/api/campaigns/:id', ({ params }) => {
    const { id } = params
    const campaignIndex = campaignsStore.findIndex(c => c.id === id)

    if (campaignIndex === -1) {
      return HttpResponse.json(
        { message: 'Campaign not found' },
        { status: 404 }
      )
    }

    campaignsStore.splice(campaignIndex, 1)

    return HttpResponse.json({ message: 'Campaign deleted successfully' })
  }),

  // Campaign analytics
  http.get('/api/campaigns/:id/analytics', ({ params }) => {
    const { id } = params
    const campaign = campaignsStore.find(c => c.id === id)

    if (!campaign) {
      return HttpResponse.json(
        { message: 'Campaign not found' },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      campaignId: id,
      impressions: Math.floor(Math.random() * 10000) + 1000,
      clicks: Math.floor(Math.random() * 1000) + 100,
      conversions: Math.floor(Math.random() * 100) + 10,
      cost: Math.floor(Math.random() * 1000) + 100,
      revenue: Math.floor(Math.random() * 5000) + 500,
      clickThroughRate: (Math.random() * 5 + 1).toFixed(2),
      conversionRate: (Math.random() * 10 + 2).toFixed(2),
      costPerClick: (Math.random() * 2 + 0.5).toFixed(2),
      returnOnAdSpend: (Math.random() * 3 + 1).toFixed(2),
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      },
    })
  }),

  // Campaign performance over time
  http.get('/api/campaigns/:id/performance', ({ params, request }) => {
    const { id } = params
    const url = new URL(request.url)
    const days = parseInt(url.searchParams.get('days') || '30')

    const campaign = campaignsStore.find(c => c.id === id)

    if (!campaign) {
      return HttpResponse.json(
        { message: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Generate performance data for the last N days
    const performanceData = Array.from({ length: days }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (days - index - 1))

      return {
        date: date.toISOString().split('T')[0],
        impressions: Math.floor(Math.random() * 1000) + 100,
        clicks: Math.floor(Math.random() * 100) + 10,
        conversions: Math.floor(Math.random() * 20) + 1,
        cost: Math.floor(Math.random() * 100) + 10,
        revenue: Math.floor(Math.random() * 500) + 50,
      }
    })

    return HttpResponse.json({
      campaignId: id,
      data: performanceData,
    })
  }),

  // Sync campaign with GTM
  http.post('/api/campaigns/:id/sync', ({ params }) => {
    const { id } = params
    const campaign = campaignsStore.find(c => c.id === id)

    if (!campaign) {
      return HttpResponse.json(
        { message: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Simulate GTM sync process
    setTimeout(() => {
      // Update campaign sync status
      const campaignIndex = campaignsStore.findIndex(c => c.id === id)
      if (campaignIndex !== -1) {
        campaignsStore[campaignIndex] = {
          ...campaignsStore[campaignIndex],
          gtmSyncStatus: 'synced',
          lastSyncAt: new Date().toISOString(),
        }
      }
    }, 2000)

    return HttpResponse.json({
      message: 'Campaign sync initiated',
      syncId: `sync-${Date.now()}`,
      status: 'in_progress',
    })
  }),

  // Get campaign sync status
  http.get('/api/campaigns/:id/sync-status', ({ params }) => {
    const { id } = params
    const campaign = campaignsStore.find(c => c.id === id)

    if (!campaign) {
      return HttpResponse.json(
        { message: 'Campaign not found' },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      campaignId: id,
      status: campaign.gtmSyncStatus || 'not_synced',
      lastSyncAt: campaign.lastSyncAt || null,
      syncErrors: campaign.syncErrors || null,
    })
  }),

  // Duplicate campaign
  http.post('/api/campaigns/:id/duplicate', ({ params }) => {
    const { id } = params
    const originalCampaign = campaignsStore.find(c => c.id === id)

    if (!originalCampaign) {
      return HttpResponse.json(
        { message: 'Campaign not found' },
        { status: 404 }
      )
    }

    const duplicatedCampaign = generateMockCampaign({
      ...originalCampaign,
      id: `campaign-${Date.now()}`,
      name: `${originalCampaign.name} (Copy)`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      gtmSyncStatus: 'not_synced',
      lastSyncAt: null,
    })

    campaignsStore.push(duplicatedCampaign)

    return HttpResponse.json(duplicatedCampaign, { status: 201 })
  }),

  // Campaign statistics
  http.get('/api/campaigns/stats', () => {
    const total = campaignsStore.length
    const activeCount = campaignsStore.filter(c => c.status === 'active').length
    const pausedCount = campaignsStore.filter(c => c.status === 'paused').length
    const draftCount = campaignsStore.filter(c => c.status === 'draft').length

    return HttpResponse.json({
      total,
      byStatus: {
        active: activeCount,
        paused: pausedCount,
        draft: draftCount,
        archived: total - activeCount - pausedCount - draftCount,
      },
      totalImpressions: Math.floor(Math.random() * 100000) + 10000,
      totalClicks: Math.floor(Math.random() * 10000) + 1000,
      totalConversions: Math.floor(Math.random() * 1000) + 100,
      totalRevenue: Math.floor(Math.random() * 50000) + 5000,
      lastUpdated: new Date().toISOString(),
    })
  }),

  // Reset campaigns store for testing
  http.post('/api/test/campaigns/reset', () => {
    campaignsStore = generateMockCampaigns(15)
    return HttpResponse.json({ message: 'Campaigns store reset' })
  }),
]