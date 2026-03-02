/**
 * Comprehensive login page detection patterns.
 * Centralized constants used by auth-handler, html-crawler, and chunk-processor.
 *
 * Covers: WordPress, Rails/Devise, Django, Magento, WooCommerce, Shopify,
 * Drupal, Joomla, Laravel, NextAuth, CAS, SAML, and many more.
 * Includes internationalized paths (French, Spanish, German, Italian, Dutch, Portuguese, etc.).
 */

// ─── URL Path Patterns ──────────────────────────────────────────────────────
// Each regex matches against the URL path (pathname + optionally hash path).
// Order doesn't matter — any match means "login page".

export const LOGIN_URL_PATTERNS: RegExp[] = [
  // Generic login/signin/auth paths
  /\/log[-_]?in(?:\/|$|\?)/i,
  /\/sign[-_]?in(?:\/|$|\?)/i,
  /\/auth(?:enticate)?(?:\/|$|\?)/i,
  /\/authorization(?:\/|$|\?)/i,
  /\/log[-_]?on(?:\/|$|\?)/i,
  /\/sso(?:\/|$|\?)/i,

  // Nested account/user login paths
  /\/account\/(?:log[-_]?in|sign[-_]?in)(?:\/|$|\?)/i,
  /\/accounts\/(?:log[-_]?in|sign[-_]?in)(?:\/|$|\?)/i,
  /\/user\/(?:log[-_]?in|sign[-_]?in)(?:\/|$|\?)/i,
  /\/users\/(?:log[-_]?in|sign[-_]?in)(?:\/|$|\?)/i,
  /\/member\/(?:log[-_]?in|sign[-_]?in)(?:\/|$|\?)/i,
  /\/members\/(?:log[-_]?in|sign[-_]?in)(?:\/|$|\?)/i,
  /\/portal\/(?:log[-_]?in|sign[-_]?in)(?:\/|$|\?)/i,
  /\/secure\/(?:log[-_]?in|sign[-_]?in)(?:\/|$|\?)/i,
  /\/access\/(?:log[-_]?in|sign[-_]?in)(?:\/|$|\?)/i,
  /\/auth\/(?:log[-_]?in|sign[-_]?in)(?:\/|$|\?)/i,
  /\/admin\/(?:log[-_]?in|sign[-_]?in)(?:\/|$|\?)/i,
  /\/administrator\/(?:log[-_]?in|sign[-_]?in)(?:\/|$|\?)/i,

  // CMS-specific
  /\/wp-login\.php/i,                              // WordPress
  /\/wp-admin(?:\/|$|\?)/i,                        // WordPress admin
  /\/customer\/account\/login/i,                    // Magento
  /\/index\.php\/customer\/account\/login/i,        // Magento alt
  /\/my-account(?:\/|$|\?)/i,                       // WooCommerce (login + account)
  /\/account\/login/i,                              // Shopify
  /\/user\/login/i,                                 // Drupal
  /\/index\.php\?option=com_users&view=login/i,     // Joomla
  /\/component\/users\/\?view=login/i,              // Joomla alt

  // Framework-specific
  /\/users\/sign_in(?:\/|$|\?)/i,                   // Rails/Devise
  /\/session\/new(?:\/|$|\?)/i,                     // Rails session
  /\/sessions\/new(?:\/|$|\?)/i,                    // Rails sessions
  /\/api\/auth\/signin(?:\/|$|\?)/i,                // NextAuth
  /\/auth\/realms\/[^/]+\/protocol\//i,             // Keycloak
  /\/oauth\/authorize(?:\/|$|\?)/i,                 // OAuth
  /\/cas\/login(?:\/|$|\?)/i,                       // CAS SSO
  /\/saml\/login(?:\/|$|\?)/i,                      // SAML SSO
  /\/adfs\/ls(?:\/|$|\?)/i,                         // ADFS
  /\/openid\/login(?:\/|$|\?)/i,                    // OpenID

  // SaaS / app patterns
  /\/app\/login(?:\/|$|\?)/i,
  /\/app\/signin(?:\/|$|\?)/i,
  /\/dashboard\/login(?:\/|$|\?)/i,
  /\/panel\/login(?:\/|$|\?)/i,
  /\/console\/login(?:\/|$|\?)/i,
  /\/client\/login(?:\/|$|\?)/i,
  /\/enter(?:\/|$|\?)/i,
  /\/entrance(?:\/|$|\?)/i,
  /\/connect(?:\/login|\/signin)(?:\/|$|\?)/i,
  /\/gate(?:\/|$|\?)/i,

  // Internationalized paths
  /\/connexion(?:\/|$|\?)/i,                         // French
  /\/iniciar[-_]?sesion(?:\/|$|\?)/i,                // Spanish
  /\/acceder(?:\/|$|\?)/i,                           // Spanish
  /\/anmelden(?:\/|$|\?)/i,                          // German
  /\/einloggen(?:\/|$|\?)/i,                         // German
  /\/accedi(?:\/|$|\?)/i,                            // Italian
  /\/inloggen(?:\/|$|\?)/i,                          // Dutch
  /\/entrar(?:\/|$|\?)/i,                            // Portuguese
  /\/prihlaseni(?:\/|$|\?)/i,                        // Czech
  /\/prihlasit(?:\/|$|\?)/i,                         // Czech/Slovak
  /\/logowanie(?:\/|$|\?)/i,                         // Polish
  /\/giris(?:\/|$|\?)/i,                             // Turkish
  /\/inloggning(?:\/|$|\?)/i,                        // Swedish
  /\/kirjaudu(?:\/|$|\?)/i,                          // Finnish
];

