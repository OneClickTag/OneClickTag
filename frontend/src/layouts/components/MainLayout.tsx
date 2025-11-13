import React, { useState, useEffect } from 'react';
import { LayoutProvider } from '../context/LayoutContext';
import { ErrorBoundary, LoadingOverlay } from './ErrorBoundary';
import { Header } from './Header';
import { Sidebar, MobileSidebar } from './Sidebar';
import { TabbedInterface } from './Tabs';
import { NavigationItem, TabItem, BreadcrumbItem } from '../types/layout.types';
import { Home, Users, Megaphone, BarChart3, Settings } from 'lucide-react';

interface MainLayoutProps {
  children?: React.ReactNode;
  navigation?: NavigationItem[];
  tabs?: TabItem[];
  activeTab?: string | null;
  breadcrumbs?: BreadcrumbItem[];
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  onLogout?: () => void;
  onTabChange?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onTabAdd?: () => void;
  isLoading?: boolean;
  className?: string;
  sidebarCollapsed?: boolean;
  onSidebarToggle?: (collapsed: boolean) => void;
  enableTabs?: boolean;
  showBreadcrumbs?: boolean;
}

function MainLayoutContent({
  children,
  navigation,
  tabs,
  activeTab,
  user,
  onLogout,
  onTabChange,
  onTabClose,
  onTabAdd,
  isLoading = false,
  className = '',
  sidebarCollapsed: propSidebarCollapsed,
  onSidebarToggle,
  enableTabs = true,
  showBreadcrumbs = true,
}: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [, setIsMobile] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
      
      // Auto-collapse sidebar on smaller screens
      if (mobile && !sidebarCollapsed) {
        setSidebarCollapsed(true);
      }
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, [sidebarCollapsed]);

  // Handle sidebar toggle
  const handleSidebarToggle = (collapsed: boolean) => {
    if (onSidebarToggle) {
      onSidebarToggle(collapsed);
    } else {
      setSidebarCollapsed(collapsed);
    }
  };

  const finalSidebarCollapsed = propSidebarCollapsed !== undefined ? propSidebarCollapsed : sidebarCollapsed;

  // Handle mobile sidebar
  const handleMobileSidebarToggle = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  // Close mobile sidebar when clicking outside or navigating
  const handleMobileSidebarClose = () => {
    setMobileSidebarOpen(false);
  };

  return (
    <div className={`h-screen flex bg-background ${className}`}>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <Sidebar
          navigation={navigation}
          collapsed={finalSidebarCollapsed}
          onCollapse={handleSidebarToggle}
        />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar
        navigation={navigation}
        isOpen={mobileSidebarOpen}
        onClose={handleMobileSidebarClose}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <Header
          user={user}
          onLogout={onLogout}
          onMenuClick={handleMobileSidebarToggle}
          showBreadcrumbs={showBreadcrumbs}
        />

        {/* Content Area */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {enableTabs ? (
            <TabbedInterface
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={onTabChange}
              onTabClose={onTabClose}
              onTabAdd={onTabAdd}
              emptyState={
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <h2 className="text-lg font-medium text-foreground mb-2">
                      Welcome to OneClickTag
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Select an item from the sidebar to get started
                    </p>
                    {children}
                  </div>
                </div>
              }
            />
          ) : (
            <div className="flex-1 overflow-hidden">
              {children}
            </div>
          )}
        </main>
      </div>

      {/* Loading Overlay */}
      {isLoading && <LoadingOverlay isLoading={true} />}
    </div>
  );
}

export function MainLayout(props: MainLayoutProps) {
  return (
    <ErrorBoundary>
      <LayoutProvider>
        <MainLayoutContent {...props} />
      </LayoutProvider>
    </ErrorBoundary>
  );
}

// Layout variants for different use cases

// Simple layout without tabs
interface SimpleLayoutProps extends Omit<MainLayoutProps, 'enableTabs' | 'tabs' | 'activeTab' | 'onTabChange' | 'onTabClose' | 'onTabAdd'> {}

export function SimpleLayout(props: SimpleLayoutProps) {
  return <MainLayout {...props} enableTabs={false} />;
}

// Dashboard layout with default navigation
interface DashboardLayoutProps extends Omit<MainLayoutProps, 'navigation'> {
  customNavigation?: NavigationItem[];
}

export function DashboardLayout({ customNavigation, ...props }: DashboardLayoutProps) {
  const defaultNavigation: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      href: '/dashboard',
      isActive: false,
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      href: '/customers',
      isActive: false,
    },
    {
      id: 'campaigns',
      label: 'Campaigns',
      icon: Megaphone,
      href: '/campaigns',
      isActive: false,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      href: '/analytics',
      isActive: false,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      href: '/settings',
      isActive: false,
    },
  ];

  return (
    <MainLayout
      {...props}
      navigation={customNavigation || defaultNavigation}
    />
  );
}

// Full-screen layout without sidebar
interface FullscreenLayoutProps extends Omit<MainLayoutProps, 'navigation' | 'sidebarCollapsed' | 'onSidebarToggle'> {}

export function FullscreenLayout(props: FullscreenLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-background">
      <Header
        user={props.user}
        onLogout={props.onLogout}
        onMenuClick={() => {}}
        showBreadcrumbs={props.showBreadcrumbs}
      />
      <main className="flex-1 overflow-hidden">
        {props.enableTabs !== false ? (
          <TabbedInterface
            tabs={props.tabs}
            activeTab={props.activeTab}
            onTabChange={props.onTabChange}
            onTabClose={props.onTabClose}
            onTabAdd={props.onTabAdd}
          />
        ) : (
          props.children
        )}
      </main>
      {props.isLoading && <LoadingOverlay isLoading={true} />}
    </div>
  );
}

// Layout hook for accessing layout state and actions
export function useMainLayout() {
  // This hook would be implemented to provide layout utilities
  // For now, it's a placeholder for future enhancements
  return {
    // Add utility functions here as needed
    isMobile: typeof window !== 'undefined' && window.innerWidth < 1024,
    // Add more utilities as the application grows
  };
}