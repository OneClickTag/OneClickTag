'use client';

import { useMemo, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { LiveDiscovery } from '@/types/site-scanner';
import { FileText, MousePointerClick, Lock } from 'lucide-react';

interface UrlDiscoveryFeedProps {
  discovery: LiveDiscovery;
  pages?: Array<{ url: string; title: string | null; pageType: string | null }>;
  newPages?: Array<{ url: string; title: string | null; pageType: string | null; hasForm: boolean; hasCTA: boolean; isAuthenticated?: boolean }>;
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
  features: 'bg-violet-100 text-violet-700',
  services: 'bg-lime-100 text-lime-700',
  documentation: 'bg-sky-100 text-sky-700',
  signup: 'bg-emerald-100 text-emerald-700',
  demo: 'bg-rose-100 text-rose-700',
};

export function UrlDiscoveryFeed({ discovery, newPages }: UrlDiscoveryFeedProps) {
  const { pageTypes } = discovery;
  const feedRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  const typeEntries = useMemo(() => {
    return Object.entries(pageTypes)
      .sort((a, b) => b[1] - a[1]);
  }, [pageTypes]);

  const totalPages = typeEntries.reduce((sum, [, count]) => sum + count, 0);

  // Auto-scroll to top when new pages arrive
  useEffect(() => {
    if (newPages && newPages.length > prevCountRef.current && feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
    prevCountRef.current = newPages?.length || 0;
  }, [newPages?.length]);

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
              className={`text-xs transition-all duration-300 ${pageTypeColors[type] || 'bg-gray-100 text-gray-700'}`}
            >
              {type} ({count})
            </Badge>
          ))}
        </div>
      )}

      {/* Live page feed */}
      {newPages && newPages.length > 0 && (
        <div ref={feedRef} className="flex-1 overflow-y-auto min-h-0">
          <h5 className="text-xs text-muted-foreground mb-1.5 sticky top-0 bg-white z-10 pb-1">
            Live Feed
          </h5>
          <div className="space-y-1">
            {newPages.slice(0, 50).map((page, i) => (
              <div
                key={`${page.url}-${i}`}
                className="flex items-center gap-2 py-1.5 px-2 rounded text-xs"
                style={{
                  // Newest items (first 3) get highlight background
                  backgroundColor: i < 3 ? 'rgb(239 246 255)' : 'rgb(249 250 251)',
                  // Fade in animation for newest items
                  animation: i < 5 ? `fadeSlideIn 0.3s ease-out ${i * 50}ms both` : 'none',
                }}
              >
                {/* Live dot for newest items */}
                {i < 3 && (
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
                  </span>
                )}
                <span className="truncate flex-1 text-muted-foreground">
                  {tryPathname(page.url)}
                </span>
                {page.isAuthenticated && (
                  <Badge variant="outline" className="text-[10px] shrink-0 bg-green-100 text-green-700 flex items-center gap-1">
                    <Lock className="h-2.5 w-2.5" />
                    Auth
                  </Badge>
                )}
                {page.pageType && (
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${pageTypeColors[page.pageType] || 'bg-gray-100 text-gray-700'}`}>
                    {page.pageType}
                  </Badge>
                )}
                {page.hasForm && (
                  <span className="shrink-0" aria-label="Has form">
                    <FileText className="h-3 w-3 text-red-400" />
                  </span>
                )}
                {page.hasCTA && (
                  <span className="shrink-0" aria-label="Has CTA">
                    <MousePointerClick className="h-3 w-3 text-orange-400" />
                  </span>
                )}
              </div>
            ))}
            {newPages.length > 50 && (
              <div className="text-xs text-muted-foreground text-center py-1">
                +{newPages.length - 50} more pages
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pre-crawl info */}
      <div className="flex gap-3 text-xs text-muted-foreground pt-1 border-t">
        <span>Sitemap: {discovery.sitemapFound ? 'Found' : 'Not found'}</span>
        <span>Robots.txt: {discovery.robotsFound ? 'Found' : 'Not found'}</span>
      </div>

      {/* Inline CSS for fade-slide animation */}
      <style jsx>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
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
