# Architecture Document

## Problem Statement
Traditional website monitoring tools are entirely reactive — they only detect failures after they've occurred. Administrators are alerted too late, leading to prolonged downtime and poor user experience.

## Existing Problem with Basic Uptime Checkers
Basic uptime checkers periodically ping a URL and check if the response is `200 OK`. They cannot identify creeping degradation such as steadily growing response times or an SSL certificate approaching expiry.

## Proposed Solution
The Universal Early Warning System introduces proactive anomaly detection. By analyzing response times, HTTP status codes, and SSL certificate expiration, the system provides advance warnings before complete failure occurs.

## System Architecture

### Architectural Diagram
```
+-------------------+     +-------------------+     +-------------------+     +-------------------+
| Target Websites   | --> | Python Engine     | --> | SQLite Database   | --> | Dashboard (Flask) |
| (HTTP / HTTPS)    |     | (HTTP + SSL       |     | (CHECKS table)    |     | (Chart.js)        |
+-------------------+     |  checks)          |     +-------------------+     +-------------------+
                          +--------+----------+
                                   |
                                   v
                          +-------------------+
                          | Discord Webhook   |
                          | (Downtime / SSL   |
                          |  alert)           |
                          +-------------------+
```

### Data Flow
```
URL → check → metrics → database → alert / visualization
```

## Database Design — CHECKS Table (ER Diagram)
| Column | Type | Description |
|---|---|---|
| `id` | Integer (PK) | Primary Key |
| `url` | String | Website URL |
| `checked_at` | DateTime | Date & Time of check |
| `status_code` | Integer | HTTP status |
| `response_ms` | Integer | Response time |
| `is_up` | Boolean | Website available? |
| `ssl_days_left` | Integer | SSL days remaining |

Only CHECKS is the database table in our current plan.

## Monitoring Flow
1. The **Background Scheduler** (APScheduler) triggers `MonitorService.check_all_urls()` every 60 seconds.
2. For each URL in `urls.json`, the **Python Engine** performs an HTTP GET request.
3. Response time, HTTP status code, and SSL certificate details are captured.
4. The result is stored as a new row in the **CHECKS** table.
5. If the site is down or SSL is expiring, a **Discord Webhook** alert is sent.
6. The **Dashboard** reads from the CHECKS table to display real-time status and historical charts.

## Alert Architecture
Discord Webhook embeds are sent when:
- A website is **DOWN** (connection failure, timeout, or HTTP 4xx/5xx).
- An SSL certificate is expiring within 30 days.

Alerts include the URL, status code, response time, and timestamp.

## Testing Strategy
- **Unit Tests**: pytest with `unittest.mock` to patch `requests.get` and SSL checks.
- **No live HTTP requests** in automated tests — all external calls are mocked.
- **Coverage**: Check model, MonitorService, DiscordService.

## Security Considerations
- URLs are validated before monitoring (only `http://` and `https://` accepted).
- Secrets (`DISCORD_WEBHOOK_URL`, `SECRET_KEY`) are stored in `.env`, never committed.
- SQLAlchemy ORM prevents SQL injection.
- Jinja2 auto-escaping prevents XSS.

## Limitations
- SQLite is single-node (not horizontally scalable).
- APScheduler is bound to the running Flask process.

## Future Scope
- Migrate storage to Supabase (PostgreSQL) for cloud-hosted persistence.
- Build a Next.js frontend for a richer, SPA-style dashboard.
- Add Slack and Microsoft Teams webhook integrations.
