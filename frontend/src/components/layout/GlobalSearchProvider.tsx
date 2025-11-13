import React from 'react';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { SearchTrigger } from '@/components/search/SearchTrigger';
import { useInitializeSearch } from '@/hooks/useSearch';

interface GlobalSearchProviderProps {
  children: React.ReactNode;
}

export function GlobalSearchProvider({ children }: GlobalSearchProviderProps) {
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const initializeSearch = useInitializeSearch();

  // Initialize search data on mount
  React.useEffect(() => {
    initializeSearch.mutate();
  }, []);

  return (
    <>
      {children}
      <GlobalSearch 
        isOpen={isSearchOpen} 
        onOpenChange={setIsSearchOpen}
      />
    </>
  );
}

// Header component with search trigger
export function SearchableHeader({ 
  title, 
  children 
}: { 
  title: string; 
  children?: React.ReactNode;
}) {
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          <div className="flex items-center gap-4">
            {children}
            <SearchTrigger 
              onClick={() => setIsSearchOpen(true)}
              variant="input"
              placeholder="Search customers, campaigns, tags..."
            />
          </div>
        </div>
      </div>
      <GlobalSearch 
        isOpen={isSearchOpen} 
        onOpenChange={setIsSearchOpen}
      />
    </div>
  );
}