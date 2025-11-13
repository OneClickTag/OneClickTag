import { LoadingState } from '../types';

export type LoadingChangeListener = (loadingState: LoadingState, isLoading: boolean) => void;

export class LoadingManager {
  private loadingStates: Map<string, boolean> = new Map();
  private listeners: LoadingChangeListener[] = [];
  private globalLoading = false;

  /**
   * Set loading state for a specific request
   */
  setLoading(isLoading: boolean, requestId?: string): void {
    const id = requestId || 'global';
    const wasLoading = this.loadingStates.get(id) || false;

    if (isLoading) {
      this.loadingStates.set(id, true);
    } else {
      this.loadingStates.delete(id);
    }

    // Update global loading state
    const newGlobalLoading = this.loadingStates.size > 0;
    const globalLoadingChanged = this.globalLoading !== newGlobalLoading;
    this.globalLoading = newGlobalLoading;

    // Only notify if the loading state actually changed
    if (wasLoading !== isLoading || globalLoadingChanged) {
      this.notifyListeners();
    }
  }

  /**
   * Check if a specific request is loading
   */
  isLoading(requestId?: string): boolean {
    if (requestId) {
      return this.loadingStates.get(requestId) || false;
    }
    return this.globalLoading;
  }

  /**
   * Get all loading states
   */
  getLoadingStates(): LoadingState {
    const states: LoadingState = {};
    for (const [id, loading] of this.loadingStates.entries()) {
      states[id] = loading;
    }
    return states;
  }

  /**
   * Get count of active loading requests
   */
  getLoadingCount(): number {
    return this.loadingStates.size;
  }

  /**
   * Clear specific loading state
   */
  clearLoading(requestId: string): void {
    this.setLoading(false, requestId);
  }

  /**
   * Clear all loading states
   */
  clearAllLoading(): void {
    this.loadingStates.clear();
    this.globalLoading = false;
    this.notifyListeners();
  }

  /**
   * Add loading state change listener
   */
  addListener(listener: LoadingChangeListener): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Remove loading state change listener
   */
  removeListener(listener: LoadingChangeListener): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Create a scoped loading manager for a specific feature
   */
  createScope(scopeName: string): ScopedLoadingManager {
    return new ScopedLoadingManager(this, scopeName);
  }

  /**
   * Set loading state with automatic timeout
   */
  setLoadingWithTimeout(isLoading: boolean, requestId: string, timeout: number = 30000): void {
    this.setLoading(isLoading, requestId);

    if (isLoading) {
      setTimeout(() => {
        if (this.isLoading(requestId)) {
          console.warn(`Request ${requestId} timed out, clearing loading state`);
          this.clearLoading(requestId);
        }
      }, timeout);
    }
  }

  /**
   * Batch loading state updates
   */
  batch(updates: Array<{ requestId: string; isLoading: boolean }>): void {
    let hasChanges = false;

    for (const { requestId, isLoading } of updates) {
      const wasLoading = this.loadingStates.get(requestId) || false;
      
      if (isLoading) {
        this.loadingStates.set(requestId, true);
      } else {
        this.loadingStates.delete(requestId);
      }

      if (wasLoading !== isLoading) {
        hasChanges = true;
      }
    }

    // Update global loading state
    const newGlobalLoading = this.loadingStates.size > 0;
    const globalLoadingChanged = this.globalLoading !== newGlobalLoading;
    this.globalLoading = newGlobalLoading;

    // Only notify if there were actual changes
    if (hasChanges || globalLoadingChanged) {
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    const loadingState = this.getLoadingStates();
    const isGlobalLoading = this.globalLoading;

    this.listeners.forEach(listener => {
      try {
        listener(loadingState, isGlobalLoading);
      } catch (error) {
        console.warn('Error in loading state listener:', error);
      }
    });
  }

  /**
   * Get debug information about loading states
   */
  getDebugInfo(): {
    globalLoading: boolean;
    activeRequests: string[];
    loadingCount: number;
    listenerCount: number;
  } {
    return {
      globalLoading: this.globalLoading,
      activeRequests: Array.from(this.loadingStates.keys()),
      loadingCount: this.loadingStates.size,
      listenerCount: this.listeners.length,
    };
  }
}

/**
 * Scoped loading manager for specific features
 */
export class ScopedLoadingManager {
  constructor(
    private parent: LoadingManager,
    private scope: string
  ) {}

  setLoading(isLoading: boolean, requestId?: string): void {
    const scopedId = requestId ? `${this.scope}:${requestId}` : this.scope;
    this.parent.setLoading(isLoading, scopedId);
  }

  isLoading(requestId?: string): boolean {
    const scopedId = requestId ? `${this.scope}:${requestId}` : this.scope;
    return this.parent.isLoading(scopedId);
  }

  clearLoading(requestId?: string): void {
    const scopedId = requestId ? `${this.scope}:${requestId}` : this.scope;
    this.parent.clearLoading(scopedId);
  }

  clearAllScopedLoading(): void {
    const loadingStates = this.parent.getLoadingStates();
    const scopedKeys = Object.keys(loadingStates).filter(key => key.startsWith(`${this.scope}:`));
    
    for (const key of scopedKeys) {
      this.parent.clearLoading(key);
    }
  }

  addListener(listener: LoadingChangeListener): () => void {
    return this.parent.addListener(listener);
  }
}

// Create and export singleton instance
export const loadingManager = new LoadingManager();

// Export the class for creating custom instances
export default LoadingManager;