import Fuse from 'fuse.js';
import { apiClient } from '@/lib/api';
import { 
  SearchRequest, 
  SearchResponse, 
  SearchResult, 
  SearchableItem,
  CustomerSearchResult,
  CampaignSearchResult,
  TagSearchResult,
  FuseSearchOptions,
  SearchHistory 
} from '@/types/search.types';

// Fuse.js configuration for fuzzy search
const fuseOptions: FuseSearchOptions = {
  threshold: 0.4, // 0.0 = perfect match, 1.0 = match anything
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 2,
  keys: [
    { name: 'title', weight: 0.7 },
    { name: 'subtitle', weight: 0.5 },
    { name: 'description', weight: 0.3 },
    { name: 'searchableText', weight: 0.6 },
    { name: 'metadata.email', weight: 0.6 },
    { name: 'metadata.company', weight: 0.4 },
    { name: 'metadata.customerName', weight: 0.5 },
    { name: 'metadata.campaignType', weight: 0.4 },
    { name: 'metadata.tags', weight: 0.3 },
    { name: 'metadata.relatedTags', weight: 0.3 }
  ]
};

class SearchService {
  private searchHistory: SearchHistory[] = [];
  private fuseInstance: Fuse<SearchableItem> | null = null;
  private searchableItems: SearchableItem[] = [];

  constructor() {
    this.loadSearchHistory();
  }

  // Initialize search index with all searchable items
  async initializeSearchIndex(): Promise<void> {
    try {
      const [customers, campaigns, tags] = await Promise.all([
        this.fetchCustomerSearchData(),
        this.fetchCampaignSearchData(),
        this.fetchTagSearchData()
      ]);

      this.searchableItems = [...customers, ...campaigns, ...tags];
      this.fuseInstance = new Fuse(this.searchableItems, fuseOptions);
    } catch (error) {
      console.error('Failed to initialize search index:', error);
      throw error;
    }
  }

  // Perform search with local fuzzy search and optional API fallback
  async search(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();
    
    try {
      // If fuzzy search is not initialized, fall back to API search
      if (!this.fuseInstance) {
        return await this.searchAPI(request);
      }

      // Perform local fuzzy search
      const fuseResults = this.fuseInstance.search(request.query);
      
      // Filter results based on request filters
      let filteredResults = fuseResults.map(result => result.item);
      
      if (request.filters) {
        filteredResults = this.applyFilters(filteredResults, request.filters);
      }

      // Apply limit
      if (request.limit) {
        filteredResults = filteredResults.slice(0, request.limit);
      }

      const searchTime = Date.now() - startTime;
      
      // Save to history
      this.saveSearchToHistory(request.query, filteredResults.length, request.filters);

      return {
        results: filteredResults as SearchResult[],
        totalCount: filteredResults.length,
        searchTime,
        query: request.query,
        suggestions: this.generateSuggestions(request.query)
      };
    } catch (error) {
      console.error('Search failed:', error);
      // Fallback to API search if local search fails
      return await this.searchAPI(request);
    }
  }

  // API-based search as fallback
  private async searchAPI(request: SearchRequest): Promise<SearchResponse> {
    const response = await apiClient.post('/search', request);
    
    // Save to history
    this.saveSearchToHistory(request.query, response.data.totalCount, request.filters);
    
    return response.data;
  }

  // Fetch customer data for search index
  private async fetchCustomerSearchData(): Promise<CustomerSearchResult[]> {
    try {
      const response = await apiClient.get('/customers?includeSearchData=true');
      return response.data.map((customer: any): CustomerSearchResult => ({
        id: customer.id,
        title: customer.name,
        subtitle: customer.email,
        description: customer.company || customer.description,
        type: 'customer',
        url: `/customers/${customer.id}`,
        searchableText: `${customer.name} ${customer.email} ${customer.company || ''} ${customer.tags?.join(' ') || ''}`.toLowerCase(),
        metadata: {
          email: customer.email,
          company: customer.company,
          status: customer.status,
          totalCampaigns: customer.totalCampaigns || 0,
          totalRevenue: customer.totalRevenue || 0,
          tags: customer.tags || []
        }
      }));
    } catch (error) {
      console.error('Failed to fetch customer search data:', error);
      return [];
    }
  }

  // Fetch campaign data for search index
  private async fetchCampaignSearchData(): Promise<CampaignSearchResult[]> {
    try {
      const response = await apiClient.get('/campaigns?includeSearchData=true');
      return response.data.map((campaign: any): CampaignSearchResult => ({
        id: campaign.id,
        title: campaign.name,
        subtitle: `${campaign.customerName} • ${campaign.campaignType}`,
        description: campaign.description,
        type: 'campaign',
        url: `/campaigns/${campaign.id}`,
        searchableText: `${campaign.name} ${campaign.customerName} ${campaign.campaignType} ${campaign.description || ''}`.toLowerCase(),
        metadata: {
          customerName: campaign.customerName,
          customerId: campaign.customerId,
          campaignType: campaign.campaignType,
          status: campaign.status,
          totalEvents: campaign.totalEvents || 0,
          totalConversions: campaign.totalConversions || 0,
          conversionRate: campaign.conversionRate || 0
        }
      }));
    } catch (error) {
      console.error('Failed to fetch campaign search data:', error);
      return [];
    }
  }

