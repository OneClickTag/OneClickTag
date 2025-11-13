// Main layout components
export {
  MainLayout,
  SimpleLayout,
  DashboardLayout,
  FullscreenLayout,
  useMainLayout,
} from './components/MainLayout';

export {
  Header,
  SimpleHeader,
  PageHeader,
} from './components/Header';

export {
  Sidebar,
  MobileSidebar,
  SidebarToggle,
} from './components/Sidebar';

export {
  Tabs,
  TabContent,
  TabbedInterface,
} from './components/Tabs';

export {
  Breadcrumb,
  BreadcrumbItemComponent,
  BreadcrumbSeparator,
  ResponsiveBreadcrumb,
  useBreadcrumbNavigation,
} from './components/Breadcrumb';

export {
  UserMenu,
  CompactUserMenu,
} from './components/UserMenu';

export {
  ErrorBoundary,
  LoadingOverlay,
  PageLoadingSkeleton,
} from './components/ErrorBoundary';

// Context and hooks
export {
  LayoutProvider,
  useLayout,
  useNavigation,
  useTabs,
  useBreadcrumbs,
} from './context/LayoutContext';

// Types
export type {
  NavigationItem,
  BreadcrumbItem,
  TabItem,
  UserMenuProps,
  HeaderProps,
  LayoutContextType,
} from './types/layout.types';

// Layout utilities
export * from './utils/layout.utils';