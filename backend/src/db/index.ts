import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS feed_items (
      id           SERIAL PRIMARY KEY,
      guid         TEXT NOT NULL UNIQUE,
      feed_type    TEXT NOT NULL,
      title        TEXT NOT NULL,
      link         TEXT NOT NULL,
      description  TEXT,
      pub_date     TIMESTAMPTZ,
      fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      emailed      BOOLEAN NOT NULL DEFAULT FALSE,
      emailed_at   TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_feed_items_feed_type ON feed_items(feed_type);
    CREATE INDEX IF NOT EXISTS idx_feed_items_pub_date  ON feed_items(pub_date DESC);
    CREATE INDEX IF NOT EXISTS idx_feed_items_emailed   ON feed_items(emailed);

    CREATE TABLE IF NOT EXISTS fetch_logs (
      id          SERIAL PRIMARY KEY,
      feed_type   TEXT NOT NULL,
      fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      new_items   INTEGER NOT NULL DEFAULT 0,
      success     BOOLEAN NOT NULL DEFAULT TRUE,
      error       TEXT
    );
  `);
  console.log('✅ Database schema ready');
}

export interface FeedItem {
  id: number;
  guid: string;
  feed_type: string;
  title: string;
  link: string;
  description: string | null;
  pub_date: Date | null;
  fetched_at: Date;
  emailed: boolean;
  emailed_at: Date | null;
}

export async function upsertItem(item: Omit<FeedItem, 'id' | 'fetched_at' | 'emailed' | 'emailed_at'>): Promise<{ inserted: boolean }> {
  const res = await pool.query(
    `INSERT INTO feed_items (guid, feed_type, title, link, description, pub_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (guid) DO NOTHING
     RETURNING id`,
    [item.guid, item.feed_type, item.title, item.link, item.description, item.pub_date]
  );
  return { inserted: res.rowCount === 1 };
}

export async function markEmailed(ids: number[]) {
  if (ids.length === 0) return;
  await pool.query(
    `UPDATE feed_items SET emailed = TRUE, emailed_at = NOW() WHERE id = ANY($1)`,
    [ids]
  );
}

export async function getPendingEmail(): Promise<FeedItem[]> {
  const res = await pool.query(
    `SELECT * FROM feed_items WHERE emailed = FALSE ORDER BY pub_date DESC`
  );
  return res.rows;
}

export async function getItems(params: {
  feedType?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: FeedItem[]; total: number }> {
  const { feedType, limit = 50, offset = 0 } = params;
  const where = feedType ? `WHERE feed_type = $3` : '';
  const args: unknown[] = [limit, offset];
  if (feedType) args.push(feedType);

  const [items, count] = await Promise.all([
    pool.query(
      `SELECT * FROM feed_items ${where} ORDER BY pub_date DESC NULLS LAST LIMIT $1 OFFSET $2`,
      args
    ),
    pool.query(
      `SELECT COUNT(*) FROM feed_items ${where}`,
      feedType ? [feedType] : []
    ),
  ]);

  return { items: items.rows, total: parseInt(count.rows[0].count) };
}

export async function getStats() {
  const res = await pool.query(`
    SELECT
      feed_type,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE emailed) AS emailed,
      MAX(pub_date) AS latest
    FROM feed_items
    GROUP BY feed_type
    ORDER BY feed_type
  `);
  return res.rows;
}

export async function getRecentLogs(limit = 20) {
  const res = await pool.query(
    `SELECT * FROM fetch_logs ORDER BY fetched_at DESC LIMIT $1`,
    [limit]
  );
  return res.rows;
}

export async function logFetch(feedType: string, newItems: number, success: boolean, error?: string) {
  await pool.query(
    `INSERT INTO fetch_logs (feed_type, new_items, success, error) VALUES ($1, $2, $3, $4)`,
    [feedType, newItems, success, error ?? null]
  );
}
