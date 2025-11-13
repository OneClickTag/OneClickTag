import axios from 'axios';
import Fuse from 'fuse.js';
import {
  SearchableItem,
  SearchResult,
  SearchResponse,
  SearchRequest,
  SearchHistory,
  FuseSearchOptions,
  CustomerSearchResult,
  CampaignSearchResult,
  TagSearchResult,
} from '@/types/search.types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Fuse.js configuration for fuzzy search
const fuseOptions: FuseSearchOptions = {
  threshold: 0.4, // 0.0 = perfect match, 1.0 = match anything
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 2,
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'subtitle', weight: 0.3 },
    { name: 'description', weight: 0.2 },
    { name: 'searchableText', weight: 0.1 },
  ],
};

class SearchService {
  private searchableItems: SearchableItem[] = [];
  private fuse: Fuse<SearchableItem> | null = null;
  private searchHistory: SearchHistory[] = [];
  private readonly maxHistoryItems = 10;

  constructor() {
    this.loadSearchHistory();
  }

  /**
   * Initialize search data by fetching all searchable items
   */
  async initializeSearchData(): Promise<void> {
    try {
      const [customers, campaigns, tags] = await Promise.all([
        this.fetchCustomers(),
        this.fetchCampaigns(),
        this.fetchTags(),
      ]);

      this.searchableItems = [
        ...this.mapCustomersToSearchable(customers),
        ...this.mapCampaignsToSearchable(campaigns),
        ...this.mapTagsToSearchable(tags),
      ];

      // Initialize Fuse with the searchable items
      this.fuse = new Fuse(this.searchableItems, fuseOptions);
    } catch (error) {
      console.error('Failed to initialize search data:', error);
      throw error;
    }
  }

  /**
   * Perform search across all entities
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.fuse) {
        await this.initializeSearchData();
      }

      if (!request.query.trim()) {
        return {
          results: [],
          totalCount: 0,
          searchTime: Date.now() - startTime,
          query: request.query,
          suggestions: [],
        };
      }

      // Perform fuzzy search
      const fuseResults = this.fuse!.search(request.query, {
        limit: request.limit || 50,
      });

      let results = fuseResults.map(result => result.item as SearchResult);

      // Apply filters
      if (request.filters) {
        results = this.applyFilters(results, request.filters);
      }

      // Filter out inactive items if requested
      if (!request.includeInactive) {
        results = results.filter(item => {
          if (item.type === 'customer') {
            return item.metadata.status === 'active';
          } else if (item.type === 'campaign') {
            return ['active', 'paused'].includes(item.metadata.status);
          }
          return true; // Include tags by default
        });
      }

      const searchTime = Date.now() - startTime;

      // Add to search history
      this.addToHistory(request.query, results.length, request.filters);

      // Generate suggestions based on partial matches
      const suggestions = this.generateSuggestions(request.query);

      return {
        results,
        totalCount: results.length,
        searchTime,
        query: request.query,
        suggestions,
      };
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSuggestions(query: string): Promise<string[]> {
    if (!query.trim() || query.length < 2) {
      return [];
    }

    return this.generateSuggestions(query);
  }

  /**
   * Get search history
   */
  getSearchHistory(): SearchHistory[] {
    return this.searchHistory;
  }

  /**
   * Clear search history
   */
  clearSearchHistory(): void {
    this.searchHistory = [];
    this.saveSearchHistory();
  }

  /**
   * Remove specific item from search history
   */
  removeFromHistory(historyId: string): void {
    this.searchHistory = this.searchHistory.filter(item => item.id !== historyId);
    this.saveSearchHistory();
  }

  /**
   * Refresh search data
   */
  async refreshSearchData(): Promise<void> {
    this.searchableItems = [];
    this.fuse = null;
    await this.initializeSearchData();
  }

  // Private methods

