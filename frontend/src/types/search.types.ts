export interface SearchableItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  type: 'customer' | 'campaign' | 'tag';
  url: string;
  metadata?: Record<string, any>;
  searchableText?: string; // Combined text for fuzzy search
}

export interface CustomerSearchResult extends SearchableItem {
  type: 'customer';
  metadata: {
    email: string;
    company?: string;
    status: string;
    totalCampaigns: number;
    totalRevenue: number;
    tags: string[];
  };
}

export interface CampaignSearchResult extends SearchableItem {
  type: 'campaign';
  metadata: {
    customerName: string;
    customerId: string;
    campaignType: string;
    status: string;
    totalEvents: number;
    totalConversions: number;
    conversionRate: number;
  };
}

export interface TagSearchResult extends SearchableItem {
  type: 'tag';
  metadata: {
    usageCount: number;
    customerCount: number;
    relatedTags: string[];
  };
}

export type SearchResult = CustomerSearchResult | CampaignSearchResult | TagSearchResult;

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  searchTime: number;
  query: string;
  suggestions?: string[];
}

export interface SearchFilters {
  types?: ('customer' | 'campaign' | 'tag')[];
  customerIds?: string[];
  statuses?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
}

export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  includeInactive?: boolean;
}

export interface SearchHistory {
  id: string;
  query: string;
  timestamp: string;
  resultCount: number;
  filters?: SearchFilters;
}

export interface SearchShortcut {
  key: string;
  label: string;
  action: () => void;
  description: string;
}

export interface FuseSearchOptions {
  threshold: number;
  location: number;
  distance: number;
  maxPatternLength: number;
  minMatchCharLength: number;
  keys: Array<{
    name: string;
    weight: number;
  }>;
}

export interface SearchCategory {
  type: 'customer' | 'campaign' | 'tag';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  results: SearchResult[];
}