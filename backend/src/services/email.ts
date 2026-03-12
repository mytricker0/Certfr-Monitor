import nodemailer from 'nodemailer';
import type { FeedItem } from '../db/index.js';
import { FEEDS } from './rss.js';

function getFeedLabel(type: string) {
  return FEEDS.find(f => f.type === type)?.label ?? type;
}

function buildEmailHtml(items: FeedItem[]): string {
  const rows = items.map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">
        <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:#1e293b;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">
          ${getFeedLabel(item.feed_type)}
        </span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">
        <a href="${item.link}" style="color:#3b82f6;text-decoration:none;font-weight:500;">${item.title}</a>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;white-space:nowrap;">
        ${item.pub_date ? new Date(item.pub_date).toLocaleDateString('fr-FR') : '—'}
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:system-ui,sans-serif;background:#f8fafc;padding:32px;margin:0;">
      <div style="max-width:700px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <div style="background:#0f172a;padding:24px 32px;">
          <h1 style="color:#f1f5f9;margin:0;font-size:20px;">🛡️ CERT-FR Monitor</h1>
          <p style="color:#64748b;margin:6px 0 0;font-size:14px;">${items.length} new publication${items.length > 1 ? 's' : ''} detected</p>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Category</th>
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Title</th>
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Date</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="padding:20px 32px;border-top:1px solid #e5e7eb;">
          <a href="https://www.cert.ssi.gouv.fr" style="color:#3b82f6;font-size:13px;">View on CERT-FR →</a>
        </div>
      </div>
    </body>
    </html>
  `;
}

function buildTransport() {
  const provider = process.env.EMAIL_PROVIDER ?? 'mock';

  if (provider === 'smtp') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  if (provider === 'resend') {
    // Resend is SMTP-compatible
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    });
  }

  // Mock: logs to console
  return nodemailer.createTransport({ jsonTransport: true });
}

export async function sendAlertEmail(items: FeedItem[]): Promise<void> {
  if (items.length === 0) return;

  const transport = buildTransport();
  const provider = process.env.EMAIL_PROVIDER ?? 'mock';

  const info = await transport.sendMail({
    from: process.env.EMAIL_FROM ?? 'certfr-alerts@example.com',
    to: process.env.EMAIL_TO ?? 'admin@example.com',
    subject: `🛡️ CERT-FR: ${items.length} new publication${items.length > 1 ? 's' : ''}`,
    html: buildEmailHtml(items),
  });

  if (provider === 'mock') {
    console.log('📧 [MOCK EMAIL] Would have sent:');
    const parsed = JSON.parse((info as { message: string }).message);
    console.log(`   To: ${parsed.to?.[0]?.address}`);
    console.log(`   Subject: ${parsed.subject}`);
    console.log(`   Items: ${items.map(i => i.title).join(', ')}`);
  } else {
    console.log(`📧 Email sent: ${info.messageId}`);
  }
}