// ─── URL Query Parameter Patterns ────────────────────────────────────────────
// Some sites use query params like ?action=login or ?view=login

export const LOGIN_QUERY_PATTERNS: RegExp[] = [
  /[?&]action=(log[-_]?in|sign[-_]?in|auth)/i,
  /[?&]view=(log[-_]?in|sign[-_]?in)/i,
  /[?&]type=(log[-_]?in|sign[-_]?in)/i,
  /[?&]page=(log[-_]?in|sign[-_]?in)/i,
  /[?&]mode=(log[-_]?in|sign[-_]?in)/i,
];

// ─── Content-Based Detection ─────────────────────────────────────────────────
// Text patterns found in the page body that indicate a login page.
// Must be combined with a password field for high confidence.

export const LOGIN_CONTENT_PATTERNS: RegExp = new RegExp(
  '\\b(' + [
    'sign in',
    'sign-in',
    'log in',
    'log-in',
    'login',
    'enter your password',
    'enter your email and password',
    'enter your credentials',
    'forgot password',
    'forgot your password',
    'reset password',
    'remember me',
    'keep me signed in',
    'keep me logged in',
    'stay signed in',
    'stay logged in',
    "don't have an account",
    "don\u2019t have an account",   // curly quote
    'do not have an account',
    'create an account',
    'new to .+\\?',
    'welcome back',
    'sign in to your account',
    'sign in to continue',
    'log in to your account',
    'log in to continue',
    'login to your account',
    'login to continue',
    'sign into your account',
    'authenticate',
    'credentials',
    'username or email',
    'email or username',
    'email and password',
    'username and password',
    'two-factor',
    'verification code',
    // Internationalized
    'connectez-vous',         // French
    'se connecter',           // French
    'identifiez-vous',        // French
    'iniciar sesi[oó]n',      // Spanish
    'inicia sesi[oó]n',       // Spanish
    'einloggen',              // German
    'anmelden',               // German
    'melden sie sich an',     // German
    'accedi',                 // Italian
    'effettua l.accesso',     // Italian
    'inloggen',               // Dutch
    'entrar',                 // Portuguese
    'fa[çc]a login',          // Portuguese
    'zaloguj si[eę]',         // Polish
    'giri[sş] yap',           // Turkish
  ].join('|') + ')\\b',
  'i'
);

// ─── Login Link Detection ────────────────────────────────────────────────────
// Patterns for anchor text or href that point to a login page.
// Used to discover login URLs from non-login pages.

export const LOGIN_LINK_TEXT_PATTERNS: RegExp = /\b(log\s*in|sign\s*in|my\s*account|member\s*login|client\s*login|portal|connexion|anmelden|accedi|entrar|iniciar\s*sesi[oó]n|inloggen)\b/i;

