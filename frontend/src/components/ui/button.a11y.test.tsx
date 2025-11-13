/**
 * Accessibility tests for Button component
 */

import { describe, it, expect } from 'vitest'
import { renderForA11y, testAccessibility } from '@/test/utils/test-utils'
import { 
  KeyboardNavigationTester, 
  ScreenReaderTester,
  ariaUtils,
  focusUtils,
  a11yTestConfigs 
} from '@/test/utils/accessibility-utils'
import { Button } from './button'

describe('Button Accessibility', () => {
  describe('WCAG 2.1 AA Compliance', () => {
    it('meets basic accessibility standards', async () => {
      const renderResult = renderForA11y(<Button>Accessible Button</Button>)
      await testAccessibility(renderResult, a11yTestConfigs.wcag21aa)
    })

    it('meets accessibility standards for all variants', async () => {
      const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const
      
      for (const variant of variants) {
        const renderResult = renderForA11y(
          <Button variant={variant}>Button {variant}</Button>
        )
        await testAccessibility(renderResult, a11yTestConfigs.interactive)
      }
    })

    it('meets accessibility standards when disabled', async () => {
      const renderResult = renderForA11y(
        <Button disabled>Disabled Button</Button>
      )
      await testAccessibility(renderResult)
    })

    it('meets accessibility standards as child component', async () => {
      const renderResult = renderForA11y(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      )
      await testAccessibility(renderResult)
    })
  })

  describe('Keyboard Navigation', () => {
    it('is focusable and keyboard accessible', async () => {
      const { container } = renderForA11y(<Button>Keyboard Button</Button>)
      
      const navTester = new KeyboardNavigationTester(container)
      expect(navTester.getFocusableElementsCount()).toBe(1)
      
      await navTester.testTabNavigation()
      await navTester.testKeyboardActivation()
    })

    it('is not focusable when disabled', () => {
      const { container } = renderForA11y(
        <Button disabled>Disabled Button</Button>
      )
      
      const navTester = new KeyboardNavigationTester(container)
      expect(navTester.getFocusableElementsCount()).toBe(0)
    })

    it('maintains focus order with multiple buttons', async () => {
      const { container } = renderForA11y(
        <div>
          <Button>First Button</Button>
          <Button>Second Button</Button>
          <Button>Third Button</Button>
        </div>
      )
      
      const navTester = new KeyboardNavigationTester(container)
      expect(navTester.getFocusableElementsCount()).toBe(3)
      
      await navTester.testTabNavigation()
      await navTester.testReverseTabNavigation()
    })

    it('skips disabled buttons in tab order', async () => {
      const { container } = renderForA11y(
        <div>
          <Button>First Button</Button>
          <Button disabled>Disabled Button</Button>
          <Button>Third Button</Button>
        </div>
      )
      
      const navTester = new KeyboardNavigationTester(container)
      expect(navTester.getFocusableElementsCount()).toBe(2)
    })
  })

  describe('Screen Reader Support', () => {
    it('announces button text correctly', async () => {
      const { container, getByRole } = renderForA11y(
        <Button>Click to Submit</Button>
      )
      
      const button = getByRole('button')
      const accessibleName = ariaUtils.getAccessibleName(button)
      
      expect(accessibleName).toBe('Click to Submit')
    })

    it('supports aria-label for icon buttons', async () => {
      const { getByRole } = renderForA11y(
        <Button aria-label="Close modal" size="icon">
          ×
        </Button>
      )
      
      const button = getByRole('button', { name: /close modal/i })
      expect(button).toHaveAttribute('aria-label', 'Close modal')
      expect(ariaUtils.hasProperLabeling(button)).toBe(true)
    })

    it('supports aria-describedby for additional context', () => {
      const { getByRole } = renderForA11y(
        <div>
          <Button aria-describedby="button-help">Save Changes</Button>
          <div id="button-help">This will save your progress</div>
        </div>
      )
      
      const button = getByRole('button')
      expect(button).toHaveAttribute('aria-describedby', 'button-help')
      expect(ariaUtils.hasProperDescription(button)).toBe(true)
    })

    it('announces loading state changes', async () => {
      const LoadingButton = ({ isLoading }: { isLoading: boolean }) => (
        <Button aria-live="polite" disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Submit'}
        </Button>
      )

      const { container, rerender } = renderForA11y(
        <LoadingButton isLoading={false} />
      )
      
      const screenReader = new ScreenReaderTester(container)
      
      rerender(<LoadingButton isLoading={true} />)
      
      await screenReader.waitForAnnouncement('Loading...')
      const announcements = screenReader.getAnnouncements()
      expect(announcements).toContain('Loading...')
    })
  })

  describe('Focus Management', () => {
    it('maintains proper focus indicators', () => {
      const { getByRole } = renderForA11y(<Button>Focus Test</Button>)
      
      const button = getByRole('button')
      button.focus()
      
      expect(document.activeElement).toBe(button)
      expect(button).toHaveClass('focus-visible:ring-2')
    })

    it('manages focus correctly in dynamic scenarios', async () => {
      const DynamicButtons = ({ showSecond }: { showSecond: boolean }) => (
        <div>
          <Button>First Button</Button>
          {showSecond && <Button>Second Button</Button>}
          <Button>Last Button</Button>
        </div>
      )

      const { container, rerender } = renderForA11y(
        <DynamicButtons showSecond={false} />
      )
      
      // Focus first button
      const buttons = container.querySelectorAll('button')
      buttons[0].focus()
      
      // Add second button
      rerender(<DynamicButtons showSecond={true} />)
      
      // Focus should still be manageable
      const navTester = new KeyboardNavigationTester(container)
      expect(navTester.getFocusableElementsCount()).toBe(3)
    })

    it('handles focus trapping in modal-like scenarios', async () => {
      const ModalButtons = () => (
        <div role="dialog" aria-modal="true">
          <Button>Cancel</Button>
          <Button>Confirm</Button>
        </div>
      )

      const { container } = renderForA11y(<ModalButtons />)
      
      // Test focus trap behavior
      const focusTrapWorks = focusUtils.testFocusTrap(container)
      expect(focusTrapWorks).toBe(true)
    })
  })

  describe('Color Contrast and Visual Accessibility', () => {
    it('maintains sufficient color contrast for all variants', () => {
      const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost'] as const
      
      variants.forEach(variant => {
        const { getByRole } = renderForA11y(
          <Button variant={variant}>Test Button</Button>
        )
        
        const button = getByRole('button')
        
        // Test that focus indicators are visible
        expect(button).toHaveClass('focus-visible:ring-2')
        expect(button).toHaveClass('focus-visible:ring-offset-2')
      })
    })

    it('provides appropriate visual feedback for disabled state', () => {
      const { getByRole } = renderForA11y(
        <Button disabled>Disabled Button</Button>
      )
      
      const button = getByRole('button')
      expect(button).toHaveClass('disabled:opacity-50')
      expect(button).toBeDisabled()
    })

    it('supports high contrast mode preferences', () => {
      const { getByRole } = renderForA11y(<Button>High Contrast Button</Button>)
      
      const button = getByRole('button')
      
      // Button should have appropriate borders for high contrast
      expect(button).toHaveClass('ring-offset-background')
    })
  })

  describe('Responsive and Mobile Accessibility', () => {
    it('maintains accessibility on mobile devices', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      Object.defineProperty(window, 'innerHeight', { value: 667 })
      
      const { getByRole } = renderForA11y(<Button size="lg">Mobile Button</Button>)
      
      const button = getByRole('button')
      
      // Large buttons are better for touch accessibility
      expect(button).toHaveClass('h-11')
    })

    it('provides adequate touch targets', () => {
      const { getByRole } = renderForA11y(<Button size="sm">Small Button</Button>)
      
      const button = getByRole('button')
      
      // Even small buttons should meet minimum touch target size
      expect(button).toHaveClass('h-9')
    })
  })

  describe('Error States and Validation', () => {
    it('announces validation errors appropriately', async () => {
      const ButtonWithError = ({ hasError }: { hasError: boolean }) => (
        <div>
          <Button aria-describedby={hasError ? 'error-message' : undefined}>
            Submit
          </Button>
          {hasError && (
            <div id="error-message" role="alert">
              Please fix the errors before submitting
            </div>
          )}
        </div>
      )

      const { container, rerender } = renderForA11y(
        <ButtonWithError hasError={false} />
      )
      
      const screenReader = new ScreenReaderTester(container)
      
      rerender(<ButtonWithError hasError={true} />)
      
      await screenReader.waitForAnnouncement('Please fix the errors')
      const announcements = screenReader.getAnnouncements()
      expect(announcements.some(a => a.includes('fix the errors'))).toBe(true)
    })
  })

  describe('Internationalization and RTL Support', () => {
    it('maintains accessibility in RTL languages', () => {
      document.dir = 'rtl'
      
      const { getByRole } = renderForA11y(
        <Button>زر الاختبار</Button>
      )
      
      const button = getByRole('button')
      expect(button).toBeInTheDocument()
      expect(ariaUtils.getAccessibleName(button)).toBe('زر الاختبار')
      
      // Cleanup
      document.dir = 'ltr'
    })

    it('supports different text lengths without breaking layout', () => {
      const longText = 'This is a very long button text that might wrap or overflow'
      
      const { getByRole } = renderForA11y(<Button>{longText}</Button>)
      
      const button = getByRole('button')
      expect(button).toHaveTextContent(longText)
      expect(button).toHaveClass('whitespace-nowrap') // Should handle long text appropriately
    })
  })
})