import { FEEDS } from '../services/rss.js';
import { fetchFeed } from '../services/rss.js';
import { upsertItem, getPendingEmail, markEmailed, logFetch } from '../db/index.js';
import { sendAlertEmail } from '../services/email.js';

export async function runFetchJob() {
  console.log(`\n🔄 [${new Date().toISOString()}] Starting fetch job...`);

  let totalNew = 0;

  for (const feed of FEEDS) {
    // Skip the 'all' aggregate feed to avoid duplicates
    if (feed.type === 'all') continue;

    try {
      const items = await fetchFeed(feed.url);
      let newCount = 0;

      for (const item of items) {
        const { inserted } = await upsertItem({
          guid: item.guid,
          feed_type: feed.type,
          title: item.title,
          link: item.link,
          description: item.description,
          pub_date: item.pub_date,
        });
        if (inserted) newCount++;
      }

      await logFetch(feed.type, newCount, true);
      if (newCount > 0) {
        console.log(`  ✅ ${feed.label}: ${newCount} new item(s)`);
        totalNew += newCount;
      } else {
        console.log(`  ⏭️  ${feed.label}: nothing new`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ ${feed.label}: ${msg}`);
      await logFetch(feed.type, 0, false, msg);
    }
  }

  // Send email for all pending items (batched)
  if (totalNew > 0) {
    try {
      const pending = await getPendingEmail();
      await sendAlertEmail(pending);
      await markEmailed(pending.map(p => p.id));
      console.log(`📧 Email sent for ${pending.length} item(s)`);
    } catch (err) {
      console.error('❌ Email failed:', err);
    }
  }

  console.log(`✅ Fetch job done. ${totalNew} new item(s) total.\n`);
}
