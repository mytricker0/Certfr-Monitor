# CERT-FR Monitor

Real-time monitoring dashboard for [CERT-FR](https://www.cert.ssi.gouv.fr/) security publications, with email alerting.

## Architecture

```
docker-compose
├── db          → PostgreSQL 16  (port 5432)
├── backend     → Node.js / TypeScript / Express  (port 3001)
│   ├── Cron job: polls all CERT-FR RSS feeds every 15 min
│   ├── Stores new items in Postgres (deduped by GUID)
│   └── Sends email for new items via SMTP or Resend
└── frontend    → Next.js 14  (port 3000)
    ├── Dashboard with feed items, filters, pagination
    └── Fetch logs view
```

## Quick Start

```bash
# 1. Clone / enter the directory
cd certfr-monitor

# 2. (Optional) Configure email — edit docker-compose.yml
#    See "Email Configuration" below

# 3. Start everything
docker compose up --build

# 4. Open the dashboard
open http://localhost:3000
```

The backend fetches all feeds immediately on startup, then every 15 minutes.

## Email Configuration

Edit the `backend` service environment in `docker-compose.yml`:

### Mock (default — logs to console, no real email)
```yaml
EMAIL_PROVIDER: mock
```

### SMTP (Gmail, etc.)
```yaml
EMAIL_PROVIDER: smtp
EMAIL_TO: you@example.com
EMAIL_FROM: certfr-alerts@example.com
SMTP_HOST: smtp.gmail.com
SMTP_PORT: 587
SMTP_USER: you@gmail.com
SMTP_PASS: your-app-password
```

### Resend
```yaml
EMAIL_PROVIDER: resend
EMAIL_TO: you@example.com
EMAIL_FROM: certfr-alerts@yourdomain.com
RESEND_API_KEY: re_xxxxxxxxxxxx
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/items` | List items (`?feedType=alerte&limit=50&offset=0`) |
| GET | `/api/stats` | Per-feed counts |
| GET | `/api/logs` | Recent fetch logs |
| GET | `/api/feeds` | All feed definitions |
| POST | `/api/fetch` | Trigger a manual fetch |
| GET | `/api/health` | Health check |

## Feeds Monitored

| Type | Label | URL |
|------|-------|-----|
| `alerte` | Security Alerts | `/alerte/feed/` |
| `cti` | Threats & Incidents | `/cti/feed/` |
| `avis` | Security Advisories | `/avis/feed/` |
| `ioc` | IOCs | `/ioc/feed/` |
| `dur` | Hardening & Recs | `/dur/feed/` |
| `actualite` | Bulletins | `/actualite/feed/` |
| `scada` | SCADA | `/feed/scada/` |

## Changing the Fetch Interval

Set `FETCH_INTERVAL_MINUTES` in `docker-compose.yml` (default: 15).

## Credits
Built by Patrick PREDA during an internship at ETNIC (2026).