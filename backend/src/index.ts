import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { initDb } from './db/index.js';
import { router } from './routes/api.js';
import { runFetchJob } from './jobs/fetch.js';

const PORT = Number(process.env.PORT ?? 3001);
const FETCH_INTERVAL = Number(process.env.FETCH_INTERVAL_MINUTES ?? 15);

async function main() {
  await initDb();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', router);

  app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
  });

  // Run immediately on startup
  await runFetchJob();

  // Schedule recurring fetches
  const cronExpr = `*/${FETCH_INTERVAL} * * * *`;
  console.log(`⏰ Scheduled fetch every ${FETCH_INTERVAL} minutes (${cronExpr})`);
  cron.schedule(cronExpr, () => {
    runFetchJob().catch(console.error);
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
