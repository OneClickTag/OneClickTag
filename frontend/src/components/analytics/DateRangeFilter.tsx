import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DateRange } from '@/types/analytics.types';

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (dateRange: DateRange) => void;
  className?: string;
}

const presetRanges = [
  {
    label: 'Today',
    getValue: () => {
      const today = new Date().toISOString().split('T')[0];
      return { from: today, to: today };
    },
  },
  {
    label: 'Yesterday',
    getValue: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const date = yesterday.toISOString().split('T')[0];
      return { from: date, to: date };
    },
  },
  {
    label: 'Last 7 days',
    getValue: () => {
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      return {
        from: weekAgo.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      };
    },
  },
  {
    label: 'Last 30 days',
    getValue: () => {
      const today = new Date();
      const monthAgo = new Date();
      monthAgo.setDate(today.getDate() - 30);
      return {
        from: monthAgo.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      };
    },
  },
  {
    label: 'Last 90 days',
    getValue: () => {
      const today = new Date();
      const quarterAgo = new Date();
      quarterAgo.setDate(today.getDate() - 90);
      return {
        from: quarterAgo.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      };
    },
  },
  {
    label: 'This month',
    getValue: () => {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        from: firstDay.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      };
    },
  },
  {
    label: 'Last month',
    getValue: () => {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        from: firstDay.toISOString().split('T')[0],
        to: lastDay.toISOString().split('T')[0],
      };
    },
  },
];

export function DateRangeFilter({ value, onChange, className = '' }: DateRangeFilterProps) {
  const [isCustom, setIsCustom] = React.useState(false);

  const handlePresetSelect = (preset: typeof presetRanges[0]) => {
    const range = preset.getValue();
    onChange(range);
    setIsCustom(false);
  };

  const handleCustomDateChange = (field: 'from' | 'to', date: string) => {
    onChange({
      ...value,
      [field]: date,
    });
  };

  const formatDateRange = () => {
    const fromDate = new Date(value.from);
    const toDate = new Date(value.to);
    
    if (value.from === value.to) {
      return fromDate.toLocaleDateString();
    }
    
    return `${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}`;
  };

  const getCurrentPreset = () => {
    const preset = presetRanges.find(preset => {
      const range = preset.getValue();
      return range.from === value.from && range.to === value.to;
    });
    return preset?.label || 'Custom Range';
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Calendar className="h-4 w-4 text-gray-500" />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-48 justify-between">
            <span className="truncate">{getCurrentPreset()}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {presetRanges.map((preset) => (
            <DropdownMenuItem
              key={preset.label}
              onClick={() => handlePresetSelect(preset)}
            >
              {preset.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => setIsCustom(true)}>
            Custom Range...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {(isCustom || getCurrentPreset() === 'Custom Range') && (
        <div className="flex items-center space-x-2 ml-4">
          <div>
            <Label htmlFor="fromDate" className="sr-only">From Date</Label>
            <Input
              id="fromDate"
              type="date"
              value={value.from}
              onChange={(e) => handleCustomDateChange('from', e.target.value)}
              className="w-36"
            />
          </div>
          <span className="text-gray-500">to</span>
          <div>
            <Label htmlFor="toDate" className="sr-only">To Date</Label>
            <Input
              id="toDate"
              type="date"
              value={value.to}
              onChange={(e) => handleCustomDateChange('to', e.target.value)}
              className="w-36"
            />
          </div>
        </div>
      )}

      <div className="text-sm text-gray-500 ml-2">
        {formatDateRange()}
      </div>
    </div>
  );
}