'use client';

import { useState, useCallback, useRef } from 'react';

interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useInView<T extends HTMLElement = HTMLElement>(
  options: UseInViewOptions = {}
): [(node: T | null) => void, boolean] {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options;
  const [isInView, setIsInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<T | null>(null);

  const ref = useCallback(
    (node: T | null) => {
      // Cleanup previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      // Store element reference
      elementRef.current = node;

      if (!node) return;

      // Fallback for browsers without IntersectionObserver
      if (typeof IntersectionObserver === 'undefined') {
        setIsInView(true);
        return;
      }

      // Create new observer
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            if (triggerOnce && observerRef.current) {
              observerRef.current.unobserve(node);
            }
          } else if (!triggerOnce) {
            setIsInView(false);
          }
        },
        { threshold, rootMargin }
      );

      observerRef.current.observe(node);
    },
    [threshold, rootMargin, triggerOnce]
  );

  return [ref, isInView];
}
