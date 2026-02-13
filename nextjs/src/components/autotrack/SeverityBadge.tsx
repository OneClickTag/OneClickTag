'use client';

import { Badge } from '@/components/ui/badge';
import { RecommendationSeverity } from '@/types/site-scanner';

const severityConfig: Record<
  RecommendationSeverity,
  { label: string; className: string }
> = {
  CRITICAL: {
    label: 'Critical',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  IMPORTANT: {
    label: 'Important',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  RECOMMENDED: {
    label: 'Recommended',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  OPTIONAL: {
    label: 'Optional',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
};

interface SeverityBadgeProps {
  severity: RecommendationSeverity;
  size?: 'sm' | 'md';
}

export function SeverityBadge({ severity, size = 'sm' }: SeverityBadgeProps) {
  const config = severityConfig[severity];
  return (
    <Badge
      variant="outline"
      className={`${config.className} ${size === 'sm' ? 'text-xs px-1.5 py-0' : 'text-sm px-2 py-0.5'}`}
    >
      {config.label}
    </Badge>
  );
}
