'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Loader2, MapIcon, ListChecks, Zap } from 'lucide-react';
import { ScanSummary, TrackingRecommendation } from '@/types/site-scanner';
import {
  useRecommendations,
  useAcceptRecommendation,
  useRejectRecommendation,
  useBulkAcceptRecommendations,
  useBulkCreateTrackings,
} from '@/hooks/use-site-scanner';
import { TrackingReadinessScore } from './TrackingReadinessScore';
import { TechnologyDetection } from './TechnologyDetection';
import { RecommendationsList } from './RecommendationsList';
import { RouteRecommendationTree } from './RouteRecommendationTree';
import { RecommendationFilters, FilterState } from './RecommendationFilters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

interface ScanResultsProps {
  customerId: string;
  scan: ScanSummary;
  onCreateTracking?: (recommendation: TrackingRecommendation) => void;
  hasGoogleConnected?: boolean;
}

export function ScanResults({ customerId, scan, onCreateTracking, hasGoogleConnected }: ScanResultsProps) {
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    severities: [],
    trackingTypes: [],
    funnelStage: null,
    search: '',
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCreateProgress, setBulkCreateProgress] = useState<{ current: number; total: number } | null>(null);

  const { data: recommendations, isLoading: loadingRecs } = useRecommendations(
    customerId,
    scan.id,
  );

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const filteredRecommendations = useMemo(() => {
    if (!recommendations) return [];
    return recommendations.filter((rec) => {
      if (filters.severities.length > 0 && !filters.severities.includes(rec.severity)) return false;
      if (filters.trackingTypes.length > 0 && !filters.trackingTypes.includes(rec.trackingType)) return false;
      if (filters.funnelStage && rec.funnelStage !== filters.funnelStage) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchesName = rec.name?.toLowerCase().includes(q);
        const matchesUrl = rec.pageUrl?.toLowerCase().includes(q);
        const matchesDesc = rec.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesUrl && !matchesDesc) return false;
      }
      return true;
    });
  }, [recommendations, filters]);

  const acceptMutation = useAcceptRecommendation();
  const rejectMutation = useRejectRecommendation();
  const bulkAcceptMutation = useBulkAcceptRecommendations();
  const bulkCreateMutation = useBulkCreateTrackings();

  // Auto-select all PENDING recommendations when they load
  useEffect(() => {
    if (recommendations && selectedIds.size === 0) {
      const pendingIds = new Set(
        recommendations
          .filter(r => r.status === 'PENDING')
          .map(r => r.id)
      );
      if (pendingIds.size > 0) {
        setSelectedIds(pendingIds);
      }
    }
  }, [recommendations, selectedIds.size]);

  const handleAccept = async (id: string) => {
    setAcceptingId(id);
    try {
      await acceptMutation.mutateAsync({ customerId, scanId: scan.id, recommendationId: id });
    } finally {
      setAcceptingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setRejectingId(id);
    try {
      await rejectMutation.mutateAsync({ customerId, scanId: scan.id, recommendationId: id });
    } finally {
      setRejectingId(null);
    }
  };

  const handleBulkAccept = async (ids: string[]) => {
    await bulkAcceptMutation.mutateAsync({
      customerId,
      scanId: scan.id,
      data: { recommendationIds: ids },
    });
  };

  const handleToggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectRoute = useCallback((ids: string[], selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => {
        if (selected) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!recommendations) return;
    const pendingIds = recommendations.filter(r => r.status === 'PENDING').map(r => r.id);
    setSelectedIds(new Set(pendingIds));
  }, [recommendations]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkCreate = useCallback(async () => {
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    setBulkCreateProgress({ current: 0, total: ids.length });

    try {
      const result = await bulkCreateMutation.mutateAsync({
        customerId,
        scanId: scan.id,
        recommendationIds: ids,
      });

      setBulkCreateProgress(null);
      setSelectedIds(new Set());

      alert(`Successfully created ${result.created} tracking${result.created !== 1 ? 's' : ''}${result.failed > 0 ? `. ${result.failed} failed.` : '.'}`);
    } catch (err) {
      setBulkCreateProgress(null);
      alert(`Failed to create trackings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [selectedIds, customerId, scan.id, bulkCreateMutation]);

  const counts = scan.recommendationCounts || { critical: 0, important: 0, recommended: 0, optional: 0 };

  const pendingCount = useMemo(() =>
    recommendations?.filter(r => r.status === 'PENDING').length || 0,
    [recommendations]
  );

  const trackedCount = useMemo(() =>
    recommendations?.filter(r => r.status === 'CREATED').length || 0,
    [recommendations]
  );

  // Calculate coverage
  const scanPages = scan.pages || [];
  const totalRoutesDiscovered = scan.totalUrlsFound || 0;
  const pagesScanned = scanPages.length;
  const coveragePercent = totalRoutesDiscovered > 0
    ? Math.round((pagesScanned / totalRoutesDiscovered) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Coverage Banner */}
      {totalRoutesDiscovered > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapIcon className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-900">Site Coverage</h3>
                <p className="text-sm text-blue-700">
                  Explored {pagesScanned} of {totalRoutesDiscovered} discovered routes ({coveragePercent}% coverage)
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{coveragePercent}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Readiness score */}
        {scan.trackingReadinessScore !== null && (
          <div className="lg:col-span-2">
            <TrackingReadinessScore
              score={scan.trackingReadinessScore}
              narrative={scan.readinessNarrative}
            />
          </div>
        )}

        {/* Severity counts */}
        <div className="bg-white rounded-lg border p-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{counts.critical}</p>
              <p className="text-xs text-muted-foreground">Critical</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{counts.important}</p>
              <p className="text-xs text-muted-foreground">Important</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{counts.recommended}</p>
              <p className="text-xs text-muted-foreground">Recommended</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-500">{counts.optional}</p>
              <p className="text-xs text-muted-foreground">Optional</p>
            </div>
          </div>
        </div>

        {/* Scan info */}
        <div className="bg-white rounded-lg border p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Niche</span>
              <span className="font-medium capitalize">{scan.confirmedNiche || scan.detectedNiche || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pages</span>
              <span className="font-medium">{scan.totalPagesScanned || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">AI Used</span>
              <span className="font-medium">{scan.aiAnalysisUsed ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Technologies */}
      <TechnologyDetection
        technologies={scan.detectedTechnologies}
        existingTracking={scan.existingTracking}
      />

      {/* Tabs: Route Map (default), All Recommendations, Explored Routes */}
      <Tabs defaultValue="route-map" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="route-map" className="flex items-center gap-2">
            <MapIcon className="h-4 w-4" />
            Route Map ({scanPages.length})
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            All Recommendations ({scan.totalRecommendations || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="route-map" className="mt-4 space-y-4">
          {loadingRecs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <RecommendationFilters
                onFilterChange={handleFilterChange}
                counts={counts}
              />
              <RouteRecommendationTree
                recommendations={filteredRecommendations}
                scanPages={scanPages}
                onAccept={handleAccept}
                onReject={handleReject}
                onBulkAccept={handleBulkAccept}
                onCreateTracking={onCreateTracking}
                acceptingId={acceptingId}
                rejectingId={rejectingId}
                isBulkAccepting={bulkAcceptMutation.isPending}
                selectedIds={selectedIds}
                onToggleSelection={handleToggleSelection}
                onSelectRoute={handleSelectRoute}
              />

              {/* Floating action bar */}
              {pendingCount > 0 && (
                <div className="sticky bottom-4 z-10">
                  <div className="bg-white border-2 border-gray-200 rounded-xl shadow-lg p-4 mx-auto max-w-2xl">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedIds.size > 0 && selectedIds.size === pendingCount}
                          onCheckedChange={(checked) => {
                            if (checked) handleSelectAll();
                            else handleDeselectAll();
                          }}
                        />
                        <div>
                          <span className="text-sm font-medium">
                            {selectedIds.size} selected
                          </span>
                          {trackedCount > 0 && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({trackedCount} already tracked)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSelectAll}
                          className="text-xs"
                        >
                          Select All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDeselectAll}
                          className="text-xs"
                        >
                          Deselect
                        </Button>

                        <Button
                          onClick={handleBulkCreate}
                          disabled={selectedIds.size === 0 || bulkCreateMutation.isPending || !hasGoogleConnected}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md"
                          size="lg"
                          title={!hasGoogleConnected ? 'Connect Google account first' : undefined}
                        >
                          {bulkCreateMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4 mr-2" />
                              OneClickTag ({selectedIds.size})
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="mt-4">
          <div className="bg-white rounded-lg border p-4">
            {loadingRecs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : recommendations && recommendations.length > 0 ? (
              <RecommendationsList
                recommendations={recommendations}
                onAccept={handleAccept}
                onReject={handleReject}
                onBulkAccept={handleBulkAccept}
                onCreateTracking={onCreateTracking}
                acceptingId={acceptingId}
                rejectingId={rejectingId}
                isBulkAccepting={bulkAcceptMutation.isPending}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recommendations found.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Site Map - Keep for backwards compatibility */}
      {scan.siteMap && Object.keys(scan.siteMap).length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Site Structure</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(scan.siteMap).map(([type, pages]) => (
              <div key={type} className="border rounded p-3">
                <h4 className="text-sm font-medium capitalize mb-1">
                  {type} <span className="text-muted-foreground font-normal">({(pages as any[]).length})</span>
                </h4>
                <div className="space-y-1">
                  {(pages as any[]).slice(0, 5).map((page: any, i: number) => (
                    <div key={i} className="text-xs text-muted-foreground truncate">
                      {page.title || new URL(page.url).pathname}
                    </div>
                  ))}
                  {(pages as any[]).length > 5 && (
                    <div className="text-xs text-muted-foreground">
                      +{(pages as any[]).length - 5} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
