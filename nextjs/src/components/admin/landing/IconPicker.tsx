'use client';

import { useState } from 'react';
import {
  Zap,
  Target,
  BarChart3,
  Sparkles,
  Tag,
  Shield,
  Globe,
  MousePointerClick,
  Link2,
  Rocket,
  CheckCircle2,
  Users,
  Clock,
  TrendingUp,
  Star,
  ArrowRight,
  Check,
  Heart,
  Mail,
  Phone,
  Settings,
  Search,
  Home,
  FileText,
  Image,
  Video,
  Music,
  Download,
  Upload,
  Share2,
  MessageCircle,
  Bell,
  Calendar,
  Map,
  Award,
  Gift,
  ShoppingCart,
  CreditCard,
  Wallet,
  PieChart,
  Activity,
  Layers,
  Box,
  Package,
  Truck,
  Building,
  Briefcase,
  GraduationCap,
  Lightbulb,
  Puzzle,
  Cpu,
  Database,
  Cloud,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ThumbsUp,
  ThumbsDown,
  LucideIcon,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Icon registry with categories
const iconRegistry: Record<string, { icon: LucideIcon; category: string }> = {
  // Actions
  Zap: { icon: Zap, category: 'Actions' },
  Target: { icon: Target, category: 'Actions' },
  Rocket: { icon: Rocket, category: 'Actions' },
  Search: { icon: Search, category: 'Actions' },
  Download: { icon: Download, category: 'Actions' },
  Upload: { icon: Upload, category: 'Actions' },
  Share2: { icon: Share2, category: 'Actions' },

  // Analytics
  BarChart3: { icon: BarChart3, category: 'Analytics' },
  TrendingUp: { icon: TrendingUp, category: 'Analytics' },
  PieChart: { icon: PieChart, category: 'Analytics' },
  Activity: { icon: Activity, category: 'Analytics' },

  // Communication
  MessageCircle: { icon: MessageCircle, category: 'Communication' },
  Mail: { icon: Mail, category: 'Communication' },
  Phone: { icon: Phone, category: 'Communication' },
  Bell: { icon: Bell, category: 'Communication' },

  // E-commerce
  ShoppingCart: { icon: ShoppingCart, category: 'E-commerce' },
  CreditCard: { icon: CreditCard, category: 'E-commerce' },
  Wallet: { icon: Wallet, category: 'E-commerce' },
  Package: { icon: Package, category: 'E-commerce' },
  Truck: { icon: Truck, category: 'E-commerce' },
  Gift: { icon: Gift, category: 'E-commerce' },

  // General
  Star: { icon: Star, category: 'General' },
  Heart: { icon: Heart, category: 'General' },
  CheckCircle2: { icon: CheckCircle2, category: 'General' },
  Check: { icon: Check, category: 'General' },
  ThumbsUp: { icon: ThumbsUp, category: 'General' },
  ThumbsDown: { icon: ThumbsDown, category: 'General' },
  Award: { icon: Award, category: 'General' },
  Sparkles: { icon: Sparkles, category: 'General' },
  Lightbulb: { icon: Lightbulb, category: 'General' },

  // Navigation
  Home: { icon: Home, category: 'Navigation' },
  ArrowRight: { icon: ArrowRight, category: 'Navigation' },
  Link2: { icon: Link2, category: 'Navigation' },
  Map: { icon: Map, category: 'Navigation' },
  Globe: { icon: Globe, category: 'Navigation' },

  // Media
  Image: { icon: Image, category: 'Media' },
  Video: { icon: Video, category: 'Media' },
  Music: { icon: Music, category: 'Media' },
  FileText: { icon: FileText, category: 'Media' },

  // Security
  Shield: { icon: Shield, category: 'Security' },
  Lock: { icon: Lock, category: 'Security' },
  Unlock: { icon: Unlock, category: 'Security' },
  Eye: { icon: Eye, category: 'Security' },
  EyeOff: { icon: EyeOff, category: 'Security' },

  // Tech
  Settings: { icon: Settings, category: 'Tech' },
  Cpu: { icon: Cpu, category: 'Tech' },
  Database: { icon: Database, category: 'Tech' },
  Cloud: { icon: Cloud, category: 'Tech' },
  Layers: { icon: Layers, category: 'Tech' },
  Box: { icon: Box, category: 'Tech' },
  Puzzle: { icon: Puzzle, category: 'Tech' },

  // Business
  Users: { icon: Users, category: 'Business' },
  Building: { icon: Building, category: 'Business' },
  Briefcase: { icon: Briefcase, category: 'Business' },
  Calendar: { icon: Calendar, category: 'Business' },
  Clock: { icon: Clock, category: 'Business' },
  GraduationCap: { icon: GraduationCap, category: 'Business' },

  // UI Elements
  Tag: { icon: Tag, category: 'UI' },
  MousePointerClick: { icon: MousePointerClick, category: 'UI' },
};

// Get icon component by name
export function getIconByName(name: string): LucideIcon | null {
  const entry = iconRegistry[name];
  return entry?.icon || null;
}

// Get all icon names
export function getAllIconNames(): string[] {
  return Object.keys(iconRegistry);
}

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const SelectedIcon = getIconByName(value) || Zap;

  const filteredIcons = Object.entries(iconRegistry).filter(([name]) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  // Group icons by category
  const groupedIcons = filteredIcons.reduce((acc, [name, { icon, category }]) => {
    if (!acc[category]) acc[category] = [];
    acc[category].push({ name, icon });
    return acc;
  }, {} as Record<string, { name: string; icon: LucideIcon }[]>);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start gap-2 h-10',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <SelectedIcon className="h-4 w-4" />
          <span>{value || 'Select icon...'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Search icons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {Object.entries(groupedIcons).map(([category, icons]) => (
            <div key={category} className="mb-3">
              <div className="text-xs font-semibold text-muted-foreground mb-1 px-1">
                {category}
              </div>
              <div className="grid grid-cols-6 gap-1">
                {icons.map(({ name, icon: Icon }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      onChange(name);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      'p-2 rounded hover:bg-accent flex items-center justify-center',
                      value === name && 'bg-accent ring-2 ring-primary'
                    )}
                    title={name}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filteredIcons.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">
              No icons found
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
