## Login Detection System
- Centralized in `nextjs/src/lib/site-scanner/constants/login-patterns.ts`
- Used by: auth-handler.ts, html-crawler.ts, chunk-processor.ts
- 73+ URL patterns, 60+ content patterns, 16+ link patterns
- Covers: WordPress, Rails, Django, Magento, WooCommerce, Shopify, Drupal, Joomla, NextAuth, CAS, SAML, ADFS, Keycloak + internationalized paths
- auth-handler serializes RegExp for page.evaluate() context (can't pass RegExp across Playwright contexts)
- chunk-processor has TWO chunk functions: Playwright-based and HTML-based - both need updating when making login changes
