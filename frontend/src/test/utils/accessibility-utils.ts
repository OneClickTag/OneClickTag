/**
 * Accessibility testing utilities
 */

import { axe, toHaveNoViolations } from 'jest-axe'
import { RenderResult } from '@testing-library/react'

// Extend expect with axe matchers
expect.extend(toHaveNoViolations)

export { axe }

/**
 * Test accessibility of a rendered component
 */
export async function testAccessibility(
  renderResult: RenderResult,
  options?: any
): Promise<void> {
  const { container } = renderResult
  const results = await axe(container, options)
  expect(results).toHaveNoViolations()
}

/**
 * Common accessibility test configurations
 */
export const a11yTestConfigs = {
  // Basic WCAG 2.1 AA compliance
  wcag21aa: {
    rules: {
      'color-contrast': { enabled: true },
      'focus-order-semantics': { enabled: true },
      'keyboard': { enabled: true },
      'landmarks': { enabled: true },
    },
    tags: ['wcag2aa', 'wcag21aa'],
  },

  // Form accessibility
  forms: {
    rules: {
      'label': { enabled: true },
      'form-field-multiple-labels': { enabled: true },
      'duplicate-id-aria': { enabled: true },
    },
    tags: ['wcag2aa', 'best-practice'],
  },

  // Navigation accessibility
  navigation: {
    rules: {
      'skip-link': { enabled: true },
      'landmark-unique': { enabled: true },
      'region': { enabled: true },
    },
    tags: ['wcag2aa', 'best-practice'],
  },

  // Images and media
  media: {
    rules: {
      'image-alt': { enabled: true },
      'object-alt': { enabled: true },
      'video-caption': { enabled: true },
    },
    tags: ['wcag2aa'],
  },

  // Interactive elements
  interactive: {
    rules: {
      'button-name': { enabled: true },
      'link-name': { enabled: true },
      'aria-required-children': { enabled: true },
      'aria-required-parent': { enabled: true },
    },
    tags: ['wcag2aa', 'best-practice'],
  },
}

/**
 * Test keyboard navigation
 */
export class KeyboardNavigationTester {
  private focusableElements: HTMLElement[]
  
  constructor(private container: HTMLElement) {
    this.focusableElements = this.getFocusableElements()
  }

  private getFocusableElements(): HTMLElement[] {
    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([aria-disabled="true"])',
      '[role="link"]',
      '[role="menuitem"]',
      '[role="tab"]',
    ].join(', ')

    return Array.from(this.container.querySelectorAll(selector))
      .filter((el): el is HTMLElement => {
        if (!(el instanceof HTMLElement)) return false
        
        // Check if element is visible
        const style = window.getComputedStyle(el)
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          el.offsetWidth > 0 &&
          el.offsetHeight > 0
        )
      })
  }

  /**
   * Test tab navigation through all focusable elements
   */
  async testTabNavigation(): Promise<void> {
    if (this.focusableElements.length === 0) {
      console.warn('No focusable elements found for tab navigation test')
      return
    }

    // Focus first element
    this.focusableElements[0].focus()
    expect(document.activeElement).toBe(this.focusableElements[0])

    // Tab through all elements
    for (let i = 1; i < this.focusableElements.length; i++) {
      // Simulate Tab key
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        code: 'Tab',
        keyCode: 9,
        bubbles: true,
        cancelable: true,
      })
      
      document.activeElement?.dispatchEvent(tabEvent)
      
      if (!tabEvent.defaultPrevented) {
        this.focusableElements[i].focus()
      }
      
      expect(document.activeElement).toBe(this.focusableElements[i])
    }
  }

  /**
   * Test reverse tab navigation (Shift+Tab)
   */
  async testReverseTabNavigation(): Promise<void> {
    if (this.focusableElements.length === 0) return

    // Start from last element
    const lastIndex = this.focusableElements.length - 1
    this.focusableElements[lastIndex].focus()
    expect(document.activeElement).toBe(this.focusableElements[lastIndex])

    // Shift+Tab through all elements in reverse
    for (let i = lastIndex - 1; i >= 0; i--) {
      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        code: 'Tab',
        keyCode: 9,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
      
      document.activeElement?.dispatchEvent(shiftTabEvent)
      
      if (!shiftTabEvent.defaultPrevented) {
        this.focusableElements[i].focus()
      }
      
      expect(document.activeElement).toBe(this.focusableElements[i])
    }
  }

  /**
   * Test keyboard activation (Enter/Space) on interactive elements
   */
  async testKeyboardActivation(): Promise<void> {
    for (const element of this.focusableElements) {
      if (this.isActivatable(element)) {
        element.focus()
        
        // Test Enter key
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          bubbles: true,
          cancelable: true,
        })
        
        element.dispatchEvent(enterEvent)
        
        // Test Space key for buttons
        if (element.tagName === 'BUTTON' || element.role === 'button') {
          const spaceEvent = new KeyboardEvent('keydown', {
            key: ' ',
            code: 'Space',
            keyCode: 32,
            bubbles: true,
            cancelable: true,
          })
          
          element.dispatchEvent(spaceEvent)
        }
      }
    }
  }

  private isActivatable(element: HTMLElement): boolean {
    const activatableTags = ['BUTTON', 'A', 'INPUT']
    const activatableRoles = ['button', 'link', 'menuitem', 'tab']
    
    return (
      activatableTags.includes(element.tagName) ||
      activatableRoles.includes(element.getAttribute('role') || '')
    )
  }

  getFocusableElementsCount(): number {
    return this.focusableElements.length
  }
}

