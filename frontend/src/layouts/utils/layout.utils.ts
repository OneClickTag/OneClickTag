import { NavigationItem, BreadcrumbItem, TabItem } from '../types/layout.types';

// Navigation utilities
export const navigationUtils = {
  /**
   * Find a navigation item by ID (recursively searches through children)
   */
  findNavigationItem(navigation: NavigationItem[], id: string): NavigationItem | null {
    for (const item of navigation) {
      if (item.id === id) {
        return item;
      }
      if (item.children) {
        const found = this.findNavigationItem(item.children, id);
        if (found) return found;
      }
    }
    return null;
  },

  /**
   * Update navigation item by ID
   */
  updateNavigationItem(
    navigation: NavigationItem[],
    id: string,
    updates: Partial<NavigationItem>
  ): NavigationItem[] {
    return navigation.map(item => {
      if (item.id === id) {
        return { ...item, ...updates };
      }
      if (item.children) {
        return {
          ...item,
          children: this.updateNavigationItem(item.children, id, updates),
        };
      }
      return item;
    });
  },

  /**
   * Set active navigation item (deactivates others)
   */
  setActiveNavigationItem(navigation: NavigationItem[], activeId: string): NavigationItem[] {
    return navigation.map(item => ({
      ...item,
      isActive: item.id === activeId,
      children: item.children
        ? this.setActiveNavigationItem(item.children, activeId)
        : undefined,
    }));
  },

  /**
   * Get navigation path to an item
   */
  getNavigationPath(navigation: NavigationItem[], targetId: string): NavigationItem[] {
    const findPath = (items: NavigationItem[], path: NavigationItem[] = []): NavigationItem[] | null => {
      for (const item of items) {
        const currentPath = [...path, item];
        if (item.id === targetId) {
          return currentPath;
        }
        if (item.children) {
          const result = findPath(item.children, currentPath);
          if (result) return result;
        }
      }
      return null;
    };

    return findPath(navigation) || [];
  },
};

// Breadcrumb utilities
export const breadcrumbUtils = {
  /**
   * Create breadcrumbs from a URL path
   */
  createBreadcrumbsFromPath(
    pathname: string,
    labelMap?: Record<string, string>,
    baseUrl = ''
  ): BreadcrumbItem[] {
    const segments = pathname.replace(baseUrl, '').split('/').filter(Boolean);
    
    return segments.map((segment, index) => {
      const href = baseUrl + '/' + segments.slice(0, index + 1).join('/');
      const label = labelMap?.[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      return {
        label: label.replace(/[-_]/g, ' '), // Replace hyphens and underscores with spaces
        href,
        isActive: index === segments.length - 1,
      };
    });
  },

  /**
   * Create breadcrumbs from navigation path
   */
  createBreadcrumbsFromNavigation(navigationPath: NavigationItem[]): BreadcrumbItem[] {
    return navigationPath.map((item, index) => ({
      label: item.label,
      href: item.href,
      isActive: index === navigationPath.length - 1,
    }));
  },

  /**
   * Truncate breadcrumbs for responsive display
   */
  truncateBreadcrumbs(breadcrumbs: BreadcrumbItem[], maxItems: number): BreadcrumbItem[] {
    if (breadcrumbs.length <= maxItems) {
      return breadcrumbs;
    }

    const firstItem = breadcrumbs[0];
    const lastItems = breadcrumbs.slice(-2);
    
    return [
      firstItem,
      { label: '...', href: undefined, isActive: false },
      ...lastItems,
    ];
  },
};

// Tab utilities
export const tabUtils = {
  /**
   * Find tab by ID
   */
  findTab(tabs: TabItem[], id: string): TabItem | null {
    return tabs.find(tab => tab.id === id) || null;
  },

  /**
   * Add tab (avoids duplicates)
   */
  addTab(tabs: TabItem[], newTab: TabItem): TabItem[] {
    const exists = tabs.some(tab => tab.id === newTab.id);
    if (exists) {
      return tabs;
    }
    return [...tabs, newTab];
  },

  /**
   * Close tab by ID
   */
  closeTab(tabs: TabItem[], id: string): TabItem[] {
    return tabs.filter(tab => tab.id !== id);
  },

  /**
   * Close other tabs (keep specified tab)
   */
  closeOtherTabs(tabs: TabItem[], keepId: string): TabItem[] {
    return tabs.filter(tab => tab.id === keepId || tab.closable === false);
  },

  /**
   * Close tabs to the right of specified tab
   */
  closeTabsToRight(tabs: TabItem[], fromId: string): TabItem[] {
    const index = tabs.findIndex(tab => tab.id === fromId);
    if (index === -1) return tabs;
    
    return tabs.slice(0, index + 1).concat(
      tabs.slice(index + 1).filter(tab => tab.closable === false)
    );
  },

  /**
   * Reorder tabs
   */
  reorderTabs(tabs: TabItem[], fromIndex: number, toIndex: number): TabItem[] {
    const result = [...tabs];
    const [removed] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, removed);
    return result;
  },

  /**
   * Get next available tab ID when a tab is closed
   */
  getNextActiveTab(tabs: TabItem[], closedTabId: string, currentActiveTab: string | null): string | null {
    const closedIndex = tabs.findIndex(tab => tab.id === closedTabId);
    if (closedIndex === -1) return currentActiveTab;

    const remainingTabs = tabs.filter(tab => tab.id !== closedTabId);
    if (remainingTabs.length === 0) return null;

    // If the closed tab was not active, keep current active tab
    if (currentActiveTab !== closedTabId) {
      return currentActiveTab;
    }

    // If there's a tab to the right, use it
    if (closedIndex < remainingTabs.length) {
      return remainingTabs[closedIndex].id;
    }

    // Otherwise, use the last tab
    return remainingTabs[remainingTabs.length - 1].id;
  },
};

