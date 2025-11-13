import React from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  target?: HTMLElement | Document;
}

/**
 * Hook for handling keyboard shortcuts
 */
export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  target = document,
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = React.useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  React.useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeShortcuts = shortcutsRef.current;

      for (const shortcut of activeShortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey;
        const metaMatches = !!shortcut.metaKey === event.metaKey;
        const shiftMatches = !!shortcut.shiftKey === event.shiftKey;
        const altMatches = !!shortcut.altKey === event.altKey;

        if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          if (shortcut.stopPropagation) {
            event.stopPropagation();
          }
          shortcut.action();
          break;
        }
      }
    };

    target.addEventListener('keydown', handleKeyDown as EventListener);

    return () => {
      target.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [enabled, target]);

  return shortcutsRef.current;
}

/**
 * Hook for managing global search keyboard shortcuts
 */
export function useSearchKeyboardShortcuts(callbacks: {
  onOpenSearch: () => void;
  onCloseSearch: () => void;
  onNavigateUp: () => void;
  onNavigateDown: () => void;
  onSelectResult: () => void;
  onClearSearch: () => void;
}) {
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  const shortcuts: KeyboardShortcut[] = React.useMemo(() => [
    // Global shortcut to open search (Cmd+K / Ctrl+K)
    {
      key: 'k',
      metaKey: true, // Cmd on Mac
      action: () => {
        callbacks.onOpenSearch();
        setIsSearchOpen(true);
      },
      description: 'Open search',
    },
    {
      key: 'k',
      ctrlKey: true, // Ctrl on Windows/Linux
      action: () => {
        callbacks.onOpenSearch();
        setIsSearchOpen(true);
      },
      description: 'Open search',
    },
    // Alternative search shortcut (/)
    {
      key: '/',
      action: () => {
        // Only trigger if not in input field
        const activeElement = document.activeElement;
        const isInInputField = activeElement?.tagName === 'INPUT' || 
                              activeElement?.tagName === 'TEXTAREA' ||
                              activeElement?.hasAttribute('contenteditable');
        
        if (!isInInputField) {
          callbacks.onOpenSearch();
          setIsSearchOpen(true);
        }
      },
      description: 'Quick search',
      preventDefault: false, // Let it type "/" in input fields
    },
    // Close search (Escape)
    {
      key: 'Escape',
      action: () => {
        if (isSearchOpen) {
          callbacks.onCloseSearch();
          setIsSearchOpen(false);
        }
      },
      description: 'Close search',
    },
    // Navigate search results (Arrow keys)
    {
      key: 'ArrowUp',
      action: callbacks.onNavigateUp,
      description: 'Navigate up in search results',
    },
    {
      key: 'ArrowDown',
      action: callbacks.onNavigateDown,
      description: 'Navigate down in search results',
    },
    // Select search result (Enter)
    {
      key: 'Enter',
      action: callbacks.onSelectResult,
      description: 'Select search result',
    },
    // Clear search (Ctrl+L / Cmd+L)
    {
      key: 'l',
      metaKey: true,
      action: callbacks.onClearSearch,
      description: 'Clear search',
    },
    {
      key: 'l',
      ctrlKey: true,
      action: callbacks.onClearSearch,
      description: 'Clear search',
    },
  ], [callbacks, isSearchOpen]);

  useKeyboardShortcuts({
    shortcuts,
    enabled: true,
  });

  return {
    shortcuts,
    isSearchOpen,
    setIsSearchOpen,
  };
}

/**
 * Hook for detecting Mac vs PC for showing correct keyboard shortcuts
 */
export function useOperatingSystem() {
  const [isMac, setIsMac] = React.useState(false);

  React.useEffect(() => {
    const platform = navigator.platform.toLowerCase();
    const userAgent = navigator.userAgent.toLowerCase();
    
    const isMacOs = platform.includes('mac') || 
                   userAgent.includes('mac') ||
                   platform.includes('darwin');
    
    setIsMac(isMacOs);
  }, []);

  return {
    isMac,
    isWindows: !isMac,
    modifierKey: isMac ? 'cmd' : 'ctrl',
    modifierSymbol: isMac ? '⌘' : 'Ctrl',
  };
}

/**
 * Hook for formatting keyboard shortcuts for display
 */
export function useShortcutDisplay() {
  const { isMac, modifierSymbol } = useOperatingSystem();

  const formatShortcut = React.useCallback((shortcut: KeyboardShortcut): string => {
    const parts: string[] = [];

    if (shortcut.ctrlKey && !isMac) parts.push('Ctrl');
    if (shortcut.metaKey && isMac) parts.push('⌘');
    if (shortcut.metaKey && !isMac) parts.push('Win');
    if (shortcut.shiftKey) parts.push(isMac ? '⇧' : 'Shift');
    if (shortcut.altKey) parts.push(isMac ? '⌥' : 'Alt');

    // Format the key
    let key = shortcut.key;
    if (key === ' ') key = 'Space';
    else if (key === 'Escape') key = isMac ? '⎋' : 'Esc';
    else if (key === 'Enter') key = isMac ? '↵' : 'Enter';
    else if (key === 'ArrowUp') key = '↑';
    else if (key === 'ArrowDown') key = '↓';
    else if (key === 'ArrowLeft') key = '←';
    else if (key === 'ArrowRight') key = '→';
    else key = key.toUpperCase();

    parts.push(key);

    return parts.join(isMac ? '' : '+');
  }, [isMac]);

  const getSearchShortcut = React.useCallback((): string => {
    return isMac ? '⌘K' : 'Ctrl+K';
  }, [isMac]);

  return {
    formatShortcut,
    getSearchShortcut,
    modifierSymbol,
    isMac,
  };
}

/**
 * Hook for preventing default browser shortcuts
 */
export function usePreventBrowserShortcuts(shortcuts: string[]) {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const shortcutString = [
        event.ctrlKey && 'ctrl',
        event.metaKey && 'meta',
        event.shiftKey && 'shift',
        event.altKey && 'alt',
        event.key.toLowerCase(),
      ].filter(Boolean).join('+');

      if (shortcuts.includes(shortcutString)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [shortcuts]);
}