export const LOGIN_LINK_HREF_PATTERNS: RegExp[] = [
  /\/log[-_]?in/i,
  /\/sign[-_]?in/i,
  /\/auth(?:enticate)?(?:\/|$|\?)/i,
  /\/sso(?:\/|$|\?)/i,
  /\/wp-login/i,
  /\/my-account/i,
  /\/account\/login/i,
  /\/user\/login/i,
  /\/users\/sign_in/i,
  /\/customer\/account\/login/i,
  /\/session\/new/i,
  /\/portal\/login/i,
  /\/secure\/login/i,
  /\/member\/login/i,
  /\/members\/sign_in/i,
  /\/admin\/login/i,
  /\/connexion/i,
  /\/anmelden/i,
  /\/accedi/i,
  /\/entrar/i,
  /\/iniciar[-_]?sesion/i,
  /\/inloggen/i,
];

// ─── Page Classification ─────────────────────────────────────────────────────
// Comprehensive patterns for classifyPageType to mark pages as 'login'.

export const LOGIN_CLASSIFY_PATTERNS: RegExp[] = [
  /\/log[-_]?in/i,
  /\/sign[-_]?in/i,
  /\/auth(?:enticate)?(?:\/|$)/i,
  /\/sso(?:\/|$)/i,
  /\/log[-_]?on/i,
  /\/wp-login/i,
  /\/users?\/(?:log[-_]?in|sign[-_]?in)/i,
  /\/accounts?\/(?:log[-_]?in|sign[-_]?in)/i,
  /\/members?\/(?:log[-_]?in|sign[-_]?in)/i,
  /\/customer\/account\/login/i,
  /\/my-account/i,
  /\/session\/new/i,
  /\/sessions\/new/i,
  /\/api\/auth\/signin/i,
  /\/cas\/login/i,
  /\/saml\/login/i,
  /\/portal\/(?:log[-_]?in|sign[-_]?in)/i,
  /\/secure\/(?:log[-_]?in|sign[-_]?in)/i,
  /\/admin\/(?:log[-_]?in|sign[-_]?in)/i,
  /\/connexion/i,
  /\/anmelden/i,
  /\/accedi/i,
  /\/entrar/i,
  /\/iniciar[-_]?sesion/i,
  /\/inloggen/i,
  /\/logowanie/i,
  /\/giris/i,
  /\/entrance/i,
  /\/enter(?:\/|$)/i,
];

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Test if a URL matches any known login page pattern.
 * Checks both pathname and query parameters.
 */
export function isLoginUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const pathToCheck = parsed.hash.startsWith('#/')
      ? parsed.hash.slice(1)
      : parsed.pathname;
    const fullUrl = pathToCheck + parsed.search;

    if (LOGIN_URL_PATTERNS.some(r => r.test(fullUrl))) return true;
    if (LOGIN_QUERY_PATTERNS.some(r => r.test(parsed.search))) return true;

    return false;
  } catch {
    // Fallback: test raw string
    return LOGIN_URL_PATTERNS.some(r => r.test(url));
  }
}

/**
 * Test if page text content indicates a login page.
 * Should be combined with form/password field detection for confidence.
 */
export function hasLoginContent(text: string): boolean {
  return LOGIN_CONTENT_PATTERNS.test(text);
}

/**
 * Extract potential login page URLs from anchor tags.
 * Returns unique absolute URLs that look like login pages.
 */
export function findLoginLinksFromHtml(
  anchors: Array<{ href: string; text: string }>,
  baseUrl: string,
): string[] {
  const found = new Set<string>();

  for (const { href, text } of anchors) {
    if (!href) continue;

    let absoluteUrl: string;
    try {
      absoluteUrl = new URL(href, baseUrl).href;
    } catch {
      continue;
    }

    // Check if link href looks like a login URL
    const hrefMatch = LOGIN_LINK_HREF_PATTERNS.some(r => r.test(href));
    // Check if link text suggests login
    const textMatch = LOGIN_LINK_TEXT_PATTERNS.test(text.trim());

    if (hrefMatch || textMatch) {
      found.add(absoluteUrl);
    }
  }

  return Array.from(found);
}
