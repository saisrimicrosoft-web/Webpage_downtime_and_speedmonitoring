# Universal Early Warning System for Website Failures

## 1. Problem Statement
Traditional website monitoring tools only notify administrators *after* a website has failed. This leads to prolonged downtime. Our system detects early warning signals — like latency spikes and SSL certificate expiry — before complete failure.

## 2. Objectives
1. Automatically monitor website availability
2. Measure and record response latency in milliseconds
3. Inspect SSL certificates and calculate days until expiry
4. Store monitoring results with timestamps for analysis
5. Send real-time alerts when a website is down or SSL is nearing expiry
6. Provide a dashboard to visualize performance history
7. Build the complete workflow using free-tier technologies

## 3. Architecture
```
Target Websites ──→ Python Engine ──→ SQLite (CHECKS table) ──→ Dashboard (Flask)
   (HTTP/HTTPS)     (HTTP + SSL)         │
                         │               └──→ Visualization (Chart.js)
                         ▼
                   Discord Webhook
                 (Downtime / SSL alert)
```

**Data Flow:** `URL → check → metrics → database → alert / visualization`

## 4. Technologies
| Component | Technology | 
|---|---|
| Language | Python 3.12+ |
| Web Framework | Flask |
| Database | SQLite + SQLAlchemy |
| Scheduler | APScheduler (local) / GitHub Actions (cloud) |
| Frontend | HTML5, CSS3, JavaScript, Chart.js |
| Alerts | Discord Webhook |
| Testing | pytest, unittest.mock |

## 5. Database — CHECKS Table
| Column | Type | Description |
|---|---|---|
| `id` | Integer (PK) | Primary Key |
| `url` | String | Website URL |
| `checked_at` | DateTime | Date & Time of check |
| `status_code` | Integer | HTTP status |
| `response_ms` | Integer | Response time |
| `is_up` | Boolean | Website available? |
| `ssl_days_left` | Integer | SSL days remaining |

## 6. Setup & Installation

### Create virtual environment
```bash
python -m venv venv
venv\Scripts\activate
```

### Install dependencies
```bash
pip install -r requirements.txt
```

### Configure environment
```bash
copy .env.example .env
```
Edit `.env` and add your `DISCORD_WEBHOOK_URL` if you want Discord alerts.

### Run the application
```bash
venv\Scripts\python.exe run.py
```
Open `http://127.0.0.1:5000` in your browser.

### Run tests
```bash
venv\Scripts\python.exe -m pytest tests/ -v
```

## 7. Managing Monitored URLs
- **Via UI**: Click "Websites" → "Add URL" to add, or "Remove" to delete
- **Via File**: Edit `urls.json` at the project root
- **Via API**: `POST /api/urls` with `{"url": "https://example.com"}`

## 8. API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/urls` | List all monitored URLs with latest check data |
| POST | `/api/urls` | Add a new URL to monitor |
| DELETE | `/api/urls` | Remove a URL |
| GET | `/api/checks/<url>` | Get recent checks for a URL |
| GET | `/api/dashboard/summary` | Dashboard summary stats |

## 9. Discord Alerts
When a website goes down or an SSL certificate is nearing expiry, the system sends a rich embed message to a Discord channel via webhook.

To configure: 
1. Create a webhook in your Discord channel (Channel Settings → Integrations → Webhooks)
2. Copy the webhook URL into your `.env` file as `DISCORD_WEBHOOK_URL`

## 10. GitHub Actions (Cloud Scheduling)
A `.github/workflows/monitor.yml` file is included for automated monitoring via GitHub Actions on a 5-minute cron schedule.

## 11. Limitations
- SQLite is single-node (not horizontally scalable)
- APScheduler is bound to the Flask process

## 12. Future Enhancements
- Migrate to Supabase (PostgreSQL) for cloud-hosted storage
- Add Next.js frontend for a richer dashboard
- Add Slack/Teams webhook support
