'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Lock, Globe, ShoppingCart, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ExploredRoutesProps {
  scanPages: Array<{
    url: string;
    title: string | null;
    pageType: string | null;
    depth: number;
    isAuthenticated?: boolean;
    templateGroup?: string | null;
    hasForm: boolean;
    hasCTA: boolean;
    importanceScore: number | null;
  }>;
  recommendations: Array<{
    pageUrl: string;
    severity: string;
  }>;
}

interface TreeNode {
  segment: string;
  fullPath: string;
  pages: typeof ExploredRoutesProps['scanPages'][0][];
  children: Map<string, TreeNode>;
  isTemplate: boolean;
  templateCount: number;
  depth: number;
  isAuthenticated: boolean;
  isLogin: boolean;
  hasError: boolean;
  recommendationCount: number;
}

function getPageIcon(pageType: string | null) {
  if (!pageType) return <Globe className="h-3 w-3" />;

  const type = pageType.toLowerCase();
  if (type.includes('product') || type.includes('shop') || type.includes('cart') || type.includes('checkout')) {
    return <ShoppingCart className="h-3 w-3" />;
  }
  if (type.includes('login') || type.includes('auth')) {
    return <Lock className="h-3 w-3 text-blue-500" />;
  }
  if (type.includes('error') || type.includes('404')) {
    return <AlertCircle className="h-3 w-3 text-orange-500" />;
  }
  return <FileText className="h-3 w-3" />;
}

function getStatusColor(page: TreeNode['pages'][0], isError: boolean): string {
  if (isError) return 'bg-orange-400';
  if (page.pageType?.toLowerCase().includes('login')) return 'bg-blue-400';
  if (page.isAuthenticated) return 'bg-yellow-400';
  return 'bg-green-400';
}

function buildTree(pages: ExploredRoutesProps['scanPages'], recommendations: ExploredRoutesProps['recommendations']): TreeNode {
  const root: TreeNode = {
    segment: '',
    fullPath: '',
    pages: [],
    children: new Map(),
    isTemplate: false,
    templateCount: 0,
    depth: 0,
    isAuthenticated: false,
    isLogin: false,
    hasError: false,
    recommendationCount: 0,
  };

  // Create recommendation count map
  const recCountMap = new Map<string, number>();
  recommendations.forEach(rec => {
    recCountMap.set(rec.pageUrl, (recCountMap.get(rec.pageUrl) || 0) + 1);
  });

  // Build tree from pages
  pages.forEach(page => {
    try {
      const url = new URL(page.url);
      const pathSegments = url.pathname.split('/').filter(Boolean);

      let currentNode = root;
      let currentPath = '';

      pathSegments.forEach((segment, index) => {
        currentPath += '/' + segment;

        if (!currentNode.children.has(segment)) {
          currentNode.children.set(segment, {
            segment,
            fullPath: currentPath,
            pages: [],
            children: new Map(),
            isTemplate: false,
            templateCount: 0,
            depth: index + 1,
            isAuthenticated: false,
            isLogin: false,
            hasError: false,
            recommendationCount: 0,
          });
        }

        currentNode = currentNode.children.get(segment)!;
      });

      // Add page to the leaf node
      currentNode.pages.push(page);
      currentNode.recommendationCount += recCountMap.get(page.url) || 0;

      // Update node properties
      if (page.isAuthenticated) currentNode.isAuthenticated = true;
      if (page.pageType?.toLowerCase().includes('login')) currentNode.isLogin = true;
      if (page.pageType?.toLowerCase().includes('error') || page.pageType?.toLowerCase().includes('404')) {
        currentNode.hasError = true;
      }

    } catch (error) {
      // Invalid URL, skip
    }
  });

  // Identify template groups (nodes with 5+ pages with same templateGroup)
  function markTemplates(node: TreeNode) {
    if (node.pages.length >= 5) {
      const templateGroups = new Map<string, number>();
      node.pages.forEach(page => {
        if (page.templateGroup) {
          templateGroups.set(page.templateGroup, (templateGroups.get(page.templateGroup) || 0) + 1);
        }
      });

      const maxGroup = Array.from(templateGroups.entries()).reduce((max, [group, count]) =>
        count > (max[1] || 0) ? [group, count] : max, ['', 0] as [string, number]
      );

      if (maxGroup[1] >= 5) {
        node.isTemplate = true;
        node.templateCount = maxGroup[1];
      }
    }

    node.children.forEach(child => markTemplates(child));
  }

  markTemplates(root);

  return root;
}

