import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { 
  LayoutContextType, 
  NavigationItem, 
  BreadcrumbItem, 
  TabItem, 
  LoadingState, 
  ErrorState 
} from '../types/layout.types';

// Action types
type LayoutAction =
  | { type: 'SET_SIDEBAR_OPEN'; payload: boolean }
  | { type: 'SET_SIDEBAR_COLLAPSED'; payload: boolean }
  | { type: 'SET_NAVIGATION'; payload: NavigationItem[] }
  | { type: 'SET_BREADCRUMBS'; payload: BreadcrumbItem[] }
  | { type: 'SET_TABS'; payload: TabItem[] }
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'ADD_TAB'; payload: TabItem }
  | { type: 'REMOVE_TAB'; payload: string }
  | { type: 'SET_LOADING'; payload: LoadingState }
  | { type: 'SET_ERROR'; payload: ErrorState }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'system' };

// Initial state
const initialState: Omit<LayoutContextType, 'setSidebarOpen' | 'setSidebarCollapsed' | 'setNavigation' | 'setBreadcrumbs' | 'setTabs' | 'setActiveTab' | 'addTab' | 'removeTab' | 'setLoading' | 'setError' | 'setTheme'> = {
  sidebarOpen: false,
  sidebarCollapsed: false,
  navigation: [],
  breadcrumbs: [],
  tabs: [],
  activeTab: null,
  loading: { isLoading: false },
  error: { hasError: false },
  theme: 'system',
};

// Reducer
function layoutReducer(state: typeof initialState, action: LayoutAction): typeof initialState {
  switch (action.type) {
    case 'SET_SIDEBAR_OPEN':
      return { ...state, sidebarOpen: action.payload };
    
    case 'SET_SIDEBAR_COLLAPSED':
      return { ...state, sidebarCollapsed: action.payload };
    
    case 'SET_NAVIGATION':
      return { ...state, navigation: action.payload };
    
    case 'SET_BREADCRUMBS':
      return { ...state, breadcrumbs: action.payload };
    
    case 'SET_TABS':
      return { ...state, tabs: action.payload };
    
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    
    case 'ADD_TAB':
      const existingTabIndex = state.tabs.findIndex(tab => tab.id === action.payload.id);
      if (existingTabIndex >= 0) {
        // Update existing tab
        const updatedTabs = [...state.tabs];
        updatedTabs[existingTabIndex] = action.payload;
        return { 
          ...state, 
          tabs: updatedTabs,
          activeTab: action.payload.id 
        };
      } else {
        // Add new tab
        return { 
          ...state, 
          tabs: [...state.tabs, action.payload],
          activeTab: action.payload.id 
        };
      }
    
    case 'REMOVE_TAB':
      const filteredTabs = state.tabs.filter(tab => tab.id !== action.payload);
      let newActiveTab = state.activeTab;
      
      // If we're removing the active tab, switch to another tab
      if (state.activeTab === action.payload && filteredTabs.length > 0) {
        const removedIndex = state.tabs.findIndex(tab => tab.id === action.payload);
        // Try to select the next tab, or the previous one if it was the last tab
        newActiveTab = filteredTabs[Math.min(removedIndex, filteredTabs.length - 1)]?.id || null;
      } else if (filteredTabs.length === 0) {
        newActiveTab = null;
      }
      
      return { 
        ...state, 
        tabs: filteredTabs,
        activeTab: newActiveTab
      };
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    
    default:
      return state;
  }
}

// Context
const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

// Provider component
interface LayoutProviderProps {
  children: ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const [state, dispatch] = useReducer(layoutReducer, initialState);

