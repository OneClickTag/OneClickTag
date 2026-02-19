'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { LiveDiscovery } from '@/types/site-scanner';
import {
  FileText,
  MousePointerClick,
  ShoppingCart,
  Package,
  CreditCard,
  LogIn,
  Video,
  Phone,
  Mail,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface PriorityElementsPanelProps {
  discovery: LiveDiscovery;
}

interface ElementGroup {
  key: string;
  label: string;
  icon: React.ReactNode;
  count: number;
  items: Array<{ label: string; detail?: string }>;
  color: string;
}

export function PriorityElementsPanel({ discovery }: PriorityElementsPanelProps) {
  const { priorityElements } = discovery;

  const groups: ElementGroup[] = [
    {
      key: 'forms',
      label: 'Forms',
      icon: <FileText className="h-3.5 w-3.5" />,
      count: priorityElements.forms.length,
      items: priorityElements.forms.map(f => ({ label: f.type, detail: tryPathname(f.url) })),
      color: 'text-red-600 bg-red-50',
    },
    {
      key: 'ctas',
      label: 'CTAs',
      icon: <MousePointerClick className="h-3.5 w-3.5" />,
      count: priorityElements.ctas.length,
      items: priorityElements.ctas.map(c => ({ label: c.text, detail: tryPathname(c.url) })),
      color: 'text-orange-600 bg-orange-50',
    },
    {
      key: 'cartPages',
      label: 'Cart Pages',
      icon: <ShoppingCart className="h-3.5 w-3.5" />,
      count: priorityElements.cartPages.length,
      items: priorityElements.cartPages.map(u => ({ label: tryPathname(u) })),
      color: 'text-amber-600 bg-amber-50',
    },
    {
      key: 'productPages',
      label: 'Product Pages',
      icon: <Package className="h-3.5 w-3.5" />,
      count: priorityElements.productPages.length,
      items: priorityElements.productPages.map(u => ({ label: tryPathname(u) })),
      color: 'text-blue-600 bg-blue-50',
    },
    {
      key: 'checkoutPages',
      label: 'Checkout',
      icon: <CreditCard className="h-3.5 w-3.5" />,
      count: priorityElements.checkoutPages.length,
      items: priorityElements.checkoutPages.map(u => ({ label: tryPathname(u) })),
      color: 'text-green-600 bg-green-50',
    },
    {
      key: 'loginPages',
      label: 'Login Pages',
      icon: <LogIn className="h-3.5 w-3.5" />,
      count: priorityElements.loginPages.length,
      items: priorityElements.loginPages.map(u => ({ label: tryPathname(u) })),
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      key: 'videoEmbeds',
      label: 'Videos',
      icon: <Video className="h-3.5 w-3.5" />,
      count: priorityElements.videoEmbeds.length,
      items: priorityElements.videoEmbeds.map(v => ({ label: v.platform || 'Video', detail: tryPathname(v.url) })),
      color: 'text-pink-600 bg-pink-50',
    },
    {
      key: 'phoneLinks',
      label: 'Phone Links',
      icon: <Phone className="h-3.5 w-3.5" />,
      count: priorityElements.phoneLinks.length,
      items: priorityElements.phoneLinks.map(p => ({ label: p.number, detail: tryPathname(p.url) })),
      color: 'text-teal-600 bg-teal-50',
    },
    {
      key: 'emailLinks',
      label: 'Email Links',
      icon: <Mail className="h-3.5 w-3.5" />,
      count: priorityElements.emailLinks.length,
      items: priorityElements.emailLinks.map(e => ({ label: e.email, detail: tryPathname(e.url) })),
      color: 'text-cyan-600 bg-cyan-50',
    },
  ].filter(g => g.count > 0);

  if (groups.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border p-4 space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground uppercase">Priority Elements</h4>
      <div className="space-y-1">
        {groups.map((group, i) => (
          <div
            key={group.key}
            style={{
              animation: `fadeSlideIn 0.3s ease-out ${i * 60}ms both`,
            }}
          >
            <ElementGroupRow group={group} />
          </div>
        ))}
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

function ElementGroupRow({ group }: { group: ElementGroup }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        className="w-full flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="transition-transform duration-200" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </span>
        <span className={group.color.split(' ')[0]}>{group.icon}</span>
        <span className="text-sm flex-1">{group.label}</span>
        <Badge variant="outline" className={`text-xs ${group.color}`}>
          {group.count}
        </Badge>
      </button>
      <div
        className="overflow-hidden transition-all duration-200 ease-out"
        style={{
          maxHeight: expanded ? `${Math.min(group.items.length, 10) * 24 + 16}px` : '0px',
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="ml-8 mt-1 mb-2 space-y-0.5">
          {group.items.slice(0, 10).map((item, i) => (
            <div key={i} className="text-xs text-muted-foreground truncate">
              <span className="font-medium text-foreground">{item.label}</span>
              {item.detail && <span className="ml-1.5 opacity-60">{item.detail}</span>}
            </div>
          ))}
          {group.items.length > 10 && (
            <div className="text-xs text-muted-foreground">+{group.items.length - 10} more</div>
          )}
        </div>
      </div>
    </div>
  );
}

function tryPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
