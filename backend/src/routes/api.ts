import { Router } from 'express';
import { getItems, getStats, getRecentLogs } from '../db/index.js';
import { runFetchJob } from '../jobs/fetch.js';
import { FEEDS } from '../services/rss.js';

export const router = Router();

// GET /api/items?feedType=alerte&limit=50&offset=0
router.get('/items', async (req, res) => {
  try {
    const feedType = req.query.feedType as string | undefined;
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Number(req.query.offset ?? 0);
    const result = await getItems({ feedType, limit, offset });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/stats
router.get('/stats', async (_req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/logs
router.get('/logs', async (_req, res) => {
  try {
    const logs = await getRecentLogs(30);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/feeds
router.get('/feeds', (_req, res) => {
  res.json(FEEDS);
});

// POST /api/fetch  — trigger a manual fetch
router.post('/fetch', async (_req, res) => {
  res.json({ message: 'Fetch triggered' });
  // Run after response so we don't block
  runFetchJob().catch(console.error);
});

// GET /api/health
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});
