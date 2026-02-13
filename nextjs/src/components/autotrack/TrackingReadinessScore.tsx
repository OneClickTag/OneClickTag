'use client';

interface TrackingReadinessScoreProps {
  score: number;
  narrative?: string | null;
}

export function TrackingReadinessScore({ score, narrative }: TrackingReadinessScoreProps) {
  const getColor = () => {
    if (score >= 80) return { stroke: '#22c55e', text: 'text-green-600', bg: 'bg-green-50' };
    if (score >= 60) return { stroke: '#3b82f6', text: 'text-blue-600', bg: 'bg-blue-50' };
    if (score >= 40) return { stroke: '#f59e0b', text: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { stroke: '#ef4444', text: 'text-red-600', bg: 'bg-red-50' };
  };

  const color = getColor();
  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className={`${color.bg} rounded-lg border p-4`}>
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
            <circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke={color.stroke}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-lg font-bold ${color.text}`}>{score}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Tracking Readiness</h3>
          {narrative && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{narrative}</p>
          )}
        </div>
      </div>
    </div>
  );
}
