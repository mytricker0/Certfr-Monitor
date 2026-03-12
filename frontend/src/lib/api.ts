const API = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface FeedItem {
  id: number;
  guid: string;
  feed_type: string;
  title: string;
  link: string;
  description: string | null;
  pub_date: string | null;
  fetched_at: string;
  emailed: boolean;
  emailed_at: string | null;
}

export interface FeedStat {
  feed_type: string;
  total: string;
  emailed: string;
  latest: string | null;
}

export interface FetchLog {
  id: number;
  feed_type: string;
  fetched_at: string;
  new_items: number;
  success: boolean;
  error: string | null;
}

export async function getItems(params?: { feedType?: string; limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (params?.feedType) qs.set('feedType', params.feedType);
  if (params?.limit)    qs.set('limit', String(params.limit));
  if (params?.offset)   qs.set('offset', String(params.offset));
  const res = await fetch(`${API}/api/items?${qs}`, { cache: 'no-store' });
  return res.json() as Promise<{ items: FeedItem[]; total: number }>;
}

export async function getStats() {
  const res = await fetch(`${API}/api/stats`, { cache: 'no-store' });
  return res.json() as Promise<FeedStat[]>;
}

export async function getLogs() {
  const res = await fetch(`${API}/api/logs`, { cache: 'no-store' });
  return res.json() as Promise<FetchLog[]>;
}

export async function triggerFetch() {
  await fetch(`${API}/api/fetch`, { method: 'POST' });
}

export const FEED_LABELS: Record<string, string> = {
  alerte:    'Security Alerts',
  cti:       'Threats & Incidents',
  avis:      'Security Advisories',
  ioc:       'IOCs',
  dur:       'Hardening & Recs',
  actualite: 'Bulletins',
  scada:     'SCADA',
};
