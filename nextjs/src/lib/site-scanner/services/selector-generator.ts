import { ExtractedElement, SelectorConfig } from '../interfaces';

/**
 * Generate CSS selectors with confidence scores for elements.
 * Priority: ID > data-attr > unique-class > ARIA > structural
 *
 * Converted from NestJS service to plain TypeScript functions.
 */

/**
 * Generate a CSS selector with confidence score for an element.
 */
export function generateSelector(element: ExtractedElement): SelectorConfig {
  const selectors: SelectorConfig['selectors'] = [];
  const fallbacks: string[] = [];

  // 1. ID-based selector (highest confidence)
  if (element.id) {
    selectors.push({
      selector: `#${cssEscape(element.id)}`,
      confidence: 0.95,
      method: 'id',
    });
  }

  // 2. Data attribute selector
  if (element.dataAttributes) {
    for (const [key, value] of Object.entries(element.dataAttributes)) {
      if (key.startsWith('data-') && value) {
        selectors.push({
          selector: `[${key}="${cssEscape(value)}"]`,
          confidence: 0.85,
          method: 'data-attr',
        });
        break; // Only use the first data attribute
      }
    }
  }

  // 3. Name attribute (for form elements)
  if (element.name && (element.tagName === 'input' || element.tagName === 'form')) {
    selectors.push({
      selector: `${element.tagName}[name="${cssEscape(element.name)}"]`,
      confidence: 0.85,
      method: 'data-attr',
    });
  }

  // 4. Unique class-based selector
  if (element.className) {
    const classes = element.className.split(/\s+/).filter(c => c && !isGenericClass(c));
    for (const cls of classes.slice(0, 3)) {
      const selector = `${element.tagName}.${cssEscape(cls)}`;
      selectors.push({
        selector,
        confidence: 0.7,
        method: 'unique-class',
      });
      break;
    }
  }

  // 5. ARIA label selector
  if (element.ariaLabel) {
    selectors.push({
      selector: `${element.tagName}[aria-label="${cssEscape(element.ariaLabel)}"]`,
      confidence: 0.75,
      method: 'aria',
    });
  }

  // 6. Structural selector (lowest confidence)
  if (selectors.length === 0) {
    const structural = buildStructuralSelector(element);
    if (structural) {
      selectors.push({
        selector: structural,
        confidence: 0.4,
        method: 'structural',
      });
    }
  }

  // 7. Text-based fallback
  if (element.text) {
    const textSelector = buildTextSelector(element);
    if (textSelector) {
      fallbacks.push(textSelector);
    }
  }

  // Sort by confidence
  selectors.sort((a, b) => b.confidence - a.confidence);

  return { selectors, fallbacks };
}

/**
 * Get the best selector string and its confidence.
 */
export function getBestSelector(config: SelectorConfig): { selector: string; confidence: number } | null {
  if (config.selectors.length === 0) {
    if (config.fallbacks.length > 0) {
      return { selector: config.fallbacks[0], confidence: 0.3 };
    }
    return null;
  }
  return { selector: config.selectors[0].selector, confidence: config.selectors[0].confidence };
}

function buildStructuralSelector(element: ExtractedElement): string | null {
  const parts: string[] = [element.tagName];

  if (element.type) {
    parts.push(`[type="${element.type}"]`);
  }

  if (element.href) {
    // Use href pattern for links
    if (element.href.startsWith('tel:')) {
      return 'a[href^="tel:"]';
    }
    if (element.href.startsWith('mailto:')) {
      return 'a[href^="mailto:"]';
    }
    if (element.href.match(/\.(pdf|doc|docx|xls|xlsx|zip)$/i)) {
      const ext = element.href.match(/\.(\w+)$/)?.[1];
      return `a[href$=".${ext}"]`;
    }
  }

  return parts.length > 1 ? parts.join('') : null;
}

function buildTextSelector(element: ExtractedElement): string | null {
  if (!element.text || element.text.length > 50) return null;
  // Use contains-text approach (GTM Click Text variable)
  return `${element.tagName}:contains("${element.text.slice(0, 30)}")`;
}

function isGenericClass(cls: string): boolean {
  const genericPatterns = [
    /^(container|wrapper|row|col|flex|grid|block|section|content|inner|outer)$/i,
    /^(mt|mb|ml|mr|mx|my|pt|pb|pl|pr|px|py|m|p)-/i, // Tailwind spacing
    /^(w|h|min|max)-/i, // Tailwind sizing
    /^(text|font|bg|border|rounded|shadow|opacity)-/i, // Tailwind styling
    /^(sm|md|lg|xl|2xl):/i, // Tailwind responsive
    /^(hover|focus|active|disabled):/i, // Tailwind states
    /^(d|display|position|float|clear|overflow|visibility)-/i,
    /^(hidden|visible|relative|absolute|fixed|sticky)$/i,
    /^(active|selected|open|closed|expanded|collapsed)$/i,
  ];

  return genericPatterns.some(p => p.test(cls));
}

function cssEscape(value: string): string {
  // Simple CSS escape - replace special characters
  return value.replace(/([^\w-])/g, '\\$1');
}
