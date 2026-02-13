'use client';

import { useState, useMemo } from 'react';
import { CheckCheck, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  TrackingRecommendation,
  RecommendationSeverity,
} from '@/types/site-scanner';
import { RecommendationCard } from './RecommendationCard';

interface RecommendationsListProps {
  recommendations: TrackingRecommendation[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onBulkAccept: (ids: string[]) => void;
  onCreateTracking?: (recommendation: TrackingRecommendation) => void;
  acceptingId: string | null;
  rejectingId: string | null;
  isBulkAccepting: boolean;
}

const severityOrder: Record<RecommendationSeverity, number> = {
  CRITICAL: 0,
  IMPORTANT: 1,
  RECOMMENDED: 2,
  OPTIONAL: 3,
};

export function RecommendationsList({
  recommendations,
  onAccept,
  onReject,
  onBulkAccept,
  onCreateTracking,
  acceptingId,
  rejectingId,
  isBulkAccepting,
}: RecommendationsListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [severityFilter, setSeverityFilter] = useState<RecommendationSeverity | 'ALL'>('ALL');

  const filtered = useMemo(() => {
    let result = [...recommendations];
    if (severityFilter !== 'ALL') {
      result = result.filter(r => r.severity === severityFilter);
    }
    result.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    return result;
  }, [recommendations, severityFilter]);

  const pendingCount = recommendations.filter(r => r.status === 'PENDING').length;
  const counts = useMemo(() => {
    const c = { CRITICAL: 0, IMPORTANT: 0, RECOMMENDED: 0, OPTIONAL: 0 };
    recommendations.forEach(r => { if (r.status === 'PENDING') c[r.severity]++; });
    return c;
  }, [recommendations]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const pendingIds = filtered.filter(r => r.status === 'PENDING').map(r => r.id);
    setSelectedIds(new Set(pendingIds));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkAccept = () => {
    if (selectedIds.size > 0) {
      onBulkAccept(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <button
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              severityFilter === 'ALL' ? 'bg-gray-900 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
            onClick={() => setSeverityFilter('ALL')}
          >
            All ({pendingCount})
          </button>
          {(['CRITICAL', 'IMPORTANT', 'RECOMMENDED', 'OPTIONAL'] as const).map(sev => (
            <button
              key={sev}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                severityFilter === sev ? 'bg-gray-900 text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => setSeverityFilter(sev)}
            >
              {sev.charAt(0) + sev.slice(1).toLowerCase()} ({counts[sev]})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 ? (
            <>
              <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear
              </Button>
              <Button size="sm" onClick={handleBulkAccept} disabled={isBulkAccepting}>
                <CheckCheck className="mr-1 h-4 w-4" />
                Accept Selected
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All Pending
            </Button>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-2">
        {filtered.map(rec => (
          <RecommendationCard
            key={rec.id}
            recommendation={rec}
            onAccept={onAccept}
            onReject={onReject}
            onCreateTracking={onCreateTracking}
            isAccepting={acceptingId === rec.id}
            isRejecting={rejectingId === rec.id}
            selected={selectedIds.has(rec.id)}
            onToggleSelect={toggleSelect}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No recommendations found for this filter.
        </div>
      )}
    </div>
  );
}