  // Action creators
  const setSidebarOpen = useCallback((open: boolean) => {
    dispatch({ type: 'SET_SIDEBAR_OPEN', payload: open });
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: collapsed });
  }, []);

  const setNavigation = useCallback((navigation: NavigationItem[]) => {
    dispatch({ type: 'SET_NAVIGATION', payload: navigation });
  }, []);

  const setBreadcrumbs = useCallback((breadcrumbs: BreadcrumbItem[]) => {
    dispatch({ type: 'SET_BREADCRUMBS', payload: breadcrumbs });
  }, []);

  const setTabs = useCallback((tabs: TabItem[]) => {
    dispatch({ type: 'SET_TABS', payload: tabs });
  }, []);

  const setActiveTab = useCallback((tabId: string) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tabId });
  }, []);

  const addTab = useCallback((tab: TabItem) => {
    dispatch({ type: 'ADD_TAB', payload: tab });
  }, []);

  const removeTab = useCallback((tabId: string) => {
    dispatch({ type: 'REMOVE_TAB', payload: tabId });
  }, []);

  const setLoading = useCallback((loading: LoadingState) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: ErrorState) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const setTheme = useCallback((theme: 'light' | 'dark' | 'system') => {
    dispatch({ type: 'SET_THEME', payload: theme });
  }, []);

  const contextValue: LayoutContextType = {
    ...state,
    setSidebarOpen,
    setSidebarCollapsed,
    setNavigation,
    setBreadcrumbs,
    setTabs,
    setActiveTab,
    addTab,
    removeTab,
    setLoading,
    setError,
    setTheme,
  };

  return (
    <LayoutContext.Provider value={contextValue}>
      {children}
    </LayoutContext.Provider>
  );
}

// Hook to use layout context
export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}

// Hook for navigation management
export function useNavigation() {
  const { navigation, setNavigation } = useLayout();
  
  const updateNavigationItem = useCallback((itemId: string, updates: Partial<NavigationItem>) => {
    const updateItems = (items: NavigationItem[]): NavigationItem[] => {
      return items.map(item => {
        if (item.id === itemId) {
          return { ...item, ...updates };
        }
        if (item.children) {
          return { ...item, children: updateItems(item.children) };
        }
        return item;
      });
    };
    
    setNavigation(updateItems(navigation));
  }, [navigation, setNavigation]);

  const setActiveNavigation = useCallback((itemId: string) => {
    const updateItems = (items: NavigationItem[]): NavigationItem[] => {
      return items.map(item => ({
        ...item,
        isActive: item.id === itemId,
        children: item.children ? updateItems(item.children) : undefined,
      }));
    };
    
    setNavigation(updateItems(navigation));
  }, [navigation, setNavigation]);

  return {
    navigation,
    setNavigation,
    updateNavigationItem,
    setActiveNavigation,
  };
}

// Hook for tab management
export function useTabs() {
  const { tabs, activeTab, setTabs, setActiveTab, addTab, removeTab } = useLayout();

  const openTab = useCallback((tab: TabItem) => {
    addTab(tab);
  }, [addTab]);

  const closeTab = useCallback((tabId: string) => {
    removeTab(tabId);
  }, [removeTab]);

  const closeAllTabs = useCallback(() => {
    setTabs([]);
  }, [setTabs]);

  const closeOtherTabs = useCallback((keepTabId: string) => {
    const tabToKeep = tabs.find(tab => tab.id === keepTabId);
    if (tabToKeep) {
      setTabs([tabToKeep]);
      setActiveTab(keepTabId);
    }
  }, [tabs, setTabs, setActiveTab]);

  return {
    tabs,
    activeTab,
    openTab,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
    setActiveTab,
  };
}

// Hook for breadcrumb management
export function useBreadcrumbs() {
  const { breadcrumbs, setBreadcrumbs } = useLayout();

  const addBreadcrumb = useCallback((breadcrumb: BreadcrumbItem) => {
    setBreadcrumbs([...breadcrumbs, breadcrumb]);
  }, [breadcrumbs, setBreadcrumbs]);

  const updateBreadcrumbs = useCallback((newBreadcrumbs: BreadcrumbItem[]) => {
    setBreadcrumbs(newBreadcrumbs);
  }, [setBreadcrumbs]);

  const clearBreadcrumbs = useCallback(() => {
    setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  return {
    breadcrumbs,
    addBreadcrumb,
    updateBreadcrumbs,
    clearBreadcrumbs,
  };
}