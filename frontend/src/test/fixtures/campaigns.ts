/**
 * Mock data generators for campaigns
 */

import { faker } from '@faker-js/faker'

export interface MockCampaign {
  id: string
  name: string
  description?: string
  customerId: string
  tenantId: string
  type: 'page_view' | 'form_submit' | 'click' | 'scroll' | 'custom_event'
  status: 'active' | 'paused' | 'draft' | 'archived'
  config: {
    triggers: Array<{
      type: 'url' | 'css_selector' | 'event' | 'time_delay'
      value: string
      conditions?: Record<string, any>
    }>
    actions: Array<{
      type: 'track' | 'google_ads_conversion' | 'custom_event'
      event?: string
      action?: string
      parameters?: Record<string, any>
    }>
    conversionValue?: {
      field?: string
      defaultValue?: number
    }
  }
  gtmSyncStatus?: 'not_synced' | 'syncing' | 'synced' | 'error'
  lastSyncAt?: string
  syncErrors?: string[]
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
}

export interface MockCampaignAnalytics {
  campaignId: string
  impressions: number
  clicks: number
  conversions: number
  cost: number
  revenue: number
  clickThroughRate: string
  conversionRate: string
  costPerClick: string
  returnOnAdSpend: string
  dateRange: {
    start: string
    end: string
  }
}

export interface MockCampaignPerformance {
  campaignId: string
  data: Array<{
    date: string
    impressions: number
    clicks: number
    conversions: number
    cost: number
    revenue: number
  }>
}

export function generateMockCampaign(overrides: Partial<MockCampaign> = {}): MockCampaign {
  const type = faker.helpers.arrayElement(['page_view', 'form_submit', 'click', 'scroll', 'custom_event'])
  
  return {
    id: faker.string.uuid(),
    name: generateCampaignName(type),
    description: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
    customerId: faker.string.uuid(),
    tenantId: faker.string.uuid(),
    type,
    status: faker.helpers.arrayElement(['active', 'paused', 'draft', 'archived']),
    config: generateCampaignConfig(type),
    gtmSyncStatus: faker.helpers.arrayElement(['not_synced', 'syncing', 'synced', 'error']),
    lastSyncAt: faker.datatype.boolean() ? faker.date.recent().toISOString() : undefined,
    syncErrors: faker.datatype.boolean() ? [
      faker.helpers.arrayElement([
        'GTM container not found',
        'Invalid trigger configuration',
        'Permission denied',
        'Network timeout',
      ])
    ] : undefined,
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    createdBy: faker.datatype.boolean() ? faker.string.uuid() : undefined,
    updatedBy: faker.datatype.boolean() ? faker.string.uuid() : undefined,
    ...overrides,
  }
}

function generateCampaignName(type: string): string {
  const baseNames = {
    page_view: ['Homepage View', 'Product Page View', 'Landing Page Visit', 'Blog Post View'],
    form_submit: ['Contact Form', 'Newsletter Signup', 'Download Form', 'Registration Form'],
    click: ['CTA Button', 'Download Link', 'External Link', 'Product Link'],
    scroll: ['Page Scroll Depth', 'Content Engagement', 'Article Reading'],
    custom_event: ['Custom Action', 'Special Event', 'User Interaction'],
  }
  
  const baseName = faker.helpers.arrayElement(baseNames[type as keyof typeof baseNames])
  const suffix = faker.helpers.arrayElement(['Campaign', 'Tracking', 'Monitor', 'Analysis'])
  
  return `${baseName} ${suffix}`
}

