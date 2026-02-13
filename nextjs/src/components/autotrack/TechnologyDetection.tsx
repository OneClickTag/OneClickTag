'use client';

import { Badge } from '@/components/ui/badge';
import { DetectedTechnology, ExistingTracking } from '@/types/site-scanner';

interface TechnologyDetectionProps {
  technologies: DetectedTechnology[] | null;
  existingTracking: ExistingTracking[] | null;
}

const categoryColors: Record<string, string> = {
  analytics: 'bg-blue-100 text-blue-700',
  cms: 'bg-purple-100 text-purple-700',
  framework: 'bg-green-100 text-green-700',
  tracking: 'bg-yellow-100 text-yellow-700',
  advertising: 'bg-red-100 text-red-700',
  other: 'bg-gray-100 text-gray-700',
};

export function TechnologyDetection({ technologies, existingTracking }: TechnologyDetectionProps) {
  const hasTech = technologies && technologies.length > 0;
  const hasTracking = existingTracking && existingTracking.length > 0;

  if (!hasTech && !hasTracking) return null;

  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      {hasTech && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Technologies</h4>
          <div className="flex flex-wrap gap-1.5">
            {technologies.map((tech, i) => (
              <Badge
                key={i}
                variant="outline"
                className={`text-xs ${categoryColors[tech.category] || categoryColors.other}`}
              >
                {tech.name}
                {tech.version && <span className="ml-1 opacity-60">{tech.version}</span>}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {hasTracking && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
            Existing Tracking
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {existingTracking.map((track, i) => (
              <Badge key={i} variant="outline" className="text-xs bg-emerald-50 text-emerald-700">
                {track.provider}
                {track.details && <span className="ml-1 opacity-60">({track.details})</span>}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