function TreeNodeComponent({ node, level = 0 }: { node: TreeNode; level?: number }) {
  const [isOpen, setIsOpen] = useState(level < 2); // Auto-expand first 2 levels
  const hasChildren = node.children.size > 0;
  const hasPages = node.pages.length > 0;

  if (!hasChildren && !hasPages) return null;

  const samplePage = node.pages[0];
  const indentClass = `ml-${Math.min(level * 4, 12)}`;

  return (
    <div className="space-y-1">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-2 py-1.5 hover:bg-gray-50 rounded px-2 group">
          {/* Expand/collapse button */}
          {hasChildren && (
            <CollapsibleTrigger asChild>
              <button className="p-0.5 hover:bg-gray-200 rounded">
                {isOpen ? (
                  <ChevronDown className="h-3 w-3 text-gray-500" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-gray-500" />
                )}
              </button>
            </CollapsibleTrigger>
          )}
          {!hasChildren && <div className="w-4" />}

          {/* Status indicator */}
          {hasPages && (
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(samplePage, node.hasError)}`} />
          )}

          {/* Path segment */}
          <span className="text-sm font-mono text-gray-700">
            {node.isTemplate ? (
              <span className="text-purple-600">
                {node.segment}/* <span className="text-xs text-gray-500">({node.templateCount} pages)</span>
              </span>
            ) : (
              <>/{node.segment}</>
            )}
          </span>

          {/* Page type badge */}
          {hasPages && samplePage.pageType && (
            <Badge variant="outline" className="text-xs py-0 h-5">
              {getPageIcon(samplePage.pageType)}
              <span className="ml-1">{samplePage.pageType}</span>
            </Badge>
          )}

          {/* Authenticated indicator */}
          {node.isAuthenticated && (
            <Lock className="h-3 w-3 text-yellow-600" />
          )}

          {/* Recommendation count */}
          {node.recommendationCount > 0 && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 py-0 h-5">
              {node.recommendationCount} {node.recommendationCount === 1 ? 'rec' : 'recs'}
            </Badge>
          )}

          {/* Page count if multiple */}
          {node.pages.length > 1 && !node.isTemplate && (
            <span className="text-xs text-gray-500">({node.pages.length} pages)</span>
          )}
        </div>

        {/* Children */}
        {hasChildren && (
          <CollapsibleContent className="ml-4">
            {Array.from(node.children.values()).map(child => (
              <TreeNodeComponent key={child.fullPath} node={child} level={level + 1} />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

export function ExploredRoutes({ scanPages, recommendations }: ExploredRoutesProps) {
  const tree = useMemo(() => buildTree(scanPages, recommendations), [scanPages, recommendations]);

  // Calculate stats
  const stats = useMemo(() => {
    const uniqueRoutes = new Set(scanPages.map(p => {
      try {
        return new URL(p.url).pathname;
      } catch {
        return p.url;
      }
    }));

    const authenticatedPages = scanPages.filter(p => p.isAuthenticated).length;
    const totalRecommendations = recommendations.length;
    const pagesScanned = scanPages.length;
    const routesDiscovered = uniqueRoutes.size;
    const coverage = routesDiscovered > 0 ? Math.round((pagesScanned / routesDiscovered) * 100) : 0;

    return {
      routesDiscovered,
      pagesScanned,
      authenticatedPages,
      totalRecommendations,
      coverage,
    };
  }, [scanPages, recommendations]);

  return (
    <Card className="p-6 space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pb-4 border-b">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.routesDiscovered}</div>
          <div className="text-xs text-muted-foreground">Routes Discovered</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.pagesScanned}</div>
          <div className="text-xs text-muted-foreground">Pages Scanned</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.authenticatedPages}</div>
          <div className="text-xs text-muted-foreground">Authenticated</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.totalRecommendations}</div>
          <div className="text-xs text-muted-foreground">Recommendations</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.coverage}%</div>
          <div className="text-xs text-muted-foreground">Coverage</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pb-3 border-b">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span>Scanned</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <span>Authenticated</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <span>Login</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-orange-400" />
          <span>Error</span>
        </div>
      </div>

      {/* Tree */}
      <div className="space-y-1 max-h-[600px] overflow-y-auto">
        {Array.from(tree.children.values()).map(child => (
          <TreeNodeComponent key={child.fullPath} node={child} />
        ))}
      </div>

      {scanPages.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No routes explored yet.
        </div>
      )}
    </Card>
  );
}
