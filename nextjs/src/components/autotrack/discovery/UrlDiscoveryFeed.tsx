'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { LiveDiscovery } from '@/types/site-scanner';
import { ScanPage } from '@/types/site-scanner';

interface UrlDiscoveryFeedProps {
  discovery: LiveDiscovery;
  pages?: ScanPage[];
  newPages?: Array<{ url: string; title: string | null; pageType: string | null; hasForm: boolean; hasCTA: boolean }>;
}

const pageTypeColors: Record<string, string> = {
  homepage: 'bg-purple-100 text-purple-700',
  product: 'bg-blue-100 text-blue-700',
  category: 'bg-cyan-100 text-cyan-700',
  blog: 'bg-green-100 text-green-700',
  contact: 'bg-orange-100 text-orange-700',
  about: 'bg-gray-100 text-gray-700',
  pricing: 'bg-amber-100 text-amber-700',
  checkout: 'bg-red-100 text-red-700',
  cart: 'bg-pink-100 text-pink-700',
  login: 'bg-indigo-100 text-indigo-700',
  faq: 'bg-teal-100 text-teal-700',
};

export function UrlDiscoveryFeed({ discovery, newPages }: UrlDiscoveryFeedProps) {
  const { pageTypes } = discovery;

  const typeEntries = useMemo(() => {
    return Object.entries(pageTypes)
      .sort((a, b) => b[1] - a[1]);
  }, [pageTypes]);

  const totalPages = typeEntries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="bg-white rounded-lg border p-4 space-y-3 max-h-[400px] flex flex-col">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground uppercase">URL Discovery</h4>
        <span className="text-xs text-muted-foreground">{totalPages} pages found</span>
      </div>

      {/* Page type distribution */}
      {typeEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {typeEntries.map(([type, count]) => (
            <Badge
              key={type}
              variant="outline"
              className={`text-xs ${pageTypeColors[type] || 'bg-gray-100 text-gray-700'}`}
            >
              {type} ({count})
            </Badge>
          ))}
        </div>
      )}

      {/* URL patterns */}
      {discovery.urlPatterns.length > 0 && (
        <div>
          <h5 className="text-xs text-muted-foreground mb-1">URL Patterns</h5>
          <div className="space-y-0.5">
            {discovery.urlPatterns.slice(0, 5).map((pattern, i) => (
              <div key={i} className="text-xs font-mono text-muted-foreground truncate">
                {pattern}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent pages feed */}
      {newPages && newPages.length > 0 && (
        <div className="flex-1 overflow-y-auto min-h-0">
          <h5 className="text-xs text-muted-foreground mb-1 sticky top-0 bg-white">Recent Pages</h5>
          <div className="space-y-1">
            {newPages.map((page, i) => (
              <div
                key={i}
                className="flex items-center gap-2 py-1 px-2 rounded bg-gray-50 text-xs"
              >
                <span className="truncate flex-1 text-muted-foreground">
                  {tryPathname(page.url)}
                </span>
                {page.pageType && (
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${pageTypeColors[page.pageType] || 'bg-gray-100 text-gray-700'}`}>
                    {page.pageType}
                  </Badge>
                )}
                {page.hasForm && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" title="Has form" />
                )}
                {page.hasCTA && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" title="Has CTA" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pre-crawl info */}
      <div className="flex gap-3 text-xs text-muted-foreground pt-1 border-t">
        <span>Sitemap: {discovery.sitemapFound ? 'Found' : 'Not found'}</span>
        <span>Robots.txt: {discovery.robotsFound ? 'Found' : 'Not found'}</span>
        <span>URLs discovered: {discovery.totalUrlsDiscovered}</span>
      </div>
    </div>
  );
}

function tryPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