// Layout utilities
export const layoutUtils = {
  /**
   * Check if the current viewport is mobile
   */
  isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1024; // lg breakpoint
  },

  /**
   * Check if the current viewport is tablet
   */
  isTablet(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 768 && window.innerWidth < 1024; // md to lg
  },

  /**
   * Check if the current viewport is desktop
   */
  isDesktop(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1024; // lg and above
  },

  /**
   * Get breakpoint name for current viewport
   */
  getCurrentBreakpoint(): 'sm' | 'md' | 'lg' | 'xl' | '2xl' {
    if (typeof window === 'undefined') return 'lg';
    
    const width = window.innerWidth;
    if (width < 640) return 'sm';
    if (width < 768) return 'md';
    if (width < 1024) return 'lg';
    if (width < 1280) return 'xl';
    return '2xl';
  },

  /**
   * Debounce function for resize handlers
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(null, args), wait);
    };
  },

  /**
   * Create a responsive listener
   */
  createResponsiveListener(
    callback: (breakpoint: string, isMobile: boolean, isTablet: boolean, isDesktop: boolean) => void
  ): () => void {
    const handler = this.debounce(() => {
      const breakpoint = this.getCurrentBreakpoint();
      const isMobile = this.isMobile();
      const isTablet = this.isTablet();
      const isDesktop = this.isDesktop();
      callback(breakpoint, isMobile, isTablet, isDesktop);
    }, 150);

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handler);
      // Call immediately to set initial state
      handler();
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handler);
      }
    };
  },
};

// Theme utilities
export const themeUtils = {
  /**
   * Apply theme to document
   */
  applyTheme(theme: 'light' | 'dark' | 'system'): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  },

  /**
   * Listen for system theme changes
   */
  listenForSystemTheme(callback: (isDark: boolean) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => callback(e.matches);
    
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  },

  /**
   * Get current system theme preference
   */
  getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },
};

// Export all utilities as a single object
export const layoutUtilities = {
  navigation: navigationUtils,
  breadcrumb: breadcrumbUtils,
  tab: tabUtils,
  layout: layoutUtils,
  theme: themeUtils,
};