import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: string | number;
  children?: NavigationItem[];
  isActive?: boolean;
  disabled?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isActive?: boolean;
}

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  content: ReactNode;
  badge?: string | number;
  disabled?: boolean;
  closable?: boolean;
}

export interface UserMenuProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  onLogout: () => void;
  onProfile?: () => void;
  onSettings?: () => void;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export interface ErrorState {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
  retry?: () => void;
}

export interface LayoutContextType {
  // Sidebar state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Navigation
  navigation: NavigationItem[];
  setNavigation: (nav: NavigationItem[]) => void;
  
  // Breadcrumbs
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  
  // Tabs
  tabs: TabItem[];
  activeTab: string | null;
  setTabs: (tabs: TabItem[]) => void;
  setActiveTab: (tabId: string) => void;
  addTab: (tab: TabItem) => void;
  removeTab: (tabId: string) => void;
  
  // Loading & Error states
  loading: LoadingState;
  setLoading: (loading: LoadingState) => void;
  error: ErrorState;
  setError: (error: ErrorState) => void;
  
  // Theme & preferences
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export interface MainLayoutProps {
  children: ReactNode;
  user?: UserMenuProps['user'];
  onLogout?: () => void;
  navigation?: NavigationItem[];
  showTabs?: boolean;
  showBreadcrumbs?: boolean;
  className?: string;
}

export interface SidebarProps {
  navigation: NavigationItem[];
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  className?: string;
}

export interface HeaderProps {
  user?: UserMenuProps['user'];
  onLogout?: () => void;
  onMenuClick: () => void;
  showBreadcrumbs?: boolean;
  className?: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string | null;
  onTabChange: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  className?: string;
}

export interface LoadingOverlayProps {
  loading: LoadingState;
  className?: string;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: string, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: string) => void;
}