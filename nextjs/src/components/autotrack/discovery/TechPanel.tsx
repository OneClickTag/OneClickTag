'use client';

import { Badge } from '@/components/ui/badge';
import { LiveDiscovery } from '@/types/site-scanner';
import { Monitor, BarChart3, ShoppingCart, Globe, Server } from 'lucide-react';

interface TechPanelProps {
  discovery: LiveDiscovery;
}

export function TechPanel({ discovery }: TechPanelProps) {
  const { technologies } = discovery;
  const hasAny = technologies.cms || technologies.framework || technologies.ecommerce || technologies.analytics.length > 0 || technologies.cdn;

  if (!hasAny) return null;

  const rows: Array<{ icon: React.ReactNode; label: string; value: string; color: string }> = [];
  if (technologies.cms) {
    rows.push({ icon: <Monitor className="h-3.5 w-3.5" />, label: 'CMS', value: technologies.cms, color: 'bg-purple-100 text-purple-700' });
  }
  if (technologies.framework) {
    rows.push({ icon: <Globe className="h-3.5 w-3.5" />, label: 'Framework', value: technologies.framework, color: 'bg-green-100 text-green-700' });
  }
  if (technologies.ecommerce) {
    rows.push({ icon: <ShoppingCart className="h-3.5 w-3.5" />, label: 'E-Commerce', value: technologies.ecommerce, color: 'bg-orange-100 text-orange-700' });
  }
  if (technologies.cdn) {
    rows.push({ icon: <Server className="h-3.5 w-3.5" />, label: 'CDN', value: technologies.cdn, color: 'bg-gray-100 text-gray-700' });
  }

  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      <h4 className="text-xs font-medium text-muted-foreground uppercase">Tech Stack</h4>

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className="flex items-center gap-2"
            style={{
              animation: `fadeSlideIn 0.3s ease-out ${i * 80}ms both`,
            }}
          >
            <span className="text-muted-foreground">{row.icon}</span>
            <span className="text-xs text-muted-foreground w-16">{row.label}</span>
            <Badge variant="outline" className={`text-xs ${row.color}`}>{row.value}</Badge>
          </div>
        ))}
        {technologies.analytics.length > 0 && (
          <div
            className="flex items-start gap-2"
            style={{
              animation: `fadeSlideIn 0.3s ease-out ${rows.length * 80}ms both`,
            }}
          >
            <BarChart3 className="h-3.5 w-3.5 mt-1 text-muted-foreground" />
            <div className="flex flex-wrap gap-1">
              {technologies.analytics.map((name, i) => (
                <Badge key={i} variant="outline" className="text-xs bg-blue-100 text-blue-700">
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
