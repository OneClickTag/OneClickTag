/**
 * Sitemap Parser - Pre-crawl URL discovery from robots.txt and sitemap.xml
 */

export interface RobotsResult {
  sitemapUrls: string[];
  disallowedPaths: string[];
  crawlDelay: number | null;
}

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  priority?: number;
  changefreq?: string;
}

export interface SitemapResult {
  urls: SitemapUrl[];
}

export interface PreCrawlResult {
  urls: string[];
  sitemapFound: boolean;
  robotsFound: boolean;
  disallowedPaths: string[];
  crawlDelay: number | null;
}

const USER_AGENT = 'OneClickTag-Scanner/1.0';
const FETCH_TIMEOUT = 10000; // 10s

async function safeFetch(url: string): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeoutId);
    return response;
  } catch {
    return null;
  }
}

/**
 * Fetch and parse robots.txt
 */
export async function fetchRobotsTxt(domain: string): Promise<RobotsResult> {
  const url = `https://${domain}/robots.txt`;
  const result: RobotsResult = {
    sitemapUrls: [],
    disallowedPaths: [],
    crawlDelay: null,
  };

  const response = await safeFetch(url);
  if (!response || !response.ok) return result;

  const text = await response.text();
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith('sitemap:')) {
      const sitemapUrl = trimmed.slice('sitemap:'.length).trim();
      if (sitemapUrl.startsWith('http')) {
        result.sitemapUrls.push(sitemapUrl);
      }
    } else if (trimmed.toLowerCase().startsWith('disallow:')) {
      const path = trimmed.slice('disallow:'.length).trim();
      if (path) result.disallowedPaths.push(path);
    } else if (trimmed.toLowerCase().startsWith('crawl-delay:')) {
      const delay = parseFloat(trimmed.slice('crawl-delay:'.length).trim());
      if (!isNaN(delay)) result.crawlDelay = delay;
    }
  }

  return result;
}

/**
 * Fetch and parse a sitemap XML (handles both regular sitemaps and sitemap indexes)
 */
export async function fetchSitemap(sitemapUrl: string): Promise<SitemapResult> {
  const result: SitemapResult = { urls: [] };

  const response = await safeFetch(sitemapUrl);
  if (!response || !response.ok) return result;

  const text = await response.text();

  // Check if this is a sitemap index
  if (text.includes('<sitemapindex')) {
    const sitemapLocs = extractXmlTags(text, 'sitemap').map(entry =>
      extractXmlValue(entry, 'loc')
    ).filter(Boolean) as string[];

    // Fetch each sub-sitemap (limit to 5 to stay within time)
    const subResults = await Promise.all(
      sitemapLocs.slice(0, 5).map(loc => fetchSitemap(loc))
    );
    for (const sub of subResults) {
      result.urls.push(...sub.urls);
    }
  } else {
    // Regular sitemap
    const urlEntries = extractXmlTags(text, 'url');
    for (const entry of urlEntries) {
      const loc = extractXmlValue(entry, 'loc');
      if (!loc) continue;

      const lastmod = extractXmlValue(entry, 'lastmod') || undefined;
      const priorityStr = extractXmlValue(entry, 'priority');
      const changefreq = extractXmlValue(entry, 'changefreq') || undefined;

      result.urls.push({
        loc,
        lastmod,
        priority: priorityStr ? parseFloat(priorityStr) : undefined,
        changefreq,
      });
    }
  }

  return result;
}

/**
 * Discover all URLs from robots.txt + sitemap.xml
 */
export async function discoverAllUrls(domain: string): Promise<PreCrawlResult> {
  const result: PreCrawlResult = {
    urls: [],
    sitemapFound: false,
    robotsFound: false,
    disallowedPaths: [],
    crawlDelay: null,
  };

  // 1. Check robots.txt
  const robots = await fetchRobotsTxt(domain);
  result.robotsFound = robots.sitemapUrls.length > 0 || robots.disallowedPaths.length > 0;
  result.disallowedPaths = robots.disallowedPaths;
  result.crawlDelay = robots.crawlDelay;

  // 2. Collect sitemap URLs (from robots.txt + common locations)
  const sitemapCandidates = new Set<string>(robots.sitemapUrls);
  const commonSitemaps = [
    `https://${domain}/sitemap.xml`,
    `https://${domain}/sitemap_index.xml`,
    `https://${domain}/wp-sitemap.xml`,
    `https://${domain}/sitemap-index.xml`,
  ];
  for (const url of commonSitemaps) {
    sitemapCandidates.add(url);
  }

  // 3. Fetch sitemaps in parallel
  const allUrls = new Set<string>();
  const sitemapResults = await Promise.all(
    Array.from(sitemapCandidates).map(url => fetchSitemap(url))
  );

  for (const sitemapResult of sitemapResults) {
    if (sitemapResult.urls.length > 0) {
      result.sitemapFound = true;
      for (const entry of sitemapResult.urls) {
        allUrls.add(entry.loc);
      }
    }
  }

  result.urls = Array.from(allUrls);
  return result;
}

// ========================================
// Simple XML parsing helpers (no dependency needed)
// ========================================

function extractXmlTags(xml: string, tagName: string): string[] {
  const results: string[] = [];
  const openTag = `<${tagName}`;
  const closeTag = `</${tagName}>`;
  let start = 0;

  while (true) {
    const tagStart = xml.indexOf(openTag, start);
    if (tagStart === -1) break;
    const tagEnd = xml.indexOf(closeTag, tagStart);
    if (tagEnd === -1) break;
    results.push(xml.slice(tagStart, tagEnd + closeTag.length));
    start = tagEnd + closeTag.length;
  }

  return results;
}

function extractXmlValue(xml: string, tagName: string): string | null {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([^<]+)</${tagName}>`));
  return match ? match[1].trim() : null;
}
