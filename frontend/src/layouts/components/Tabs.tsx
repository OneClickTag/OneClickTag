import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Plus, MoreHorizontal } from 'lucide-react';
import { TabItem } from '../types/layout.types';
import { useTabs } from '../context/LayoutContext';

interface TabsProps {
  tabs?: TabItem[];
  activeTab?: string | null;
  onTabChange?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onTabAdd?: () => void;
  className?: string;
  maxVisibleTabs?: number;
}

function TabButton({
  tab,
  isActive,
  onSelect,
  onClose,
  isClosable = true,
}: {
  tab: TabItem;
  isActive: boolean;
  onSelect: () => void;
  onClose?: () => void;
  isClosable?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`
        group relative flex items-center min-w-0 max-w-xs border-r border-border
        ${isActive
          ? 'bg-background text-foreground border-b-2 border-b-primary'
          : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
        }
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={onSelect}
        disabled={tab.disabled}
        className={`
          flex items-center space-x-2 px-4 py-3 min-w-0 flex-1 transition-colors
          ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset
        `}
        title={tab.label}
      >
        {tab.icon && (
          <tab.icon className="h-4 w-4 shrink-0" />
        )}
        <span className="truncate text-sm font-medium">
          {tab.label}
        </span>
        {tab.badge && (
          <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full shrink-0">
            {tab.badge}
          </span>
        )}
      </button>

      {/* Close button */}
      {isClosable && tab.closable !== false && onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={`
            p-1 mr-2 rounded-sm transition-opacity
            hover:bg-accent hover:text-accent-foreground
            focus:outline-none focus:ring-2 focus:ring-ring
            ${isHovered || isActive ? 'opacity-100' : 'opacity-0'}
          `}
          title={`Close ${tab.label}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function TabOverflowMenu({
  hiddenTabs,
  activeTab,
  onTabSelect,
  onTabClose,
}: {
  hiddenTabs: TabItem[];
  activeTab: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (hiddenTabs.length === 0) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center justify-center p-3 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground
          border-r border-border transition-colors
          focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset
        "
        title={`${hiddenTabs.length} more tabs`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="
          absolute top-full right-0 mt-1 w-64 bg-popover border border-border rounded-lg shadow-lg
          z-50 py-2 max-h-64 overflow-y-auto
          animate-in fade-in-0 zoom-in-95 slide-in-from-top-2
        ">
          {hiddenTabs.map((tab) => (
            <div
              key={tab.id}
              className={`
                flex items-center justify-between px-3 py-2 hover:bg-accent hover:text-accent-foreground
                ${activeTab === tab.id ? 'bg-accent text-accent-foreground' : ''}
              `}
            >
              <button
                onClick={() => {
                  onTabSelect(tab.id);
                  setIsOpen(false);
                }}
                className="flex items-center space-x-2 min-w-0 flex-1 text-left"
                disabled={tab.disabled}
              >
                {tab.icon && <tab.icon className="h-4 w-4 shrink-0" />}
                <span className="truncate text-sm">{tab.label}</span>
                {tab.badge && (
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
              
              {tab.closable !== false && onTabClose && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  className="p-1 hover:bg-destructive hover:text-destructive-foreground rounded-sm ml-2"
                  title={`Close ${tab.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Tabs({
  tabs: propTabs,
  activeTab: propActiveTab,
  onTabChange,
  onTabClose,
  onTabAdd,
  className = '',
  maxVisibleTabs = 8,
}: TabsProps) {
  const { tabs: contextTabs, activeTab: contextActiveTab, setActiveTab, closeTab } = useTabs();
  const [scrollPosition, setScrollPosition] = useState(0);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const tabs = propTabs || contextTabs;
  const activeTab = propActiveTab || contextActiveTab;

  const handleTabChange = onTabChange || setActiveTab;
  const handleTabClose = onTabClose || closeTab;

  // Calculate visible and hidden tabs
  const visibleTabs = tabs.slice(0, maxVisibleTabs);
  const hiddenTabs = tabs.slice(maxVisibleTabs);

  // Scroll functions for responsive tab navigation
  const scrollLeft = () => {
    if (tabsContainerRef.current) {
      const container = tabsContainerRef.current;
      const scrollAmount = 200;
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (tabsContainerRef.current) {
      const container = tabsContainerRef.current;
      const scrollAmount = 200;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Handle scroll position for showing/hiding scroll buttons
  const handleScroll = () => {
    if (tabsContainerRef.current) {
      setScrollPosition(tabsContainerRef.current.scrollLeft);
    }
  };

  const canScrollLeft = scrollPosition > 0;
  const canScrollRight = tabsContainerRef.current
    ? tabsContainerRef.current.scrollLeft < tabsContainerRef.current.scrollWidth - tabsContainerRef.current.clientWidth
    : false;

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center bg-muted/30 border-b border-border ${className}`}>
      {/* Left scroll button */}
      {canScrollLeft && (
        <button
          onClick={scrollLeft}
          className="
            p-2 text-muted-foreground hover:text-foreground hover:bg-muted
            border-r border-border shrink-0
            focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset
          "
          title="Scroll left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {/* Tabs container */}
      <div
        ref={tabsContainerRef}
        className="flex-1 flex overflow-x-auto scrollbar-hide"
        onScroll={handleScroll}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {visibleTabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onSelect={() => handleTabChange(tab.id)}
            onClose={handleTabClose ? () => handleTabClose(tab.id) : undefined}
          />
        ))}
      </div>

      {/* Right scroll button */}
      {canScrollRight && (
        <button
          onClick={scrollRight}
          className="
            p-2 text-muted-foreground hover:text-foreground hover:bg-muted
            border-l border-border shrink-0
            focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset
          "
          title="Scroll right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Overflow menu */}
      <TabOverflowMenu
        hiddenTabs={hiddenTabs}
        activeTab={activeTab}
        onTabSelect={handleTabChange}
        onTabClose={handleTabClose}
      />

      {/* Add tab button */}
      {onTabAdd && (
        <button
          onClick={onTabAdd}
          className="
            p-3 text-muted-foreground hover:text-foreground hover:bg-muted
            border-l border-border shrink-0
            focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset
          "
          title="Add new tab"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Tab content container
interface TabContentProps {
  activeTab: string | null;
  tabs: TabItem[];
  className?: string;
}

export function TabContent({ activeTab, tabs, className = '' }: TabContentProps) {
  const activeTabData = tabs.find(tab => tab.id === activeTab);

  if (!activeTabData) {
    return (
      <div className={`flex-1 flex items-center justify-center text-muted-foreground ${className}`}>
        <p>No tab selected</p>
      </div>
    );
  }

  return (
    <div className={`flex-1 ${className}`}>
      {activeTabData.content}
    </div>
  );
}

// Complete tabbed interface
interface TabbedInterfaceProps {
  tabs?: TabItem[];
  activeTab?: string | null;
  onTabChange?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onTabAdd?: () => void;
  className?: string;
  maxVisibleTabs?: number;
  emptyState?: React.ReactNode;
}

export function TabbedInterface({
  tabs: propTabs,
  activeTab: propActiveTab,
  onTabChange,
  onTabClose,
  onTabAdd,
  className = '',
  maxVisibleTabs,
  emptyState,
}: TabbedInterfaceProps) {
  const { tabs: contextTabs, activeTab: contextActiveTab } = useTabs();

  const tabs = propTabs || contextTabs;
  const activeTab = propActiveTab || contextActiveTab;

  if (tabs.length === 0) {
    return (
      <div className={`flex-1 flex flex-col ${className}`}>
        {emptyState || (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">No tabs open</p>
              <p className="text-sm">Open a tab to get started</p>
              {onTabAdd && (
                <button
                  onClick={onTabAdd}
                  className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2 inline" />
                  Add Tab
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col ${className}`}>
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onTabClose={onTabClose}
        onTabAdd={onTabAdd}
        maxVisibleTabs={maxVisibleTabs}
      />
      <TabContent
        activeTab={activeTab}
        tabs={tabs}
        className="overflow-hidden"
      />
    </div>
  );
}