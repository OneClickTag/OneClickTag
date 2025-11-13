import { Search, Users, Target, Tag } from 'lucide-react';
import { SearchTrigger } from '@/components/search/SearchTrigger';

export function SearchExample() {
  // const { data: searchHistory } = useSearchHistory(); // Unused variable
  
  // Mock function for demo purposes
  const setIsSearchOpen = (open: boolean) => {
    console.log('Search open:', open);
  };
  
  // Mock search stats for demo
  const searchStats = {
    totalIndexedItems: 1247,
    customers: 342,
    campaigns: 563,
    tags: 342,
    customerCount: 342,
    campaignCount: 563,
    tagCount: 342,
    historyCount: 23
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Global Search Demo
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Search across customers, campaigns, and tags with fuzzy matching and keyboard shortcuts
        </p>
      </div>

      {/* Search trigger examples */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Input Style</h3>
          <SearchTrigger
            onClick={() => setIsSearchOpen(true)}
            variant="input"
            placeholder="Search customers, campaigns..."
          />
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Button Style</h3>
          <SearchTrigger
            onClick={() => setIsSearchOpen(true)}
            variant="button"
          />
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Minimal Style</h3>
          <SearchTrigger
            onClick={() => setIsSearchOpen(true)}
            variant="minimal"
          />
        </div>
      </div>

      {/* Features */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Features</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-2">🔍 Fuzzy Search</h3>
            <p className="text-gray-600 text-sm">
              Smart search with typo tolerance using Fuse.js
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">⌨️ Keyboard Shortcuts</h3>
            <p className="text-gray-600 text-sm">
              Press <kbd className="px-2 py-1 bg-gray-100 rounded">⌘K</kbd> or <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl+K</kbd> to open search
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">📂 Categorized Results</h3>
            <p className="text-gray-600 text-sm">
              Results organized by customers, campaigns, and tags
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">🕒 Search History</h3>
            <p className="text-gray-600 text-sm">
              Recent searches saved and easily accessible
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">🎛️ Advanced Filters</h3>
            <p className="text-gray-600 text-sm">
              Filter by content type and status
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">⚡ Real-time Results</h3>
            <p className="text-gray-600 text-sm">
              Instant search with debouncing and caching
            </p>
          </div>
        </div>
      </div>

      {/* Search statistics */}
      {searchStats && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Search Index Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{searchStats.customerCount}</div>
              <div className="text-sm text-gray-600">Customers</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-green-100 rounded-lg">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{searchStats.campaignCount}</div>
              <div className="text-sm text-gray-600">Campaigns</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-purple-100 rounded-lg">
                <Tag className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{searchStats.tagCount}</div>
              <div className="text-sm text-gray-600">Tags</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-gray-100 rounded-lg">
                <Search className="w-6 h-6 text-gray-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{searchStats.historyCount}</div>
              <div className="text-sm text-gray-600">History</div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-medium text-blue-900 mb-2">Try it out!</h3>
        <p className="text-blue-800 text-sm">
          Click any search trigger above or press <kbd className="px-2 py-1 bg-blue-100 rounded text-xs">⌘K</kbd> / <kbd className="px-2 py-1 bg-blue-100 rounded text-xs">Ctrl+K</kbd> to open the search dialog.
        </p>
      </div>
    </div>
  );
}