  // Fetch tag data for search index
  private async fetchTagSearchData(): Promise<TagSearchResult[]> {
    try {
      const response = await apiClient.get('/tags?includeSearchData=true');
      return response.data.map((tag: any): TagSearchResult => ({
        id: tag.id,
        title: tag.name,
        subtitle: `Used by ${tag.customerCount} customers`,
        description: tag.description,
        type: 'tag',
        url: `/tags/${tag.id}`,
        searchableText: `${tag.name} ${tag.description || ''} ${tag.relatedTags?.join(' ') || ''}`.toLowerCase(),
        metadata: {
          usageCount: tag.usageCount || 0,
          customerCount: tag.customerCount || 0,
          relatedTags: tag.relatedTags || []
        }
      }));
    } catch (error) {
      console.error('Failed to fetch tag search data:', error);
      return [];
    }
  }

  // Apply filters to search results
  private applyFilters(results: SearchableItem[], filters: any): SearchableItem[] {
    let filtered = results;

    if (filters.types?.length) {
      filtered = filtered.filter(item => filters.types.includes(item.type));
    }

    if (filters.customerIds?.length) {
      filtered = filtered.filter(item => {
        if (item.type === 'customer') return filters.customerIds.includes(item.id);
        if (item.type === 'campaign') return filters.customerIds.includes((item as CampaignSearchResult).metadata.customerId);
        return true;
      });
    }

    if (filters.statuses?.length) {
      filtered = filtered.filter(item => {
        if (item.metadata && 'status' in item.metadata) {
          return filters.statuses.includes(item.metadata.status);
        }
        return true;
      });
    }

    if (filters.dateRange) {
      // Note: This would require additional date fields in the search data
      // For now, we'll skip date filtering in client-side search
    }

    return filtered;
  }

  // Generate search suggestions based on query  
  generateSuggestions(query: string): string[] {
    if (!query || query.length < 2) return [];

    const suggestions: string[] = [];
    const lowercaseQuery = query.toLowerCase();

    // Find partial matches from existing search history
    this.searchHistory.forEach(historyItem => {
      if (historyItem.query.toLowerCase().includes(lowercaseQuery) && 
          historyItem.query !== query) {
        suggestions.push(historyItem.query);
      }
    });

    // Add common search patterns
    const commonPatterns = [
      `customer:${query}`,
      `campaign:${query}`,
      `tag:${query}`,
      `status:active ${query}`,
      `status:inactive ${query}`
    ];

    commonPatterns.forEach(pattern => {
      if (pattern.toLowerCase().includes(lowercaseQuery)) {
        suggestions.push(pattern);
      }
    });

    return [...new Set(suggestions)].slice(0, 5);
  }

  // Search history management
  private saveSearchToHistory(query: string, resultCount: number, filters?: any): void {
    if (!query || query.length < 2) return;

    const existingIndex = this.searchHistory.findIndex(item => item.query === query);
    
    const historyItem: SearchHistory = {
      id: existingIndex >= 0 ? this.searchHistory[existingIndex].id : crypto.randomUUID(),
      query,
      timestamp: new Date().toISOString(),
      resultCount,
      filters
    };

    if (existingIndex >= 0) {
      this.searchHistory[existingIndex] = historyItem;
    } else {
      this.searchHistory.unshift(historyItem);
    }

    // Keep only last 20 searches
    this.searchHistory = this.searchHistory.slice(0, 20);
    
    // Save to localStorage
    try {
      localStorage.setItem('search-history', JSON.stringify(this.searchHistory));
    } catch (error) {
      console.warn('Failed to save search history:', error);
    }
  }

  private loadSearchHistory(): void {
    try {
      const saved = localStorage.getItem('search-history');
      if (saved) {
        this.searchHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load search history:', error);
      this.searchHistory = [];
    }
  }

  getSearchHistory(): SearchHistory[] {
    return this.searchHistory;
  }

  clearSearchHistory(): void {
    this.searchHistory = [];
    try {
      localStorage.removeItem('search-history');
    } catch (error) {
      console.warn('Failed to clear search history:', error);
    }
  }

  // Remove specific item from search history
  removeFromHistory(historyId: string): void {
    this.searchHistory = this.searchHistory.filter(item => item.id !== historyId);
    try {
      localStorage.setItem('search-history', JSON.stringify(this.searchHistory));
    } catch (error) {
      console.warn('Failed to update search history:', error);
    }
  }

  // Refresh search index
  async refreshSearchIndex(): Promise<void> {
    await this.initializeSearchIndex();
  }

  // Get search statistics
  getSearchStats() {
    return {
      totalSearchableItems: this.searchableItems.length,
      customerCount: this.searchableItems.filter(item => item.type === 'customer').length,
      campaignCount: this.searchableItems.filter(item => item.type === 'campaign').length,
      tagCount: this.searchableItems.filter(item => item.type === 'tag').length,
      historyCount: this.searchHistory.length,
      isIndexInitialized: !!this.fuseInstance
    };
  }
}

export const searchService = new SearchService();