function generateCampaignConfig(type: string) {
  const configs = {
    page_view: {
      triggers: [
        {
          type: 'url' as const,
          value: faker.internet.url(),
          conditions: { match: 'exact' },
        },
      ],
      actions: [
        {
          type: 'track' as const,
          event: 'page_view',
        },
        {
          type: 'google_ads_conversion' as const,
          action: 'page_view_conversion',
        },
      ],
    },
    form_submit: {
      triggers: [
        {
          type: 'css_selector' as const,
          value: '#contact-form',
        },
        {
          type: 'event' as const,
          value: 'submit',
        },
      ],
      actions: [
        {
          type: 'track' as const,
          event: 'form_submit',
          parameters: { form_name: 'contact' },
        },
        {
          type: 'google_ads_conversion' as const,
          action: 'lead_generation',
        },
      ],
      conversionValue: {
        field: 'lead_value',
        defaultValue: 25,
      },
    },
    click: {
      triggers: [
        {
          type: 'css_selector' as const,
          value: '.cta-button',
        },
      ],
      actions: [
        {
          type: 'track' as const,
          event: 'button_click',
        },
      ],
    },
    scroll: {
      triggers: [
        {
          type: 'event' as const,
          value: 'scroll',
          conditions: { depth: 75 },
        },
      ],
      actions: [
        {
          type: 'track' as const,
          event: 'scroll_depth',
          parameters: { depth: 75 },
        },
      ],
    },
    custom_event: {
      triggers: [
        {
          type: 'event' as const,
          value: 'custom_trigger',
        },
      ],
      actions: [
        {
          type: 'custom_event' as const,
          event: 'custom_action',
          parameters: { category: 'engagement' },
        },
      ],
    },
  }
  
  return configs[type as keyof typeof configs]
}

export function generateMockCampaigns(count: number): MockCampaign[] {
  return Array.from({ length: count }, () => generateMockCampaign())
}

export function generateMockCampaignAnalytics(campaignId: string): MockCampaignAnalytics {
  const impressions = faker.number.int({ min: 1000, max: 100000 })
  const clicks = faker.number.int({ min: 10, max: Math.floor(impressions * 0.1) })
  const conversions = faker.number.int({ min: 1, max: Math.floor(clicks * 0.2) })
  const cost = faker.number.int({ min: 100, max: 10000 })
  const revenue = faker.number.int({ min: conversions * 10, max: conversions * 200 })

  return {
    campaignId,
    impressions,
    clicks,
    conversions,
    cost,
    revenue,
    clickThroughRate: ((clicks / impressions) * 100).toFixed(2),
    conversionRate: ((conversions / clicks) * 100).toFixed(2),
    costPerClick: (cost / clicks).toFixed(2),
    returnOnAdSpend: (revenue / cost).toFixed(2),
    dateRange: {
      start: faker.date.past({ days: 30 }).toISOString(),
      end: new Date().toISOString(),
    },
  }
}

export function generateMockCampaignPerformance(campaignId: string, days: number = 30): MockCampaignPerformance {
  return {
    campaignId,
    data: Array.from({ length: days }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (days - index - 1))

      return {
        date: date.toISOString().split('T')[0],
        impressions: faker.number.int({ min: 50, max: 5000 }),
        clicks: faker.number.int({ min: 5, max: 500 }),
        conversions: faker.number.int({ min: 0, max: 50 }),
        cost: faker.number.int({ min: 10, max: 1000 }),
        revenue: faker.number.int({ min: 0, max: 5000 }),
      }
    }),
  }
}

// Predefined test campaigns
export const testCampaigns = {
  active: generateMockCampaign({
    id: 'active-campaign-id',
    name: 'Active Test Campaign',
    status: 'active',
    type: 'page_view',
    gtmSyncStatus: 'synced',
  }),
  paused: generateMockCampaign({
    id: 'paused-campaign-id',
    name: 'Paused Test Campaign',
    status: 'paused',
    type: 'form_submit',
    gtmSyncStatus: 'synced',
  }),
  draft: generateMockCampaign({
    id: 'draft-campaign-id',
    name: 'Draft Test Campaign',
    status: 'draft',
    type: 'click',
    gtmSyncStatus: 'not_synced',
  }),
  syncError: generateMockCampaign({
    id: 'error-campaign-id',
    name: 'Error Campaign',
    status: 'active',
    type: 'custom_event',
    gtmSyncStatus: 'error',
    syncErrors: ['GTM container not found'],
  }),
}

