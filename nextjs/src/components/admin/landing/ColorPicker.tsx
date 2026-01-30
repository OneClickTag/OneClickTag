'use client';

import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Gradient presets matching the landing page
export const gradientPresets = [
  { value: 'from-blue-500 to-blue-600', label: 'Blue', colors: ['#3b82f6', '#2563eb'] },
  { value: 'from-blue-500 to-purple-500', label: 'Blue Purple', colors: ['#3b82f6', '#a855f7'] },
  { value: 'from-green-500 to-green-600', label: 'Green', colors: ['#22c55e', '#16a34a'] },
  { value: 'from-purple-500 to-purple-600', label: 'Purple', colors: ['#a855f7', '#9333ea'] },
  { value: 'from-yellow-500 to-orange-600', label: 'Yellow Orange', colors: ['#eab308', '#ea580c'] },
  { value: 'from-red-500 to-pink-600', label: 'Red Pink', colors: ['#ef4444', '#db2777'] },
  { value: 'from-indigo-500 to-indigo-600', label: 'Indigo', colors: ['#6366f1', '#4f46e5'] },
  { value: 'from-cyan-500 to-cyan-600', label: 'Cyan', colors: ['#06b6d4', '#0891b2'] },
  { value: 'from-teal-500 to-teal-600', label: 'Teal', colors: ['#14b8a6', '#0d9488'] },
  { value: 'from-orange-500 to-orange-600', label: 'Orange', colors: ['#f97316', '#ea580c'] },
  { value: 'from-pink-500 to-pink-600', label: 'Pink', colors: ['#ec4899', '#db2777'] },
  { value: 'from-emerald-500 to-emerald-600', label: 'Emerald', colors: ['#10b981', '#059669'] },
];

// Convert gradient class to CSS style
export function getGradientStyle(colorClass?: string): React.CSSProperties {
  if (!colorClass) {
    return { background: 'linear-gradient(to right, #3b82f6, #a855f7)' };
  }
  const preset = gradientPresets.find((p) => p.value === colorClass);
  if (preset) {
    return { background: `linear-gradient(to right, ${preset.colors[0]}, ${preset.colors[1]})` };
  }
  return { background: 'linear-gradient(to right, #3b82f6, #a855f7)' };
}

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const [open, setOpen] = useState(false);

  const selectedPreset = gradientPresets.find((p) => p.value === value) || gradientPresets[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start gap-2 h-10',
            className
          )}
        >
          <div
            className="w-5 h-5 rounded-full border"
            style={getGradientStyle(value)}
          />
          <span>{selectedPreset.label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="grid grid-cols-4 gap-2">
          {gradientPresets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => {
                onChange(preset.value);
                setOpen(false);
              }}
              className={cn(
                'w-12 h-12 rounded-lg border-2 transition-all hover:scale-105',
                value === preset.value
                  ? 'border-primary ring-2 ring-primary ring-offset-2'
                  : 'border-transparent hover:border-gray-300'
              )}
              style={getGradientStyle(preset.value)}
              title={preset.label}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
