'use client';

import { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Globe,
  CheckCheck,
  CreditCard,
  ShoppingCart,
  Package,
  DollarSign,
  Mail,
  Play,
  UserPlus,
  Briefcase,
  Home,
  BookOpen,
  Info,
  HelpCircle,
  FileText,
  MousePointer,
  Eye,
  FormInput,
  ArrowDown,
  LinkIcon,
  Loader2,
  AlertCircle,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { TrackingRecommendation, RecommendationSeverity } from '@/types/site-scanner';
import { SeverityBadge } from './SeverityBadge';

interface RouteRecommendationTreeProps {
  recommendations: TrackingRecommendation[];
  scanPages: Array<{
    url: string;
    title: string | null;
    pageType: string | null;
    hasForm: boolean;
    hasCTA: boolean;
    templateGroup: string | null;
  }>;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onBulkAccept: (ids: string[]) => void;
  onCreateTracking?: (recommendation: TrackingRecommendation) => void;
  acceptingId: string | null;
  rejectingId: string | null;
  isBulkAccepting: boolean;
  // New selection props
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onSelectRoute: (ids: string[], selected: boolean) => void;
}

interface GroupedRecommendations {
  routePath: string;
  templateGroup: string | null;
  pageUrl: string | null;
  pageType: string | null;
  pageTitle: string | null;
  pageCount: number;
  recommendations: TrackingRecommendation[];
  counts: {
    critical: number;
    important: number;
    recommended: number;
    optional: number;
  };
  trackedCount: number;
  syncingCount: number;
  failedCount: number;
  repairCount: number;
}

const pageTypeIcons: Record<string, React.ElementType> = {
  checkout: CreditCard,
  cart: ShoppingCart,
  product: Package,
  pricing: DollarSign,
  contact: Mail,
  demo: Play,
  signup: UserPlus,
  services: Briefcase,
  homepage: Home,
  blog: BookOpen,
  about: Info,
  faq: HelpCircle,
};

const trackingTypeIcons: Record<string, React.ElementType> = {
  BUTTON_CLICK: MousePointer,
  LINK_CLICK: LinkIcon,
  PAGE_VIEW: Eye,
  FORM_SUBMIT: FormInput,
  SCROLL_DEPTH: ArrowDown,
  ADD_TO_CART: ShoppingCart,
  PURCHASE: CreditCard,
  PHONE_CALL_CLICK: Mail,
  EMAIL_CLICK: Mail,
  SIGNUP: UserPlus,
  DOWNLOAD: ArrowDown,
};

const severityBarColors: Record<RecommendationSeverity, string> = {
  CRITICAL: 'bg-red-500',
  IMPORTANT: 'bg-orange-500',
  RECOMMENDED: 'bg-blue-500',
  OPTIONAL: 'bg-gray-400',
};

export function RouteRecommendationTree({
  recommendations,
  scanPages,
  onAccept,
  onReject,
  onBulkAccept,
  onCreateTracking,
  acceptingId,
  rejectingId,
  isBulkAccepting,
  selectedIds,
  onToggleSelection,
  onSelectRoute,
}: RouteRecommendationTreeProps) {
  const grouped = useMemo(() => {
    const groups: Record<string, GroupedRecommendations> = {};
    const templatePageCounts: Record<string, Set<string>> = {};

    recommendations.forEach((rec) => {
      // Determine if this is site-wide (no pageUrl or urlPattern='.*')
      const isSiteWide = !rec.pageUrl || rec.urlPattern === '.*';

      let groupKey: string;
      let routePath: string;
      let templateGroup: string | null = null;
      let pageType: string | null = null;
      let pageTitle: string | null = null;
      let representativeUrl: string | null = null;

      if (isSiteWide) {
        groupKey = '__site_wide__';
        routePath = 'Site-wide';
      } else {
        // Find matching page from scanPages
        const matchingPage = scanPages.find((p) => p.url === rec.pageUrl);
        templateGroup = matchingPage?.templateGroup || null;
        pageType = matchingPage?.pageType || null;
        pageTitle = matchingPage?.title || null;
        representativeUrl = rec.pageUrl!;

        // Handle hash routing
        try {
          const url = new URL(rec.pageUrl!);
          if (url.hash.startsWith('#/')) {
            routePath = url.hash.slice(1);
          } else {
            routePath = url.pathname;
          }
        } catch {
          routePath = rec.pageUrl!;
        }

        // Use templateGroup as grouping key when available
        if (templateGroup) {
          groupKey = `template:${templateGroup}`;
          // If routePath is just "/" and we have a templateGroup, use the template group as route path
          if (routePath === '/') {
            routePath = templateGroup;
          }
          // Track pages in this template group
          if (!templatePageCounts[templateGroup]) {
            templatePageCounts[templateGroup] = new Set();
          }
          templatePageCounts[templateGroup].add(rec.pageUrl!);
        } else {
          groupKey = rec.pageUrl!;
        }
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          routePath,
          templateGroup,
          pageUrl: isSiteWide ? null : representativeUrl,
          pageType,
          pageTitle,
          pageCount: 0,
          recommendations: [],
          counts: { critical: 0, important: 0, recommended: 0, optional: 0 },
          trackedCount: 0,
          syncingCount: 0,
          failedCount: 0,
          repairCount: 0,
        };
      }

      groups[groupKey].recommendations.push(rec);

      // Count by status and severity
      if (rec.status === 'CREATED') {
        groups[groupKey].trackedCount++;
      } else if (rec.status === 'CREATING') {
        groups[groupKey].syncingCount++;
      } else if (rec.status === 'FAILED') {
        groups[groupKey].failedCount++;
      } else if (rec.status === 'REPAIR') {
        groups[groupKey].repairCount++;
      }

      if (rec.status === 'PENDING' || rec.status === 'REPAIR' || rec.status === 'FAILED') {
        const severity = rec.severity.toLowerCase() as keyof typeof groups[typeof groupKey]['counts'];
        groups[groupKey].counts[severity]++;
      }
    });

    // Update page counts for template groups
    Object.values(groups).forEach((group) => {
      if (group.templateGroup && templatePageCounts[group.templateGroup]) {
        group.pageCount = templatePageCounts[group.templateGroup].size;
      } else {
        group.pageCount = 1;
      }
    });

    // Sort: site-wide first, then by highest severity, then by recommendation count
    const sorted = Object.values(groups).sort((a, b) => {
      if (a.routePath === 'Site-wide') return -1;
      if (b.routePath === 'Site-wide') return 1;

      // Sort by highest severity
      const aMaxSeverity = a.counts.critical > 0 ? 0 : a.counts.important > 0 ? 1 : a.counts.recommended > 0 ? 2 : 3;
      const bMaxSeverity = b.counts.critical > 0 ? 0 : b.counts.important > 0 ? 1 : b.counts.recommended > 0 ? 2 : 3;

      if (aMaxSeverity !== bMaxSeverity) {
        return aMaxSeverity - bMaxSeverity;
      }

      // Sort by total recommendation count
      const aTotal = a.recommendations.length;
      const bTotal = b.recommendations.length;
      if (aTotal !== bTotal) {
        return bTotal - aTotal;
      }

      return a.routePath.localeCompare(b.routePath);
    });

    return sorted;
  }, [recommendations, scanPages]);

  // Auto-open routes with critical recommendations
  const [openRoutes, setOpenRoutes] = useState<Set<string>>(() => {
    const initialOpen = new Set<string>();
    grouped.forEach((group) => {
      if (group.counts.critical > 0) {
        initialOpen.add(group.routePath);
      }
    });
    return initialOpen;
  });

  const toggleRoute = (routePath: string) => {
    setOpenRoutes((prev) => {
      const next = new Set(prev);
      if (next.has(routePath)) {
        next.delete(routePath);
      } else {
        next.add(routePath);
      }
      return next;
    });
  };

  const handleRouteBulkAccept = (routeRecs: TrackingRecommendation[]) => {
    const pendingIds = routeRecs
      .filter((r) => r.status === 'PENDING')
      .map((r) => r.id);
    if (pendingIds.length > 0) {
      onBulkAccept(pendingIds);
    }
  };

  const getConfidenceColor = (confidence: number | null): string => {
    if (!confidence) return 'bg-gray-400';
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-2">
      {grouped.map((group) => {
        const isOpen = openRoutes.has(group.routePath);
        const isSiteWide = group.routePath === 'Site-wide';
        const totalCount = group.recommendations.length;
        const pendingCount =
          group.counts.critical +
          group.counts.important +
          group.counts.recommended +
          group.counts.optional;

        const pendingRecs = group.recommendations.filter((r) => r.status === 'PENDING' || r.status === 'REPAIR' || r.status === 'FAILED' || r.status === 'CREATED');
        const allPendingSelected = pendingRecs.length > 0 && pendingRecs.every((r) => selectedIds.has(r.id));
        const somePendingSelected = pendingRecs.some((r) => selectedIds.has(r.id)) && !allPendingSelected;

        // Get icon for page type
        const PageIcon = group.pageType ? pageTypeIcons[group.pageType] || FileText : FileText;

        return (
          <Collapsible
            key={group.routePath}
            open={isOpen}
            onOpenChange={() => toggleRoute(group.routePath)}
          >
            <div className="border rounded-lg overflow-hidden">
              <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Route-level checkbox */}
                  {pendingRecs.length > 0 && (
                    <Checkbox
                      checked={allPendingSelected}
                      onCheckedChange={(checked) => {
                        const pendingIds = pendingRecs.map((r) => r.id);
                        onSelectRoute(pendingIds, !!checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={somePendingSelected ? 'data-[state=checked]:bg-gray-400' : ''}
                    />
                  )}

                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-500" />
                  )}

                  {isSiteWide ? (
                    <Globe className="h-4 w-4 flex-shrink-0 text-blue-500" />
                  ) : (
                    <PageIcon className="h-4 w-4 flex-shrink-0 text-gray-500" />
                  )}

                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                    <span className="font-medium text-sm truncate">
                      {group.routePath}
                    </span>
                    {group.pageType && (
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {group.pageType}
                      </Badge>
                    )}
                    {group.pageCount > 1 && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {group.pageCount} pages
                      </span>
                    )}
                    {group.pageTitle && (
                      <span className="text-xs text-muted-foreground truncate">
                        {group.pageTitle}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Severity dots */}
                    <div className="flex items-center gap-1.5">
                      {group.counts.critical > 0 && (
                        <span className="flex items-center gap-0.5">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-xs text-red-600 font-medium">{group.counts.critical}</span>
                        </span>
                      )}
                      {group.counts.important > 0 && (
                        <span className="flex items-center gap-0.5">
                          <span className="w-2 h-2 rounded-full bg-orange-500" />
                          <span className="text-xs text-orange-600 font-medium">{group.counts.important}</span>
                        </span>
                      )}
                      {group.counts.recommended > 0 && (
                        <span className="flex items-center gap-0.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-xs text-blue-600 font-medium">{group.counts.recommended}</span>
                        </span>
                      )}
                      {group.counts.optional > 0 && (
                        <span className="flex items-center gap-0.5">
                          <span className="w-2 h-2 rounded-full bg-gray-400" />
                          <span className="text-xs text-gray-500 font-medium">{group.counts.optional}</span>
                        </span>
                      )}
                    </div>

                    {group.repairCount > 0 && (
                      <span className="text-sm text-orange-600">
                        {group.repairCount} needs repair
                      </span>
                    )}
                    {group.syncingCount > 0 && (
                      <span className="text-sm text-yellow-600">
                        {group.syncingCount} syncing
                      </span>
                    )}
                    {group.failedCount > 0 && (
                      <span className="text-sm text-red-500">
                        {group.failedCount} failed
                      </span>
                    )}
                    {pendingCount === 0 && totalCount > 0 && group.trackedCount > 0 && (
                      <span className="text-sm text-gray-500">
                        {group.trackedCount} tracked
                      </span>
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t bg-gray-50 px-4 py-3 space-y-3">
                  {/* Bulk actions */}
                  {pendingCount > 0 && (
                    <div className="flex items-center justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRouteBulkAccept(group.recommendations)}
                        disabled={isBulkAccepting}
                        className="flex-shrink-0"
                      >
                        <CheckCheck className="mr-1 h-3 w-3" />
                        Accept All Pending
                      </Button>
                    </div>
                  )}

                  {/* Recommendation cards */}
                  <div className="space-y-2">
                    {group.recommendations.map((rec) => {
                      const isActionable = rec.status === 'PENDING' || rec.status === 'REPAIR' || rec.status === 'FAILED' || rec.status === 'CREATED';
                      const isAccepting = acceptingId === rec.id;
                      const isRejecting = rejectingId === rec.id;
                      const isTracked = rec.status === 'CREATED';
                      const isCreating = rec.status === 'CREATING';
                      const isFailed = rec.status === 'FAILED';
                      const isRepair = rec.status === 'REPAIR';
                      const isRejected = rec.status === 'REJECTED';
                      const isSelected = selectedIds.has(rec.id);

                      const TrackingIcon = trackingTypeIcons[rec.trackingType] || FileText;

                      return (
                        <div
                          key={rec.id}
                          className={`bg-white border rounded-lg relative transition-colors ${
                            isTracked
                              ? 'border-green-200 bg-green-50/50'
                              : isRepair
                              ? 'border-orange-200 bg-orange-50/50'
                              : isCreating
                              ? 'border-yellow-200 bg-yellow-50/50'
                              : isFailed
                              ? 'border-red-200 bg-red-50/50'
                              : isRejected
                              ? 'border-gray-200 bg-gray-50 opacity-60'
                              : 'hover:border-gray-300'
                          }`}
                        >
                          {/* Severity color bar */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${severityBarColors[rec.severity]}`} />

                          <div className="flex items-start gap-3 pl-4 pr-3 py-3">
                            {/* Checkbox */}
                            <div className="flex-shrink-0 pt-0.5">
                              {isActionable ? (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => onToggleSelection(rec.id)}
                                  className={isTracked ? 'data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600' : ''}
                                />
                              ) : isCreating ? (
                                <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                              ) : isFailed ? (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <Checkbox checked={false} disabled className="opacity-50" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0 space-y-2">
                              {/* Header */}
                              <div className="flex items-start gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                                  <TrackingIcon className="h-3.5 w-3.5 flex-shrink-0 text-gray-600" />
                                  <span className="font-medium text-sm">{rec.name}</span>
                                  <SeverityBadge severity={rec.severity} />
                                  {isTracked && (
                                    <Badge variant="outline" className="bg-green-100 text-green-700 text-xs">
                                      <Check className="h-3 w-3 mr-0.5" /> Tracked
                                    </Badge>
                                  )}
                                  {isCreating && (
                                    <Badge variant="outline" className="bg-yellow-100 text-yellow-700 text-xs">
                                      <Loader2 className="h-3 w-3 mr-0.5 animate-spin" /> Syncing...
                                    </Badge>
                                  )}
                                  {isFailed && (
                                    <Badge variant="outline" className="bg-red-100 text-red-700 text-xs">
                                      <AlertCircle className="h-3 w-3 mr-0.5" /> Failed
                                    </Badge>
                                  )}
                                  {isRepair && (
                                    <Badge variant="outline" className="bg-orange-100 text-orange-700 text-xs">
                                      <Wrench className="h-3 w-3 mr-0.5" /> Needs Repair
                                    </Badge>
                                  )}
                                  {isRejected && (
                                    <Badge variant="outline" className="bg-red-100 text-red-700 text-xs">
                                      Rejected
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Description */}
                              {rec.description && (
                                <p className="text-sm text-muted-foreground">
                                  {rec.description}
                                </p>
                              )}

                              {/* Metadata row */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {rec.selector && (
                                  <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono max-w-[200px] truncate inline-block">
                                    {rec.selector}
                                  </code>
                                )}
                                {rec.suggestedGA4EventName && (
                                  <Badge variant="secondary" className="text-xs">
                                    {rec.suggestedGA4EventName}
                                  </Badge>
                                )}
                                {rec.selectorConfidence !== null && (
                                  <div className="flex items-center gap-1">
                                    <span className={`w-2 h-2 rounded-full ${getConfidenceColor(rec.selectorConfidence)}`} />
                                    <span className="text-xs text-muted-foreground">
                                      {Math.round((rec.selectorConfidence || 0) * 100)}%
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Severity reason */}
                              {rec.severityReason && (
                                <p className="text-xs text-muted-foreground italic">
                                  {rec.severityReason}
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            {isActionable && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onAccept(rec.id)}
                                  disabled={isAccepting || isRejecting}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onReject(rec.id)}
                                  disabled={isAccepting || isRejecting}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}

      {grouped.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No recommendations found.
        </div>
      )}
    </div>
  );
}
