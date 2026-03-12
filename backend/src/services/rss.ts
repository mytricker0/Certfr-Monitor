import { XMLParser } from 'fast-xml-parser';

export const FEEDS = [
  { type: 'alerte',    label: 'Security Alerts',       url: 'https://www.cert.ssi.gouv.fr/alerte/feed/' },
  { type: 'cti',       label: 'Threats & Incidents',   url: 'https://www.cert.ssi.gouv.fr/cti/feed/' },
  { type: 'avis',      label: 'Security Advisories',   url: 'https://www.cert.ssi.gouv.fr/avis/feed/' },
  { type: 'ioc',       label: 'IOCs',                  url: 'https://www.cert.ssi.gouv.fr/ioc/feed/' },
  { type: 'dur',       label: 'Hardening & Recs',      url: 'https://www.cert.ssi.gouv.fr/dur/feed/' },
  { type: 'actualite', label: 'Bulletins',             url: 'https://www.cert.ssi.gouv.fr/actualite/feed/' },
  { type: 'scada',     label: 'SCADA',                 url: 'https://www.cert.ssi.gouv.fr/feed/scada/' },
  { type: 'all',       label: 'All Publications',      url: 'https://www.cert.ssi.gouv.fr/feed/' },
] as const;

export type FeedType = typeof FEEDS[number]['type'];

export interface ParsedItem {
  guid: string;
  title: string;
  link: string;
  description: string | null;
  pub_date: Date | null;
}

// textNodeName ensures text content of tags with attributes is extracted correctly
// e.g. <guid isPermaLink="true">https://...</guid> → { '#text': 'https://...', '@_isPermaLink': 'true' }
const parser = new XMLParser({
  ignoreAttributes: false,
  textNodeName: '#text',
});

function extractText(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  // Object with attributes: { '#text': 'actual value', '@_attr': '...' }
  if (typeof val === 'object' && '#text' in (val as object)) {
    return String((val as Record<string, unknown>)['#text']);
  }
  return '';
}

export async function fetchFeed(url: string): Promise<ParsedItem[]> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'certfr-monitor/1.0 (RSS aggregator)' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }

  const xml = await res.text();
  const parsed = parser.parse(xml);

  const items = parsed?.rss?.channel?.item;
  if (!items) return [];

  const arr = Array.isArray(items) ? items : [items];

  return arr.map((item: Record<string, unknown>) => {
    const link = extractText(item['link']);
    // guid may have attributes like isPermaLink="true" — extract text content
    const rawGuid = extractText(item['guid']);
    const guid = rawGuid || link; // fall back to link if guid is empty
    const title = extractText(item['title']) || '(no title)';
    const description = item['description'] ? extractText(item['description']) : null;
    const pubDateRaw = item['pubDate'];
    const pub_date = pubDateRaw ? new Date(extractText(pubDateRaw)) : null;

    return { guid, title, link, description, pub_date };
  });
}