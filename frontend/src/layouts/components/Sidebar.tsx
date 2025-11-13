import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  Home,
  Users,
  BarChart3,
  Settings,
  Tag,
  Megaphone,
  TrendingUp,
} from 'lucide-react';
import { NavigationItem } from '../types/layout.types';
import { useNavigation } from '../context/LayoutContext';

interface SidebarProps {
  navigation?: NavigationItem[];
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  className?: string;
}

function NavigationItemComponent({
  item,
  collapsed,
  level = 0,
}: {
  item: NavigationItem;
  collapsed: boolean;
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { setActiveNavigation } = useNavigation();
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = () => {
    if (hasChildren && !collapsed) {
      setIsExpanded(!isExpanded);
    } else if (item.href) {
      setActiveNavigation(item.id);
      // Navigate to the href (you might want to use your router here)
      window.location.href = item.href;
    }
  };

  const paddingLeft = collapsed ? 'pl-4' : `pl-${4 + level * 4}`;

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={item.disabled}
        className={`
          w-full flex items-center ${paddingLeft} pr-4 py-3 text-left transition-colors group
          ${item.isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }
          ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset
        `}
        title={collapsed ? item.label : undefined}
      >
        <item.icon className={`h-5 w-5 shrink-0 ${collapsed ? '' : 'mr-3'}`} />
        
        {!collapsed && (
          <>
            <span className="flex-1 truncate font-medium text-sm">
              {item.label}
            </span>
            
            {item.badge && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full ml-2">
                {item.badge}
              </span>
            )}
            
            {hasChildren && (
              <ChevronDown className={`
                h-4 w-4 ml-2 transition-transform duration-200
                ${isExpanded ? 'transform rotate-180' : ''}
              `} />
            )}
          </>
        )}
      </button>

      {/* Submenu */}
      {hasChildren && !collapsed && isExpanded && (
        <div className="bg-muted/50">
          {item.children!.map((child) => (
            <NavigationItemComponent
              key={child.id}
              item={child}
              collapsed={collapsed}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DefaultNavigation(): NavigationItem[] {
  return [
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
      badge: '12',
    },
    {
      id: 'campaigns',
      label: 'Campaigns',
      icon: Megaphone,
      href: '#',
      isActive: false,
      children: [
        {
          id: 'campaigns-list',
          label: 'All Campaigns',
          icon: BarChart3,
          href: '/campaigns',
          isActive: false,
        },
        {
          id: 'campaigns-create',
          label: 'Create Campaign',
          icon: Tag,
          href: '/campaigns/create',
          isActive: false,
        },
      ],
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: TrendingUp,
      href: '/analytics',
      isActive: false,
    },
    {
      id: 'gtm',
      label: 'GTM Integration',
      icon: Tag,
      href: '/gtm',
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
}

export function Sidebar({
  navigation: propNavigation,
  collapsed: propCollapsed,
  onCollapse,
  className = '',
}: SidebarProps) {
  const { navigation: contextNavigation } = useNavigation();
  const [localCollapsed, setLocalCollapsed] = useState(false);

  const navigation = propNavigation || contextNavigation || DefaultNavigation();
  const collapsed = propCollapsed !== undefined ? propCollapsed : localCollapsed;

  const handleCollapse = () => {
    const newCollapsed = !collapsed;
    if (onCollapse) {
      onCollapse(newCollapsed);
    } else {
      setLocalCollapsed(newCollapsed);
    }
  };

  return (
    <div className={`
      flex flex-col h-full bg-card border-r border-border transition-all duration-300
      ${collapsed ? 'w-16' : 'w-64'}
      ${className}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">OT</span>
            </div>
            <span className="font-bold text-lg text-foreground">OneClickTag</span>
          </div>
        )}
        
        <button
          onClick={handleCollapse}
          className="
            p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors
            focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
          "
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1">
          {navigation.map((item) => (
            <NavigationItemComponent
              key={item.id}
              item={item}
              collapsed={collapsed}
            />
          ))}
        </div>
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-border">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              OneClickTag v1.0.0
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile sidebar overlay
interface MobileSidebarProps extends SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({
  navigation,
  isOpen,
  onClose,
  className = '',
}: MobileSidebarProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${className}
      `}>
        <Sidebar
          navigation={navigation}
          collapsed={false}
          className="h-full shadow-lg"
        />
      </div>
    </>
  );
}

// Sidebar toggle button for mobile
interface SidebarToggleProps {
  onClick: () => void;
  className?: string;
}

export function SidebarToggle({ onClick, className = '' }: SidebarToggleProps) {
  return (
    <button
      onClick={onClick}
      className={`
        p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors lg:hidden
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        ${className}
      `}
      title="Open sidebar"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}