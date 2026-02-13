'use client';

import { Check, X, ExternalLink, Code, Target, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrackingRecommendation } from '@/types/site-scanner';
import { SeverityBadge } from './SeverityBadge';

interface RecommendationCardProps {
  recommendation: TrackingRecommendation;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onCreateTracking?: (recommendation: TrackingRecommendation) => void;
  isAccepting: boolean;
  isRejecting: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

const funnelColors: Record<string, string> = {
  top: 'bg-blue-50 text-blue-700',
  middle: 'bg-yellow-50 text-yellow-700',
  bottom: 'bg-green-50 text-green-700',
};

export function RecommendationCard({
  recommendation: rec,
  onAccept,
  onReject,
  onCreateTracking,
  isAccepting,
  isRejecting,
  selected,
  onToggleSelect,
}: RecommendationCardProps) {
  const isActionable = rec.status === 'PENDING';

  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${
        rec.status === 'ACCEPTED'
          ? 'bg-green-50 border-green-200'
          : rec.status === 'REJECTED'
          ? 'bg-gray-50 border-gray-200 opacity-60'
          : selected
          ? 'bg-indigo-50 border-indigo-200'
          : 'bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Select checkbox */}
        {isActionable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(rec.id)}
            className="mt-1 rounded"
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityBadge severity={rec.severity} />
            <span className="font-medium text-sm">{rec.name}</span>
            <Badge variant="outline" className="text-xs">
              {rec.trackingType.replace(/_/g, ' ')}
            </Badge>
            {rec.funnelStage && (
              <Badge
                variant="outline"
                className={`text-xs ${funnelColors[rec.funnelStage] || ''}`}
              >
                {rec.funnelStage} funnel
              </Badge>
            )}
            {rec.aiGenerated && (
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600">
                AI
              </Badge>
            )}
            {rec.status !== 'PENDING' && (
              <Badge
                variant="outline"
                className={`text-xs ${
                  rec.status === 'ACCEPTED'
                    ? 'bg-green-100 text-green-700'
                    : rec.status === 'REJECTED'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {rec.status.toLowerCase()}
              </Badge>
            )}
          </div>

          {/* Description */}
          {rec.description && (
            <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
          )}

          {/* Details row */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {rec.selector && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Code className="h-3 w-3" />
                <code className="bg-gray-100 px-1 rounded truncate max-w-[200px]">
                  {rec.selector}
                </code>
                {rec.selectorConfidence && (
                  <span className="text-muted-foreground">
                    ({Math.round(rec.selectorConfidence * 100)}%)
                  </span>
                )}
              </div>
            )}
            {rec.pageUrl && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ExternalLink className="h-3 w-3" />
                <span className="truncate max-w-[200px]">
                  {(() => { try { return new URL(rec.pageUrl).pathname; } catch { return rec.pageUrl; } })()}
                </span>
              </div>
            )}
            {rec.suggestedGA4EventName && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Target className="h-3 w-3" />
                <code className="bg-gray-100 px-1 rounded">{rec.suggestedGA4EventName}</code>
              </div>
            )}
          </div>

          {/* Severity reason */}
          {rec.severityReason && (
            <p className="text-xs text-muted-foreground mt-1 italic">{rec.severityReason}</p>
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
        {rec.status === 'ACCEPTED' && !rec.trackingId && onCreateTracking && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCreateTracking(rec)}
            className="flex-shrink-0"
          >
            <Plus className="mr-1 h-3 w-3" />
            Create Tracking
          </Button>
        )}
      </div>
    </div>
  );
}
