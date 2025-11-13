import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { BreadcrumbItem } from '../types/layout.types';
import { useBreadcrumbs } from '../context/LayoutContext';

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  separator?: React.ReactNode;
  showHome?: boolean;
  maxItems?: number;
  className?: string;
}

export function Breadcrumb({
  items: propItems,
  separator = <ChevronRight className="h-4 w-4" />,
  showHome = true,
  maxItems,
  className = '',
}: BreadcrumbProps) {
  const { breadcrumbs: contextBreadcrumbs } = useBreadcrumbs();
  const items = propItems || contextBreadcrumbs;

  // Add home item if showHome is true and not already present
  const allItems = React.useMemo(() => {
    const hasHome = items.some(item => item.href === '/');
    if (showHome && !hasHome && items.length > 0) {
      return [
        { label: 'Home', href: '/', isActive: false },
        ...items,
      ];
    }
    return items;
  }, [items, showHome]);

  // Handle maxItems truncation
  const displayItems = React.useMemo(() => {
    if (!maxItems || allItems.length <= maxItems) {
      return allItems;
    }

    // Always show first and last items, truncate middle
    const firstItem = allItems[0];
    const lastItems = allItems.slice(-2);
    
    return [
      firstItem,
      { label: '...', href: undefined, isActive: false },
      ...lastItems,
    ];
  }, [allItems, maxItems]);

  if (displayItems.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={`flex ${className}`}>
      <ol className="flex items-center space-x-1 text-sm">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isEllipsis = item.label === '...';

          return (
            <li key={`${item.label}-${index}`} className="flex items-center">
              {index > 0 && (
                <span className="text-muted-foreground mx-2" aria-hidden="true">
                  {separator}
                </span>
              )}
              
              {isEllipsis ? (
                <span className="text-muted-foreground px-1">
                  {item.label}
                </span>
              ) : isLast || !item.href ? (
                <span
                  className={`font-medium ${
                    isLast || item.isActive
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}
                  aria-current={isLast || item.isActive ? 'page' : undefined}
                >
                  {item.label === 'Home' && showHome ? (
                    <Home className="h-4 w-4" />
                  ) : (
                    item.label
                  )}
                </span>
              ) : (
                <a
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium"
                >
                  {item.label === 'Home' && showHome ? (
                    <Home className="h-4 w-4" />
                  ) : (
                    item.label
                  )}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Breadcrumb item component for building custom breadcrumbs
interface BreadcrumbItemComponentProps {
  children: React.ReactNode;
  href?: string;
  isActive?: boolean;
  className?: string;
}

export function BreadcrumbItemComponent({
  children,
  href,
  isActive,
  className = '',
}: BreadcrumbItemComponentProps) {
  const baseClasses = 'font-medium transition-colors duration-200';
  
  if (isActive || !href) {
    return (
      <span
        className={`${baseClasses} text-foreground ${className}`}
        aria-current={isActive ? 'page' : undefined}
      >
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      className={`${baseClasses} text-muted-foreground hover:text-foreground ${className}`}
    >
      {children}
    </a>
  );
}

// Breadcrumb separator component
interface BreadcrumbSeparatorProps {
  children?: React.ReactNode;
  className?: string;
}

export function BreadcrumbSeparator({
  children = <ChevronRight className="h-4 w-4" />,
  className = '',
}: BreadcrumbSeparatorProps) {
  return (
    <span className={`text-muted-foreground mx-2 ${className}`} aria-hidden="true">
      {children}
    </span>
  );
}

// Hook for programmatic breadcrumb management
export function useBreadcrumbNavigation() {
  const { breadcrumbs, updateBreadcrumbs, addBreadcrumb, clearBreadcrumbs } = useBreadcrumbs();

  const navigateToBreadcrumb = React.useCallback((item: BreadcrumbItem) => {
    if (item.href) {
      window.location.href = item.href;
    }
  }, []);

  const buildBreadcrumbsFromPath = React.useCallback((pathname: string, labelMap?: Record<string, string>) => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    segments.forEach((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');
      const label = labelMap?.[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      breadcrumbs.push({
        label,
        href,
        isActive: index === segments.length - 1,
      });
    });

    updateBreadcrumbs(breadcrumbs);
  }, [updateBreadcrumbs]);

  return {
    breadcrumbs,
    navigateToBreadcrumb,
    buildBreadcrumbsFromPath,
    addBreadcrumb,
    clearBreadcrumbs,
    updateBreadcrumbs,
  };
}

// Breadcrumb container with responsive design
interface ResponsiveBreadcrumbProps extends BreadcrumbProps {
  collapsible?: boolean;
}

export function ResponsiveBreadcrumb({
  collapsible = true,
  maxItems: propMaxItems,
  ...props
}: ResponsiveBreadcrumbProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Responsive max items based on screen size
  const maxItems = React.useMemo(() => {
    if (propMaxItems) return propMaxItems;
    
    // Default responsive behavior
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 640) return 2; // sm
      if (window.innerWidth < 768) return 3; // md
      return undefined; // no limit on larger screens
    }
    
    return undefined;
  }, [propMaxItems]);

  React.useEffect(() => {
    if (!collapsible) return;

    const handleResize = () => {
      setIsCollapsed(window.innerWidth < 640);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [collapsible]);

  if (collapsible && isCollapsed) {
    return (
      <Breadcrumb
        {...props}
        maxItems={2}
        showHome={false}
        className={`${props.className} sm:hidden`}
      />
    );
  }

  return (
    <Breadcrumb
      {...props}
      maxItems={maxItems}
      className={`${props.className} ${collapsible ? 'hidden sm:flex' : ''}`}
    />
  );
}