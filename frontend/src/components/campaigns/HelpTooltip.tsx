import React from 'react';
import { HelpCircle, Info, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface HelpTooltipProps {
  content: React.ReactNode;
  type?: 'info' | 'help' | 'warning';
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export function HelpTooltip({ 
  content, 
  type = 'help', 
  side = 'top',
  className = '' 
}: HelpTooltipProps) {
  const icons = {
    help: HelpCircle,
    info: Info,
    warning: AlertTriangle,
  };

  const colors = {
    help: 'text-blue-500 hover:text-blue-600',
    info: 'text-gray-500 hover:text-gray-600',
    warning: 'text-yellow-500 hover:text-yellow-600',
  };

  const Icon = icons[type];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center justify-center w-4 h-4 transition-colors ${colors[type]} ${className}`}
        >
          <Icon className="w-4 h-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs">
        <div className="text-sm">{content}</div>
      </TooltipContent>
    </Tooltip>
  );
}

interface ValidationMessageProps {
  errors?: string[];
  warnings?: string[];
  className?: string;
}

export function ValidationMessage({ errors, warnings, className = '' }: ValidationMessageProps) {
  if (!errors?.length && !warnings?.length) return null;

  return (
    <div className={`space-y-1 ${className}`}>
      {errors?.map((error, index) => (
        <div key={index} className="flex items-start space-x-2 text-sm text-red-600">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ))}
      {warnings?.map((warning, index) => (
        <div key={index} className="flex items-start space-x-2 text-sm text-yellow-600">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{warning}</span>
        </div>
      ))}
    </div>
  );
}