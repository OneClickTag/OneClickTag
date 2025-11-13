/**
 * Unit tests for Button component
 */

import { describe, it, expect, vi } from 'vitest'
import { renderWithUser, testAccessibility } from '@/test/utils/test-utils'
import { Button } from './button'

describe('Button', () => {
  describe('Rendering', () => {
    it('renders button with default variant and size', () => {
      const { getByRole } = renderWithUser(<Button>Click me</Button>)
      
      const button = getByRole('button', { name: /click me/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center')
      expect(button.tagName).toBe('BUTTON')
    })

    it('renders button with custom className', () => {
      const { getByRole } = renderWithUser(
        <Button className="custom-class">Click me</Button>
      )
      
      const button = getByRole('button')
      expect(button).toHaveClass('custom-class')
    })

    it('renders button with different variants', () => {
      const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const
      
      variants.forEach(variant => {
        const { getByRole } = renderWithUser(
          <Button variant={variant}>Click me</Button>
        )
        
        const button = getByRole('button')
        expect(button).toBeInTheDocument()
        
        // Check that appropriate variant classes are applied
        if (variant === 'destructive') {
          expect(button).toHaveClass('bg-destructive')
        } else if (variant === 'outline') {
          expect(button).toHaveClass('border')
        } else if (variant === 'secondary') {
          expect(button).toHaveClass('bg-secondary')
        }
      })
    })

    it('renders button with different sizes', () => {
      const sizes = ['default', 'sm', 'lg', 'icon'] as const
      
      sizes.forEach(size => {
        const { getByRole } = renderWithUser(
          <Button size={size}>Click me</Button>
        )
        
        const button = getByRole('button')
        expect(button).toBeInTheDocument()
        
        // Check that appropriate size classes are applied
        if (size === 'sm') {
          expect(button).toHaveClass('h-9')
        } else if (size === 'lg') {
          expect(button).toHaveClass('h-11')
        } else if (size === 'icon') {
          expect(button).toHaveClass('h-10', 'w-10')
        }
      })
    })

    it('renders as child component when asChild is true', () => {
      const { getByRole } = renderWithUser(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      )
      
      const link = getByRole('link', { name: /link button/i })
      expect(link).toBeInTheDocument()
      expect(link.tagName).toBe('A')
      expect(link).toHaveAttribute('href', '/test')
    })

    it('renders disabled button correctly', () => {
      const { getByRole } = renderWithUser(
        <Button disabled>Disabled Button</Button>
      )
      
      const button = getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:opacity-50', 'disabled:pointer-events-none')
    })
  })

  describe('Interactions', () => {
    it('calls onClick handler when clicked', async () => {
      const handleClick = vi.fn()
      const { user, getByRole } = renderWithUser(
        <Button onClick={handleClick}>Click me</Button>
      )
      
      const button = getByRole('button')
      await user.click(button)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when disabled', async () => {
      const handleClick = vi.fn()
      const { user, getByRole } = renderWithUser(
        <Button onClick={handleClick} disabled>Click me</Button>
      )
      
      const button = getByRole('button')
      await user.click(button)
      
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('responds to keyboard navigation', async () => {
      const handleClick = vi.fn()
      const { user, getByRole } = renderWithUser(
        <Button onClick={handleClick}>Click me</Button>
      )
      
      const button = getByRole('button')
      
      // Tab to button and press Enter
      await user.tab()
      expect(button).toHaveFocus()
      
      await user.keyboard('{Enter}')
      expect(handleClick).toHaveBeenCalledTimes(1)
      
      // Press Space
      await user.keyboard(' ')
      expect(handleClick).toHaveBeenCalledTimes(2)
    })

    it('supports custom event handlers', async () => {
      const handleMouseEnter = vi.fn()
      const handleMouseLeave = vi.fn()
      const handleFocus = vi.fn()
      const handleBlur = vi.fn()
      
      const { user, getByRole } = renderWithUser(
        <Button
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          Hover me
        </Button>
      )
      
      const button = getByRole('button')
      
      await user.hover(button)
      expect(handleMouseEnter).toHaveBeenCalled()
      
      await user.unhover(button)
      expect(handleMouseLeave).toHaveBeenCalled()
      
      button.focus()
      expect(handleFocus).toHaveBeenCalled()
      
      button.blur()
      expect(handleBlur).toHaveBeenCalled()
    })
  })

  describe('HTML Attributes', () => {
    it('forwards HTML attributes correctly', () => {
      const { getByRole } = renderWithUser(
        <Button
          type="submit"
          id="submit-button"
          data-testid="submit-btn"
          aria-label="Submit form"
        >
          Submit
        </Button>
      )
      
      const button = getByRole('button')
      expect(button).toHaveAttribute('type', 'submit')
      expect(button).toHaveAttribute('id', 'submit-button')
      expect(button).toHaveAttribute('data-testid', 'submit-btn')
      expect(button).toHaveAttribute('aria-label', 'Submit form')
    })

    it('supports ref forwarding', () => {
      let buttonRef: HTMLButtonElement | null = null
      
      renderWithUser(
        <Button ref={(ref) => { buttonRef = ref }}>
          Referenced Button
        </Button>
      )
      
      expect(buttonRef).toBeInstanceOf(HTMLButtonElement)
      expect(buttonRef?.textContent).toBe('Referenced Button')
    })
  })

  describe('Accessibility', () => {
    it('meets accessibility standards', async () => {
      const renderResult = renderWithUser(<Button>Accessible Button</Button>)
      await testAccessibility(renderResult)
    })

    it('has proper focus indicators', () => {
      const { getByRole } = renderWithUser(<Button>Focus me</Button>)
      
      const button = getByRole('button')
      expect(button).toHaveClass('focus-visible:outline-none')
      expect(button).toHaveClass('focus-visible:ring-2')
      expect(button).toHaveClass('focus-visible:ring-ring')
      expect(button).toHaveClass('focus-visible:ring-offset-2')
    })

    it('supports ARIA attributes', () => {
      const { getByRole } = renderWithUser(
        <Button
          aria-label="Close dialog"
          aria-describedby="close-description"
          role="button"
        >
          ×
        </Button>
      )
      
      const button = getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Close dialog')
      expect(button).toHaveAttribute('aria-describedby', 'close-description')
    })

    it('indicates disabled state to screen readers', () => {
      const { getByRole } = renderWithUser(
        <Button disabled>Disabled Button</Button>
      )
      
      const button = getByRole('button')
      expect(button).toHaveAttribute('disabled')
      expect(button).toHaveClass('disabled:opacity-50')
    })
  })

  describe('Loading States', () => {
    it('supports loading state with custom content', async () => {
      const LoadingButton = ({ isLoading, ...props }: { isLoading: boolean } & React.ComponentProps<typeof Button>) => (
        <Button disabled={isLoading} {...props}>
          {isLoading ? (
            <>
              <span className="animate-spin mr-2">⟳</span>
              Loading...
            </>
          ) : (
            props.children
          )}
        </Button>
      )

      const { getByRole, rerender } = renderWithUser(
        <LoadingButton isLoading={false}>Save</LoadingButton>
      )
      
      let button = getByRole('button')
      expect(button).toHaveTextContent('Save')
      expect(button).not.toBeDisabled()
      
      rerender(<LoadingButton isLoading={true}>Save</LoadingButton>)
      
      button = getByRole('button')
      expect(button).toHaveTextContent('Loading...')
      expect(button).toBeDisabled()
    })
  })

  describe('Integration with Forms', () => {
    it('works correctly in forms', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault())
      
      const { user, getByRole } = renderWithUser(
        <form onSubmit={handleSubmit}>
          <Button type="submit">Submit Form</Button>
        </form>
      )
      
      const button = getByRole('button', { name: /submit form/i })
      await user.click(button)
      
      expect(handleSubmit).toHaveBeenCalled()
    })

    it('prevents form submission when disabled', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault())
      
      const { user, getByRole } = renderWithUser(
        <form onSubmit={handleSubmit}>
          <Button type="submit" disabled>Submit Form</Button>
        </form>
      )
      
      const button = getByRole('button')
      await user.click(button)
      
      expect(handleSubmit).not.toHaveBeenCalled()
    })
  })

  describe('Visual Variants Edge Cases', () => {
    it('combines multiple variant classes correctly', () => {
      const { getByRole } = renderWithUser(
        <Button variant="outline" size="lg" className="border-red-500">
          Large Outlined Button
        </Button>
      )
      
      const button = getByRole('button')
      expect(button).toHaveClass('border', 'bg-background', 'h-11', 'border-red-500')
    })

    it('handles conflicting CSS classes appropriately', () => {
      const { getByRole } = renderWithUser(
        <Button className="bg-red-500 hover:bg-blue-500">
          Custom Colored Button
        </Button>
      )
      
      const button = getByRole('button')
      // The custom classes should be applied
      expect(button).toHaveClass('bg-red-500', 'hover:bg-blue-500')
      // But also includes the default button classes
      expect(button).toHaveClass('inline-flex', 'items-center')
    })
  })
})