  private async fetchCustomers(): Promise<any[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/customers`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      return [];
    }
  }

  private async fetchCampaigns(): Promise<any[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/campaigns`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      return [];
    }
  }

  private async fetchTags(): Promise<any[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/tags`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch tags:', error);
      return [];
    }
  }

  private mapCustomersToSearchable(customers: any[]): CustomerSearchResult[] {
    return customers.map(customer => ({
      id: customer.id,
      title: customer.name,
      subtitle: customer.email,
      description: customer.company || '',
      type: 'customer' as const,
      url: `/customers/${customer.id}`,
      metadata: {
        email: customer.email,
        company: customer.company,
        status: customer.status,
        totalCampaigns: customer.totalCampaigns || 0,
        totalRevenue: customer.totalRevenue || 0,
        tags: customer.tags || [],
      },
      searchableText: [
        customer.name,
        customer.email,
        customer.company,
        ...(customer.tags || []),
      ].filter(Boolean).join(' '),
    }));
  }

  private mapCampaignsToSearchable(campaigns: any[]): CampaignSearchResult[] {
    return campaigns.map(campaign => ({
      id: campaign.id,
      title: campaign.name,
      subtitle: campaign.customerName,
      description: campaign.description || '',
      type: 'campaign' as const,
      url: `/campaigns/${campaign.id}`,
      metadata: {
        customerName: campaign.customerName,
        customerId: campaign.customerId,
        campaignType: campaign.type,
        status: campaign.status,
        totalEvents: campaign.totalEvents || 0,
        totalConversions: campaign.totalConversions || 0,
        conversionRate: campaign.conversionRate || 0,
      },
      searchableText: [
        campaign.name,
        campaign.customerName,
        campaign.description,
        campaign.type,
      ].filter(Boolean).join(' '),
    }));
  }

  private mapTagsToSearchable(tags: any[]): TagSearchResult[] {
    return tags.map(tag => ({
      id: tag.id,
      title: tag.name,
      subtitle: `Used ${tag.usageCount || 0} times`,
      description: tag.description || '',
      type: 'tag' as const,
      url: `/tags/${tag.id}`,
      metadata: {
        usageCount: tag.usageCount || 0,
        customerCount: tag.customerCount || 0,
        relatedTags: tag.relatedTags || [],
      },
      searchableText: [
        tag.name,
        tag.description,
        ...(tag.relatedTags || []),
      ].filter(Boolean).join(' '),
    }));
  }

  private applyFilters(results: SearchResult[], filters: any): SearchResult[] {
    let filtered = results;

    if (filters.types && filters.types.length > 0) {
      filtered = filtered.filter(item => filters.types.includes(item.type));
    }

    if (filters.customerIds && filters.customerIds.length > 0) {
      filtered = filtered.filter(item => {
        if (item.type === 'customer') {
          return filters.customerIds.includes(item.id);
        } else if (item.type === 'campaign') {
          return filters.customerIds.includes(item.metadata.customerId);
        }
        return true;
      });
    }

    if (filters.statuses && filters.statuses.length > 0) {
      filtered = filtered.filter(item => {
        if (item.type === 'customer' || item.type === 'campaign') {
          return filters.statuses.includes(item.metadata.status);
        }
        return true;
      });
    }

    if (filters.dateRange) {
      // Note: This would require additional timestamp data on the items
      // For now, we'll skip date filtering as it's not in the basic item structure
    }

    return filtered;
  }

  private generateSuggestions(query: string): string[] {
    if (!this.searchableItems.length) {
      return [];
    }

    const suggestions = new Set<string>();
    const lowercaseQuery = query.toLowerCase();

    // Extract words from all searchable items that start with the query
    this.searchableItems.forEach(item => {
      const words = [
        item.title,
        item.subtitle,
        item.description,
        item.searchableText,
      ].join(' ').toLowerCase().split(/\s+/);

      words.forEach(word => {
        if (word.startsWith(lowercaseQuery) && word.length > query.length) {
          suggestions.add(word);
        }
      });
    });

    return Array.from(suggestions).slice(0, 5);
  }

  private addToHistory(query: string, resultCount: number, filters?: any): void {
    // Don't add empty queries or duplicates
    if (!query.trim()) return;

    // Remove existing entry if it exists
    this.searchHistory = this.searchHistory.filter(item => item.query !== query);

    // Add new entry at the beginning
    const historyItem: SearchHistory = {
      id: Date.now().toString(),
      query,
      timestamp: new Date().toISOString(),
      resultCount,
      filters,
    };

    this.searchHistory.unshift(historyItem);

    // Keep only the last N items
    this.searchHistory = this.searchHistory.slice(0, this.maxHistoryItems);

    this.saveSearchHistory();
  }

  private loadSearchHistory(): void {
    try {
      const stored = localStorage.getItem('oneclicktag_search_history');
      if (stored) {
        this.searchHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
      this.searchHistory = [];
    }
  }

  private saveSearchHistory(): void {
    try {
      localStorage.setItem('oneclicktag_search_history', JSON.stringify(this.searchHistory));
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  }
}

// Export singleton instance
export const searchService = new SearchService();
export default searchService;