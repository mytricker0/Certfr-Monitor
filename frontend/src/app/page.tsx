'use client';

import { useEffect, useState, useCallback } from 'react';
import { getItems, getStats, getLogs, triggerFetch, FEED_LABELS } from '../lib/api';
import type { FeedItem, FeedStat, FetchLog } from '../lib/api';

const FEED_TYPES = ['all', 'alerte', 'avis', 'cti', 'ioc', 'dur', 'actualite', 'scada'];

function relativeTime(dateStr: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Badge({ type }: { type: string }) {
  return (
    <span className={`feed-badge badge-${type}`}>
      {FEED_LABELS[type] ?? type}
    </span>
  );
}

function StatCard({ stat }: { stat: FeedStat }) {
  const pct = stat.total === '0' ? 0 : Math.round((Number(stat.emailed) / Number(stat.total)) * 100);
  return (
    <div className="rounded-lg border border-[#1e3a5f] bg-[#0a1628] p-4 flex flex-col gap-2 fade-in">
      <Badge type={stat.feed_type} />
      <div className="flex items-end justify-between mt-1">
        <span className="text-3xl font-mono font-semibold text-white">{stat.total}</span>
        <span className="text-xs text-[#4a6a8a] font-mono">{pct}% emailed</span>
      </div>
      {stat.latest && (
        <p className="text-xs text-[#4a6a8a]">Last: {relativeTime(stat.latest)}</p>
      )}
      <div className="h-1 rounded-full bg-[#1e3a5f] mt-1">
        <div
          className="h-1 rounded-full bg-sky-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ItemRow({ item, index }: { item: FeedItem; index: number }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="fade-in grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-5 py-3.5 border-b border-[#0f2140] hover:bg-[#0a1628] transition-colors group"
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
    >
      <Badge type={item.feed_type} />
      <span className="text-sm text-[#c8daf0] group-hover:text-white transition-colors truncate">
        {item.title}
      </span>
      <span className="text-xs font-mono text-[#4a6a8a] whitespace-nowrap">
        {relativeTime(item.pub_date)}
      </span>
      {item.emailed ? (
        <span title="Email sent" className="text-[10px] font-mono text-emerald-400/70">✉ sent</span>
      ) : (
        <span className="text-[10px] font-mono text-[#1e3a5f]">pending</span>
      )}
    </a>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<FeedStat[]>([]);
  const [logs, setLogs] = useState<FetchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [offset, setOffset] = useState(0);
  const [view, setView] = useState<'feed' | 'logs'>('feed');
  const LIMIT = 40;

  const loadItems = useCallback(async (feedType: string, off: number) => {
    setLoading(true);
    try {
      const res = await getItems({ feedType: feedType === 'all' ? undefined : feedType, limit: LIMIT, offset: off });
      setItems(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    const [s, l] = await Promise.all([getStats(), getLogs()]);
    setStats(s);
    setLogs(l);
    await loadItems(activeTab, offset);
  }, [activeTab, offset, loadItems]);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { setOffset(0); loadItems(activeTab, 0); }, [activeTab]);

  async function handleFetch() {
    setFetching(true);
    await triggerFetch();
    setTimeout(() => { loadAll(); setFetching(false); }, 3000);
  }

  const totalItems = stats.reduce((s, r) => s + Number(r.total), 0);
  const lastLog = logs[0];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="border-b border-[#1e3a5f] bg-[#060d1f] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-mono font-semibold text-sky-400 tracking-tight">CERT-FR</span>
            <span className="text-[#1e3a5f]">/</span>
            <span className="text-sm text-[#4a6a8a] font-mono">monitor</span>
            <span className="live-dot w-2 h-2 rounded-full bg-emerald-400 ml-2" title="Live" />
          </div>
          <div className="flex items-center gap-4">
            {lastLog && (
              <span className="text-xs font-mono text-[#4a6a8a] hidden sm:block">
                Last fetch: {relativeTime(lastLog.fetched_at)}
              </span>
            )}
            <button
              onClick={handleFetch}
              disabled={fetching}
              className="text-xs font-mono px-3 py-1.5 rounded border border-sky-800 text-sky-400 hover:bg-sky-900/30 transition-colors disabled:opacity-40"
            >
              {fetching ? '⟳ fetching…' : '⟳ fetch now'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary stats */}
        <div className="mb-8">
          <div className="flex items-baseline gap-3 mb-5">
            <h1 className="text-2xl font-mono font-semibold text-white">{totalItems.toLocaleString()}</h1>
            <span className="text-sm text-[#4a6a8a]">publications tracked across all feeds</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {stats.map(s => <StatCard key={s.feed_type} stat={s} />)}
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 mb-4 border-b border-[#1e3a5f] pb-0">
          {(['feed', 'logs'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 text-sm font-mono border-b-2 -mb-px transition-colors ${
                view === v
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-[#4a6a8a] hover:text-[#94a3b8]'
              }`}
            >
              {v === 'feed' ? '≡ feed' : '⧗ fetch logs'}
            </button>
          ))}
        </div>

        {view === 'feed' ? (
          <>
            {/* Feed type filter */}
            <div className="flex gap-2 flex-wrap mb-4">
              {FEED_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`text-xs font-mono px-3 py-1 rounded-full border transition-colors ${
                    activeTab === t
                      ? 'border-sky-500 bg-sky-900/30 text-sky-300'
                      : 'border-[#1e3a5f] text-[#4a6a8a] hover:border-[#2e5a8f] hover:text-[#94a3b8]'
                  }`}
                >
                  {t === 'all' ? 'all feeds' : (FEED_LABELS[t] ?? t)}
                </button>
              ))}
            </div>

            {/* Items list */}
            <div className="rounded-lg border border-[#1e3a5f] overflow-hidden bg-[#08111e]">
              {/* List header */}
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-5 py-2.5 bg-[#0a1628] border-b border-[#1e3a5f]">
                <span className="text-[10px] font-mono text-[#4a6a8a] uppercase tracking-widest">Category</span>
                <span className="text-[10px] font-mono text-[#4a6a8a] uppercase tracking-widest">Title</span>
                <span className="text-[10px] font-mono text-[#4a6a8a] uppercase tracking-widest">Published</span>
                <span className="text-[10px] font-mono text-[#4a6a8a] uppercase tracking-widest">Email</span>
              </div>

              {loading ? (
                <div className="py-16 text-center text-[#4a6a8a] font-mono text-sm">loading…</div>
              ) : items.length === 0 ? (
                <div className="py-16 text-center text-[#4a6a8a] font-mono text-sm">no items found</div>
              ) : (
                items.map((item, i) => <ItemRow key={item.id} item={item} index={i} />)
              )}
            </div>

            {/* Pagination */}
            {total > LIMIT && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs font-mono text-[#4a6a8a]">
                  {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={offset === 0}
                    onClick={() => { const o = Math.max(0, offset - LIMIT); setOffset(o); loadItems(activeTab, o); }}
                    className="text-xs font-mono px-3 py-1 border border-[#1e3a5f] text-[#4a6a8a] rounded hover:text-white hover:border-[#2e5a8f] disabled:opacity-30"
                  >← prev</button>
                  <button
                    disabled={offset + LIMIT >= total}
                    onClick={() => { const o = offset + LIMIT; setOffset(o); loadItems(activeTab, o); }}
                    className="text-xs font-mono px-3 py-1 border border-[#1e3a5f] text-[#4a6a8a] rounded hover:text-white hover:border-[#2e5a8f] disabled:opacity-30"
                  >next →</button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Fetch logs view */
          <div className="rounded-lg border border-[#1e3a5f] overflow-hidden bg-[#08111e]">
            <div className="grid grid-cols-[auto_auto_auto_1fr] gap-4 px-5 py-2.5 bg-[#0a1628] border-b border-[#1e3a5f]">
              <span className="text-[10px] font-mono text-[#4a6a8a] uppercase tracking-widest">Time</span>
              <span className="text-[10px] font-mono text-[#4a6a8a] uppercase tracking-widest">Feed</span>
              <span className="text-[10px] font-mono text-[#4a6a8a] uppercase tracking-widest">New</span>
              <span className="text-[10px] font-mono text-[#4a6a8a] uppercase tracking-widest">Status</span>
            </div>
            {logs.map((log, i) => (
              <div
                key={log.id}
                className="fade-in grid grid-cols-[auto_auto_auto_1fr] gap-4 items-center px-5 py-3 border-b border-[#0f2140] text-sm font-mono"
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <span className="text-[#4a6a8a] text-xs whitespace-nowrap">{relativeTime(log.fetched_at)}</span>
                <Badge type={log.feed_type} />
                <span className={log.new_items > 0 ? 'text-emerald-400' : 'text-[#4a6a8a]'}>
                  +{log.new_items}
                </span>
                {log.success ? (
                  <span className="text-emerald-400/70 text-xs">ok</span>
                ) : (
                  <span className="text-red-400 text-xs truncate">{log.error ?? 'error'}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
