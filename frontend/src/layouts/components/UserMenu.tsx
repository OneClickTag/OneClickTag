import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  Moon,
  Sun,
  Monitor,
  Bell,
  HelpCircle,
  CreditCard,
  Shield,
} from 'lucide-react';
import { UserMenuProps } from '../types/layout.types';
import { useLayout } from '../context/LayoutContext';

interface UserMenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  badge?: string | number;
}

function UserMenuItem({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  disabled = false,
  badge,
}: UserMenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors
        ${disabled
          ? 'text-muted-foreground cursor-not-allowed'
          : variant === 'destructive'
          ? 'text-destructive hover:bg-destructive/10 hover:text-destructive'
          : 'text-foreground hover:bg-accent hover:text-accent-foreground'
        }
      `}
    >
      <Icon className="h-4 w-4 mr-3" />
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}

function ThemeSelector() {
  const { theme, setTheme } = useLayout();

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const;

  return (
    <div className="px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground mb-2">Theme</p>
      <div className="grid grid-cols-3 gap-1">
        {themes.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`
              flex flex-col items-center p-2 rounded-md text-xs transition-colors
              ${theme === value
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
              }
            `}
          >
            <Icon className="h-4 w-4 mb-1" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function UserAvatar({ user, size = 'md' }: { user: UserMenuProps['user']; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  };

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        className={`${sizeClasses[size]} rounded-full object-cover`}
      />
    );
  }

  return (
    <div className={`
      ${sizeClasses[size]} rounded-full bg-primary text-primary-foreground
      flex items-center justify-center font-medium
    `}>
      {initials}
    </div>
  );
}

export function UserMenu({
  user,
  onLogout,
  onProfile,
  onSettings,
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleMenuItemClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* User menu trigger */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center space-x-3 p-2 rounded-lg transition-colors
          hover:bg-accent hover:text-accent-foreground
          focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        "
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <UserAvatar user={user} />
        
        <div className="hidden md:block text-left min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {user.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {user.email}
          </p>
        </div>
        
        <ChevronDown className={`
          h-4 w-4 text-muted-foreground transition-transform duration-200
          ${isOpen ? 'transform rotate-180' : ''}
        `} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="
            absolute right-0 mt-2 w-64 bg-popover border border-border rounded-lg shadow-lg
            z-50 py-2 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2
          "
        >
          {/* User info section */}
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center space-x-3">
              <UserAvatar user={user} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
                {user.role && (
                  <p className="text-xs text-muted-foreground">
                    {user.role}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {onProfile && (
              <UserMenuItem
                icon={User}
                label="Profile"
                onClick={() => handleMenuItemClick(onProfile)}
              />
            )}
            
            <UserMenuItem
              icon={Bell}
              label="Notifications"
              onClick={() => handleMenuItemClick(() => console.log('Notifications'))}
              badge="3"
            />
            
            {onSettings && (
              <UserMenuItem
                icon={Settings}
                label="Settings"
                onClick={() => handleMenuItemClick(onSettings)}
              />
            )}
            
            <UserMenuItem
              icon={CreditCard}
              label="Billing"
              onClick={() => handleMenuItemClick(() => console.log('Billing'))}
            />
            
            <UserMenuItem
              icon={Shield}
              label="Security"
              onClick={() => handleMenuItemClick(() => console.log('Security'))}
            />
          </div>

          {/* Theme selector */}
          <div className="border-t border-border">
            <ThemeSelector />
          </div>

          {/* Bottom section */}
          <div className="py-1 border-t border-border">
            <UserMenuItem
              icon={HelpCircle}
              label="Help & Support"
              onClick={() => handleMenuItemClick(() => console.log('Help'))}
            />
            
            <UserMenuItem
              icon={LogOut}
              label="Log out"
              onClick={() => handleMenuItemClick(onLogout)}
              variant="destructive"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Compact user menu for mobile/small screens
export function CompactUserMenu({ user, onLogout }: Pick<UserMenuProps, 'user' | 'onLogout'>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-accent hover:text-accent-foreground"
      >
        <UserAvatar user={user} size="sm" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-popover border border-border rounded-lg shadow-lg z-50 py-2">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          
          <div className="py-1">
            <UserMenuItem
              icon={User}
              label="Profile"
              onClick={() => setIsOpen(false)}
            />
            <UserMenuItem
              icon={Settings}
              label="Settings"
              onClick={() => setIsOpen(false)}
            />
            <UserMenuItem
              icon={LogOut}
              label="Log out"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              variant="destructive"
            />
          </div>
        </div>
      )}
    </div>
  );
}