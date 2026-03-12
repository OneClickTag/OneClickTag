'use client';

import { useMemo, useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, FileText, MousePointerClick, Lock, Folder, FolderOpen, File } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PageData {
  url: string;
  title: string | null;
  pageType: string | null;
  hasForm: boolean;
  hasCTA: boolean;
  isAuthenticated?: boolean;
}

interface TreeNode {
  segment: string;
  fullPath: string;
  children: Map<string, TreeNode>;
  pages: PageData[]; // leaf pages at this exact path
  totalDescendantPages: number;
  hasAuth: boolean;
  hasForm: boolean;
  hasCTA: boolean;
}

interface SiteStructureTreeProps {
  pages: PageData[];
  domain?: string;
  maxHeight?: string;
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
  terms: 'bg-stone-100 text-stone-700',
  other: 'bg-slate-100 text-slate-600',
};

function buildTree(pages: PageData[]): TreeNode {
  const root: TreeNode = {
    segment: '/',
    fullPath: '/',
    children: new Map(),
    pages: [],
    totalDescendantPages: 0,
    hasAuth: false,
    hasForm: false,
    hasCTA: false,
  };

  for (const page of pages) {
    let pathname: string;
    try {
      pathname = new URL(page.url).pathname;
    } catch {
      pathname = page.url;
    }

    // Normalize: remove trailing slash (except root)
    if (pathname !== '/' && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    const segments = pathname === '/' ? [] : pathname.split('/').filter(Boolean);

    let current = root;
    let builtPath = '';

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      builtPath += '/' + seg;

      if (!current.children.has(seg)) {
        current.children.set(seg, {
          segment: seg,
          fullPath: builtPath,
          children: new Map(),
          pages: [],
          totalDescendantPages: 0,
          hasAuth: false,
          hasForm: false,
          hasCTA: false,
        });
      }
      current = current.children.get(seg)!;
    }

    // Place the page at the final node
    current.pages.push(page);
    if (page.isAuthenticated) current.hasAuth = true;
    if (page.hasForm) current.hasForm = true;
    if (page.hasCTA) current.hasCTA = true;
  }

  // Propagate counts and flags up
  function propagate(node: TreeNode): number {
    let count = node.pages.length;
    Array.from(node.children.values()).forEach(child => {
      count += propagate(child);
      if (child.hasAuth) node.hasAuth = true;
      if (child.hasForm) node.hasForm = true;
      if (child.hasCTA) node.hasCTA = true;
    });
    node.totalDescendantPages = count;
    return count;
  }
  propagate(root);

  return root;
}

function TreeNodeRow({
  node,
  depth,
  expandedPaths,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
}) {
  const hasChildren = node.children.size > 0;
  const isExpanded = expandedPaths.has(node.fullPath);
  const isRoot = depth === 0;

  // Get the primary page type for this node
  const primaryPageType = node.pages[0]?.pageType || null;

  // Sort children: directories first (by total pages desc), then leaves
  const sortedChildren = useMemo(() => {
    return Array.from(node.children.values()).sort((a, b) => {
      const aIsDir = a.children.size > 0;
      const bIsDir = b.children.size > 0;
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return b.totalDescendantPages - a.totalDescendantPages;
    });
  }, [node.children]);

  return (
    <>
      <div
        className={`flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer hover:bg-gray-50 group ${isRoot ? 'font-medium' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={() => hasChildren && onToggle(node.fullPath)}
      >
        {/* Expand/collapse icon */}
        {hasChildren ? (
          <span className="w-4 h-4 flex items-center justify-center shrink-0 text-gray-400">
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </span>
        ) : (
          <span className="w-4 h-4 shrink-0" />
        )}

        {/* Folder/file icon */}
        <span className="shrink-0 text-gray-400">
          {hasChildren ? (
            isExpanded ? (
              <FolderOpen className="h-3.5 w-3.5 text-blue-500" />
            ) : (
              <Folder className="h-3.5 w-3.5 text-blue-400" />
            )
          ) : (
            <File className="h-3.5 w-3.5 text-gray-400" />
          )}
        </span>

        {/* Segment name */}
        <span className={`text-xs truncate ${isRoot ? 'text-gray-900' : 'text-gray-700'}`}>
          {isRoot ? node.segment : `/${node.segment}`}
        </span>

        {/* Page count badge for directories */}
        {hasChildren && (
          <span className="text-[10px] text-gray-400 shrink-0">
            ({node.totalDescendantPages})
          </span>
        )}

        {/* Page type badge */}
        {primaryPageType && (
          <Badge
            variant="outline"
            className={`text-[10px] py-0 h-4 shrink-0 ${pageTypeColors[primaryPageType] || pageTypeColors.other}`}
          >
            {primaryPageType}
          </Badge>
        )}

        {/* Auth indicator */}
        {node.hasAuth && (
          <Lock className="h-3 w-3 text-green-600 shrink-0" />
        )}

        {/* Form indicator */}
        {node.hasForm && (
          <FileText className="h-3 w-3 text-red-400 shrink-0" />
        )}

        {/* CTA indicator */}
        {node.hasCTA && (
          <MousePointerClick className="h-3 w-3 text-orange-400 shrink-0" />
        )}
      </div>

      {/* Children */}
      {isExpanded &&
        sortedChildren.map((child) => (
          <TreeNodeRow
            key={child.fullPath}
            node={child}
            depth={depth + 1}
            expandedPaths={expandedPaths}
            onToggle={onToggle}
          />
        ))}
    </>
  );
}

export function SiteStructureTree({ pages, domain, maxHeight = '400px' }: SiteStructureTreeProps) {
  const tree = useMemo(() => buildTree(pages), [pages]);

  // Auto-expand root and first-level directories
  const defaultExpanded = useMemo(() => {
    const paths = new Set<string>(['/']);
    Array.from(tree.children.values()).forEach(child => {
      if (child.children.size > 0 || child.totalDescendantPages > 1) {
        paths.add(child.fullPath);
      }
    });
    return paths;
  }, [tree]);

  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(defaultExpanded);

  // Update defaults when tree grows (new pages discovered)
  useMemo(() => {
    setExpandedPaths((prev) => {
      const merged = new Set(prev);
      Array.from(defaultExpanded).forEach(p => merged.add(p));
      return merged;
    });
  }, [defaultExpanded]);

  const handleToggle = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    const all = new Set<string>();
    function collect(node: TreeNode) {
      if (node.children.size > 0) {
        all.add(node.fullPath);
        Array.from(node.children.values()).forEach(child => collect(child));
      }
    }
    collect(tree);
    setExpandedPaths(all);
  }, [tree]);

  const handleCollapseAll = useCallback(() => {
    setExpandedPaths(new Set(['/']));
  }, []);

  // Override root segment with domain if provided
  const displayTree = tree;
  if (domain) {
    displayTree.segment = domain;
  }

  return (
    <div className="space-y-2">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline"
            onClick={handleExpandAll}
          >
            Expand all
          </button>
          <button
            className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline"
            onClick={handleCollapseAll}
          >
            Collapse all
          </button>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {pages.length} pages / {tree.children.size} top-level routes
        </span>
      </div>

      {/* Tree */}
      <div
        className="overflow-y-auto font-mono"
        style={{ maxHeight }}
      >
        <TreeNodeRow
          node={displayTree}
          depth={0}
          expandedPaths={expandedPaths}
          onToggle={handleToggle}
        />
      </div>
    </div>
  );
}
