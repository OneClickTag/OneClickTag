import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useShortcutDisplay } from '@/hooks/useKeyboardShortcuts';

interface SearchTriggerProps {
  onClick: () => void;
  variant?: 'button' | 'input' | 'minimal';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  placeholder?: string;
}

export function SearchTrigger({ 
  onClick, 
  variant = 'input', 
  size = 'default', 
  className = '',
  placeholder = 'Search...'
}: SearchTriggerProps) {
  const { getSearchShortcut } = useShortcutDisplay();

  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={onClick}
        className={`flex items-center space-x-2 ${className}`}
      >
        <Search className="h-4 w-4" />
        <span>Search</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          {getSearchShortcut()}
        </kbd>
      </Button>
    );
  }

  if (variant === 'minimal') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        className={`h-8 w-8 p-0 ${className}`}
        title={`Search (${getSearchShortcut()})`}
      >
        <Search className="h-4 w-4" />
      </Button>
    );
  }

  // Default input variant
  return (
    <div
      onClick={onClick}
      className={`flex items-center w-full max-w-sm cursor-text rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${className}`}
    >
      <Search className="h-4 w-4 text-muted-foreground mr-2" />
      <span className="flex-1 text-muted-foreground">{placeholder}</span>
      <div className="flex items-center space-x-1">
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          {getSearchShortcut()}
        </kbd>
      </div>
    </div>
  );
}