// Campaign statistics
export interface MockCampaignStats {
  total: number
  byStatus: {
    active: number
    paused: number
    draft: number
    archived: number
  }
  totalImpressions: number
  totalClicks: number
  totalConversions: number
  totalRevenue: number
  lastUpdated: string
}

export function generateMockCampaignStats(campaigns: MockCampaign[] = []): MockCampaignStats {
  const total = campaigns.length || faker.number.int({ min: 20, max: 100 })
  const active = campaigns.filter(c => c.status === 'active').length || 
    faker.number.int({ min: Math.floor(total * 0.4), max: Math.floor(total * 0.6) })
  const paused = campaigns.filter(c => c.status === 'paused').length || 
    faker.number.int({ min: Math.floor(total * 0.2), max: Math.floor(total * 0.3) })
  const draft = campaigns.filter(c => c.status === 'draft').length || 
    faker.number.int({ min: Math.floor(total * 0.1), max: Math.floor(total * 0.2) })
  const archived = total - active - paused - draft

  return {
    total,
    byStatus: {
      active,
      paused,
      draft,
      archived,
    },
    totalImpressions: faker.number.int({ min: 10000, max: 1000000 }),
    totalClicks: faker.number.int({ min: 1000, max: 100000 }),
    totalConversions: faker.number.int({ min: 100, max: 10000 }),
    totalRevenue: faker.number.int({ min: 5000, max: 500000 }),
    lastUpdated: new Date().toISOString(),
  }
}

// GTM sync operation results
export interface MockGTMSyncResult {
  syncId: string
  campaignId: string
  status: 'in_progress' | 'completed' | 'failed'
  progress?: number
  message: string
  startedAt: string
  completedAt?: string
  errors?: string[]
}

export function generateMockGTMSyncResult(campaignId: string): MockGTMSyncResult {
  const status = faker.helpers.arrayElement(['in_progress', 'completed', 'failed'])
  const startedAt = faker.date.recent().toISOString()

  return {
    syncId: faker.string.uuid(),
    campaignId,
    status,
    progress: status === 'in_progress' ? faker.number.int({ min: 10, max: 90 }) : 100,
    message: {
      in_progress: 'Syncing campaign with GTM...',
      completed: 'Campaign successfully synced with GTM',
      failed: 'Failed to sync campaign with GTM',
    }[status],
    startedAt,
    completedAt: status !== 'in_progress' ? 
      new Date(Date.now() + faker.number.int({ min: 1000, max: 30000 })).toISOString() : 
      undefined,
    errors: status === 'failed' ? [
      faker.helpers.arrayElement([
        'GTM container not accessible',
        'Invalid trigger configuration',
        'Authentication failed',
        'Network timeout',
        'Invalid campaign data',
      ])
    ] : undefined,
  }
}

// Campaign error responses
export const campaignErrors = {
  notFound: {
    message: 'Campaign not found',
    code: 'CAMPAIGN_NOT_FOUND',
  },
  invalidConfig: {
    message: 'Invalid campaign configuration',
    code: 'INVALID_CONFIG',
    errors: {
      triggers: 'At least one trigger is required',
      actions: 'At least one action is required',
    },
  },
  syncError: {
    message: 'Failed to sync with GTM',
    code: 'GTM_SYNC_ERROR',
    details: 'GTM container not found or inaccessible',
  },
  duplicateName: {
    message: 'Campaign with this name already exists',
    code: 'DUPLICATE_NAME',
  },
  validationFailed: {
    message: 'Campaign validation failed',
    code: 'VALIDATION_ERROR',
    errors: {
      name: 'Campaign name is required',
      type: 'Campaign type is required',
      customerId: 'Customer ID is required',
    },
  },
}