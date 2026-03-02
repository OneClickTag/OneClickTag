/**
 * Stealth Config — Centralized browser factory + anti-detection scripts.
 *
 * Provides a stealthy Playwright browser/context that passes common bot-detection
 * checks (navigator.webdriver, chrome object, plugins, WebGL, canvas, etc.).
 */

import { chromium, Browser, BrowserContext } from 'playwright-core';

// ========================================
// Browser Fingerprint Constants
// ========================================

export const BROWSER_FINGERPRINT = {
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  secChUa: '"Chromium";v="134", "Google Chrome";v="134", "Not:A-Brand";v="24"',
  secChUaPlatform: '"Windows"',
  secChUaMobile: '?0',
  platform: 'Win32',
  oscpu: 'Windows NT 10.0',
  languages: ['en-US', 'en'],
  locale: 'en-US',
  timezone: 'America/New_York',
  screen: { width: 1920, height: 1080, availHeight: 1040, devicePixelRatio: 1 },
  webgl: {
    vendor: 'Google Inc. (Intel)',
    renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  },
} as const;

// ========================================
// Browser Factory
// ========================================

/**
 * Launch a headless Chromium with anti-detection flags.
 */
export async function createStealthBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1920,1080',
      '--lang=en-US,en',
      // Enable SwiftShader for WebGL in headless (otherwise "no webgl context")
      '--use-gl=angle',
      '--use-angle=swiftshader',
    ],
  });
}

/**
 * Create a browser context with realistic fingerprint and stealth init scripts.
 */
export async function createStealthContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    userAgent: BROWSER_FINGERPRINT.userAgent,
    viewport: {
      width: BROWSER_FINGERPRINT.screen.width,
      height: BROWSER_FINGERPRINT.screen.height,
    },
    locale: BROWSER_FINGERPRINT.locale,
    timezoneId: BROWSER_FINGERPRINT.timezone,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      'Sec-CH-UA': BROWSER_FINGERPRINT.secChUa,
      'Sec-CH-UA-Platform': BROWSER_FINGERPRINT.secChUaPlatform,
      'Sec-CH-UA-Mobile': BROWSER_FINGERPRINT.secChUaMobile,
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  await applyStealthScripts(context);
  return context;
}

// ========================================
// Stealth Init Scripts
// ========================================

/**
 * Inject stealth overrides via context.addInitScript().
 * These run before any page script executes.
 */
