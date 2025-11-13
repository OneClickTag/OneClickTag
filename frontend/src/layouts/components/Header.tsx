import React from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { UserMenu, CompactUserMenu } from './UserMenu';
import { ResponsiveBreadcrumb } from './Breadcrumb';
import { HeaderProps } from '../types/layout.types';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
}

function SearchBar({ placeholder = 'Search...', onSearch, className = '' }: SearchBarProps) {
  const [query, setQuery] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(query);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="
            w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg
            text-sm placeholder:text-muted-foreground
            focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
            transition-colors
          "
        />
      </div>
    </form>
  );
}

function NotificationBell({ count = 0 }: { count?: number }) {
  return (
    <button
      className="
        relative p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
      "
      title={`${count} notifications`}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="
          absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground
          text-xs font-medium rounded-full flex items-center justify-center
        ">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

export function Header({
  user,
  onLogout,
  onMenuClick,
  showBreadcrumbs = true,
  className = '',
}: HeaderProps) {
  const handleSearch = (query: string) => {
    console.log('Search query:', query);
    // Implement search functionality
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      console.log('Logout');
      // Default logout behavior
    }
  };

  return (
    <header className={`
      bg-background border-b border-border px-4 py-3
      ${className}
    `}>
      <div className="flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="
              p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors lg:hidden
              focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
            "
            title="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumbs */}
          {showBreadcrumbs && (
            <div className="hidden sm:block">
              <ResponsiveBreadcrumb />
            </div>
          )}
        </div>

        {/* Center section - Search */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <SearchBar
            placeholder="Search customers, campaigns..."
            onSearch={handleSearch}
          />
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-2">
          {/* Mobile search button */}
          <button
            className="
              p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors md:hidden
              focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
            "
            title="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <NotificationBell count={3} />

          {/* User menu */}
          {user && (
            <>
              {/* Desktop user menu */}
              <div className="hidden md:block">
                <UserMenu
                  user={user}
                  onLogout={handleLogout}
                  onProfile={() => console.log('Profile')}
                  onSettings={() => console.log('Settings')}
                />
              </div>

              {/* Mobile user menu */}
              <div className="md:hidden">
                <CompactUserMenu
                  user={user}
                  onLogout={handleLogout}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile breadcrumbs */}
      {showBreadcrumbs && (
        <div className="mt-3 sm:hidden">
          <ResponsiveBreadcrumb />
        </div>
      )}
    </header>
  );
}

// Header with different variants
interface SimpleHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function SimpleHeader({ title, subtitle, actions, className = '' }: SimpleHeaderProps) {
  return (
    <header className={`bg-background border-b border-border px-6 py-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

// Page header with breadcrumbs and actions
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: boolean;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs = true,
  actions,
  tabs,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`bg-background border-b border-border ${className}`}>
      <div className="px-6 py-4">
        {/* Breadcrumbs */}
        {breadcrumbs && (
          <div className="mb-4">
            <ResponsiveBreadcrumb />
          </div>
        )}

        {/* Title and actions */}
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          
          {actions && (
            <div className="ml-4 flex-shrink-0">
              <div className="flex items-center space-x-2">
                {actions}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      {tabs && (
        <div className="border-t border-border">
          {tabs}
        </div>
      )}
    </div>
  );
}