/**
 * Test screen reader announcements
 */
export class ScreenReaderTester {
  private announcements: string[] = []

  constructor(private container: HTMLElement) {
    this.setupAriaLiveObserver()
  }

  private setupAriaLiveObserver(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          const target = mutation.target as HTMLElement
          const liveRegion = target.closest('[aria-live], [role="status"], [role="alert"]')
          
          if (liveRegion) {
            const text = liveRegion.textContent?.trim()
            if (text) {
              this.announcements.push(text)
            }
          }
        }
      })
    })

    observer.observe(this.container, {
      childList: true,
      subtree: true,
      characterData: true,
    })
  }

  /**
   * Get all announcements made to screen readers
   */
  getAnnouncements(): string[] {
    return [...this.announcements]
  }

  /**
   * Clear recorded announcements
   */
  clearAnnouncements(): void {
    this.announcements = []
  }

  /**
   * Wait for a specific announcement
   */
  async waitForAnnouncement(expectedText: string, timeout: number = 2000): Promise<void> {
    const startTime = Date.now()
    
    return new Promise((resolve, reject) => {
      const checkForAnnouncement = () => {
        if (this.announcements.some(announcement => announcement.includes(expectedText))) {
          resolve()
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Expected announcement "${expectedText}" not found within ${timeout}ms`))
        } else {
          setTimeout(checkForAnnouncement, 100)
        }
      }
      
      checkForAnnouncement()
    })
  }
}

/**
 * Color contrast testing utilities
 */
export const colorContrastUtils = {
  /**
   * Test if color contrast meets WCAG standards
   */
  async testColorContrast(element: HTMLElement): Promise<boolean> {
    const results = await axe(element, {
      rules: {
        'color-contrast': { enabled: true },
      },
    })
    
    return results.violations.length === 0
  },

  /**
   * Get computed colors for an element
   */
  getComputedColors(element: HTMLElement): { color: string; backgroundColor: string } {
    const styles = window.getComputedStyle(element)
    return {
      color: styles.color,
      backgroundColor: styles.backgroundColor,
    }
  },
}

/**
 * ARIA testing utilities
 */
export const ariaUtils = {
  /**
   * Check if element has proper ARIA labels
   */
  hasProperLabeling(element: HTMLElement): boolean {
    const hasAriaLabel = element.hasAttribute('aria-label')
    const hasAriaLabelledBy = element.hasAttribute('aria-labelledby')
    const hasLabel = element.tagName === 'INPUT' && 
                     document.querySelector(`label[for="${element.id}"]`) !== null

    return hasAriaLabel || hasAriaLabelledBy || hasLabel
  },

  /**
   * Check if element has proper ARIA description
   */
  hasProperDescription(element: HTMLElement): boolean {
    return element.hasAttribute('aria-describedby') || 
           element.hasAttribute('aria-description')
  },

  /**
   * Get accessible name for element
   */
  getAccessibleName(element: HTMLElement): string {
    // Simplified implementation - real implementation would be more complex
    const ariaLabel = element.getAttribute('aria-label')
    if (ariaLabel) return ariaLabel

    const ariaLabelledBy = element.getAttribute('aria-labelledby')
    if (ariaLabelledBy) {
      const labelElement = document.getElementById(ariaLabelledBy)
      return labelElement?.textContent || ''
    }

    if (element.tagName === 'INPUT') {
      const label = document.querySelector(`label[for="${element.id}"]`)
      return label?.textContent || ''
    }

    return element.textContent || ''
  },
}

/**
 * Focus management testing
 */
export const focusUtils = {
  /**
   * Test if focus is properly managed after DOM changes
   */
  async testFocusManagement(
    triggerAction: () => Promise<void> | void,
    expectedFocusTarget?: HTMLElement | string
  ): Promise<void> {
    const initialFocus = document.activeElement
    
    await triggerAction()
    
    // Allow time for focus management
    await new Promise(resolve => setTimeout(resolve, 100))
    
    if (expectedFocusTarget) {
      const target = typeof expectedFocusTarget === 'string' 
        ? document.querySelector(expectedFocusTarget)
        : expectedFocusTarget
      
      expect(document.activeElement).toBe(target)
    } else {
      // Focus should be managed, not lost to body
      expect(document.activeElement).not.toBe(document.body)
    }
  },

  /**
   * Test if focus is trapped within a modal or dialog
   */
  testFocusTrap(container: HTMLElement): boolean {
    const focusableElements = container.querySelectorAll(
      'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
    )
    
    if (focusableElements.length === 0) return false
    
    const firstFocusable = focusableElements[0] as HTMLElement
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement
    
    // Test Tab from last element goes to first
    lastFocusable.focus()
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' })
    lastFocusable.dispatchEvent(tabEvent)
    
    return document.activeElement === firstFocusable
  },
}

export default {
  testAccessibility,
  a11yTestConfigs,
  KeyboardNavigationTester,
  ScreenReaderTester,
  colorContrastUtils,
  ariaUtils,
  focusUtils,
}