async function applyStealthScripts(context: BrowserContext): Promise<void> {
  await context.addInitScript(`(() => {
    // ── 1. navigator.webdriver → false (like real Chrome) ──
    // Real Chrome has a data property on Navigator.prototype with value false.
    // Using a getter is detectable — bot detectors check OwnPropertyDescriptor for get/set.
    // Delete from prototype, then redefine as data property. Don't touch instance.
    delete Navigator.prototype.webdriver;
    Object.defineProperty(Navigator.prototype, 'webdriver', {
      value: false,
      writable: true,
      enumerable: true,
      configurable: true,
    });

    // ── 2. window.chrome mock ──
    if (!window.chrome) {
      window.chrome = {};
    }
    window.chrome.runtime = window.chrome.runtime || {
      PlatformOs: { MAC: 'mac', WIN: 'win', ANDROID: 'android', CROS: 'cros', LINUX: 'linux', OPENBSD: 'openbsd' },
      PlatformArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64', MIPS: 'mips', MIPS64: 'mips64' },
      PlatformNaclArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64', MIPS: 'mips', MIPS64: 'mips64' },
      RequestUpdateCheckStatus: { THROTTLED: 'throttled', NO_UPDATE: 'no_update', UPDATE_AVAILABLE: 'update_available' },
      OnInstalledReason: { INSTALL: 'install', UPDATE: 'update', CHROME_UPDATE: 'chrome_update', SHARED_MODULE_UPDATE: 'shared_module_update' },
      OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
      connect: function() { return { onDisconnect: { addListener: function() {} } }; },
      sendMessage: function() {},
    };
    window.chrome.app = window.chrome.app || {
      isInstalled: false,
      InstallState: { INSTALLED: 'installed', DISABLED: 'disabled', NOT_INSTALLED: 'not_installed' },
      RunningState: { RUNNING: 'running', CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run' },
      getDetails: function() { return null; },
      getIsInstalled: function() { return false; },
    };
    window.chrome.csi = window.chrome.csi || function() {
      return {
        onloadT: Date.now(),
        startE: Date.now(),
        pageT: performance.now(),
        tran: 15,
      };
    };
    window.chrome.loadTimes = window.chrome.loadTimes || function() {
      return {
        requestTime: Date.now() / 1000,
        startLoadTime: Date.now() / 1000,
        commitLoadTime: Date.now() / 1000,
        finishDocumentLoadTime: Date.now() / 1000,
        finishLoadTime: Date.now() / 1000,
        firstPaintTime: Date.now() / 1000,
        firstPaintAfterLoadTime: 0,
        navigationType: 'Other',
        wasFetchedViaSpdy: false,
        wasNpnNegotiated: true,
        npnNegotiatedProtocol: 'h2',
        wasAlternateProtocolAvailable: false,
        connectionInfo: 'h2',
      };
    };

    // ── 3. navigator.plugins — 3 Chrome plugins ──
    // Use Object.create(Plugin.prototype) / Object.create(MimeType.prototype)
    // so instanceof checks pass (bot detectors verify this).
    const makePlugin = (name, description, filename, mimeType) => {
      const mime = Object.create(MimeType.prototype);
      Object.defineProperties(mime, {
        type: { value: mimeType, enumerable: true },
        suffixes: { value: 'pdf', enumerable: true },
        description: { value: name, enumerable: true },
        enabledPlugin: { value: null, writable: true, enumerable: true },
      });
      const plugin = Object.create(Plugin.prototype);
      Object.defineProperties(plugin, {
        name: { value: name, enumerable: true },
        description: { value: description, enumerable: true },
        filename: { value: filename, enumerable: true },
        length: { value: 1, enumerable: true },
        0: { value: mime, enumerable: true },
      });
      plugin.item = (i) => (i === 0 ? mime : null);
      plugin.namedItem = (n) => (n === mimeType ? mime : null);
      plugin[Symbol.iterator] = function*() { yield mime; };
      mime.enabledPlugin = plugin;
      return plugin;
    };
    const pluginsArray = [
      makePlugin('PDF Viewer', 'Portable Document Format', 'internal-pdf-viewer', 'application/pdf'),
      makePlugin('Chrome PDF Viewer', 'Portable Document Format', 'internal-pdf-viewer', 'application/x-google-chrome-pdf'),
      makePlugin('Chromium PDF Viewer', 'Portable Document Format', 'internal-pdf-viewer', 'application/x-nacl'),
    ];
    // Build a cached PluginArray instance so instanceof checks pass
    const cachedPluginList = Object.create(PluginArray.prototype);
    pluginsArray.forEach((p, i) => { cachedPluginList[i] = p; });
    Object.defineProperty(cachedPluginList, 'length', { value: pluginsArray.length, writable: false, enumerable: true, configurable: true });
    cachedPluginList.item = (i) => pluginsArray[i] || null;
    cachedPluginList.namedItem = (name) => pluginsArray.find(p => p.name === name) || null;
    cachedPluginList.refresh = () => {};
    cachedPluginList[Symbol.iterator] = function*() { for (const p of pluginsArray) yield p; };
    Object.defineProperty(navigator, 'plugins', {
      get: () => cachedPluginList,
      configurable: true,
    });

    // ── 4. navigator.languages ──
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });

    // ── 5. navigator.platform ──
    Object.defineProperty(navigator, 'platform', {
      get: () => '${BROWSER_FINGERPRINT.platform}',
    });

    // ── 6. permissions.query — realistic notification permission ──
    const origQuery = navigator.permissions?.query?.bind(navigator.permissions);
    if (origQuery) {
      navigator.permissions.query = (parameters) => {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: Notification.permission, onchange: null });
        }
        return origQuery(parameters);
      };
    }

    // ── 7. WebGL vendor/renderer override ──
    const overrideWebGL = (proto) => {
      const origGetParameter = proto.getParameter;
      proto.getParameter = function(param) {
        // UNMASKED_VENDOR_WEBGL
        if (param === 37445) return '${BROWSER_FINGERPRINT.webgl.vendor}';
        // UNMASKED_RENDERER_WEBGL
        if (param === 37446) return '${BROWSER_FINGERPRINT.webgl.renderer}';
        return origGetParameter.call(this, param);
      };
    };
    if (typeof WebGLRenderingContext !== 'undefined') {
      overrideWebGL(WebGLRenderingContext.prototype);
    }
    if (typeof WebGL2RenderingContext !== 'undefined') {
      overrideWebGL(WebGL2RenderingContext.prototype);
    }

    // ── 8. Canvas fingerprint — XOR single pixel for session-unique but stable hash ──
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
      const ctx = this.getContext('2d');
      if (ctx && this.width > 0 && this.height > 0) {
        try {
          const pixel = ctx.getImageData(0, 0, 1, 1);
          pixel.data[0] ^= 1; // Tiny perturbation
          ctx.putImageData(pixel, 0, 0);
        } catch { /* CORS canvas */ }
      }
      return origToDataURL.call(this, type, quality);
    };

    // ── 9. Screen / window dimensions ──
    Object.defineProperty(window, 'outerWidth', { get: () => ${BROWSER_FINGERPRINT.screen.width} });
    Object.defineProperty(window, 'outerHeight', { get: () => ${BROWSER_FINGERPRINT.screen.availHeight} });
    Object.defineProperty(screen, 'availHeight', { get: () => ${BROWSER_FINGERPRINT.screen.availHeight} });

    // ── 10. Remove Playwright globals ──
    delete window.__playwright;
    delete window.__pw_manual;
    delete window.__PW_inspect;
  })();`);
}

// ========================================
// Session Warm-Up
// ========================================

/**
 * Warm up a context by visiting the homepage and waiting for JS challenges
 * (Cloudflare "Checking your browser", etc.) to resolve.
 * Cookies remain in the context for subsequent pages.
 */
export async function warmUpSession(
  context: BrowserContext,
  targetUrl: string,
): Promise<void> {
  const page = await context.newPage();
  try {
    const url = new URL(targetUrl);
    const homepageUrl = `${url.protocol}//${url.host}`;

    await page.goto(homepageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Check for JS challenge pages (Cloudflare, etc.)
    const challengePatterns = [
      'Checking your browser',
      'Just a moment',
      'Please wait',
      'Verifying you are human',
      'DDoS protection',
      'Enable JavaScript and cookies',
    ];

    const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 2000) || '');
    const hasChallenge = challengePatterns.some(p => bodyText.includes(p));

    if (hasChallenge) {
      // Wait for the challenge to resolve (up to 10s)
      try {
        await page.waitForFunction(
          (patterns) => {
            const text = document.body?.innerText?.slice(0, 2000) || '';
            return !patterns.some((p: string) => text.includes(p));
          },
          challengePatterns,
          { timeout: 10000 },
        );
      } catch {
        // Challenge didn't resolve — cookies may still help
      }
    } else {
      // No challenge, just wait a moment for cookies to set
      await page.waitForTimeout(1000);
    }
  } catch {
    // Warm-up failure is non-fatal
  } finally {
    await page.close();
  }
}
