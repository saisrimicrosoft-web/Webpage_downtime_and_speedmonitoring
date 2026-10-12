# Requirements Document

## Introduction

Rebuild the Uptime Status page as a live, heartbeat-focused console inspired by the BetterUptime/PulseGuard style. The current page renders four KPI metric cards (Fully Operational, Degraded Latency, Active Outages, SLA Compliance) at the top — these are removed entirely. In their place, the page presents a compact summary header ("X of Y systems alive" with a flatline alert when any monitor is down), a time-range selector, a live streaming indicator, and per-monitor rows each carrying an animated ECG-style heartbeat line color-coded by health status. Clicking a row expands a detail panel with a 91-day contribution-style heatmap grid and a flatline incident log. The page runs against the existing Supabase-backed data layer (`api.ts`) and the existing `CheckRow` schema, so no backend changes are required.

## Glossary

- **System**: The Uptime_Status_Page React component (`UptimeStatusContent`) and its subcomponents that render the live heartbeat uptime view.
- **Monitor**: A monitored URL represented by its latest `CheckRow`.
- **CheckRow**: TypeScript interface mirroring the Supabase `checks` table: `id`, `url`, `checked_at`, `status_code`, `response_ms`, `is_up`, `ssl_days_left`.
- **Health_Status**: One of four states derived from a monitor's latest `CheckRow`: `up`, `slow`, `down`, or `paused`.
- **Heartbeat_Line**: The animated ECG-style SVG path rendered in each monitor row, color-coded by Health_Status.
- **Flatline_Alert**: The red sub-header text shown beneath the summary header when one or more monitors are down.
- **Time_Range**: The selected period (`24h`, `7d`, `30d`, or `90d`) governing heartbeat and uptime data.
- **Streaming_Indicator**: The green pulsing dot rendered next to the "Live heartbeat" label.
- **Detail_Panel**: The expandable section beneath a clicked monitor row containing the Heatmap_Grid and Flatline_Log.
- **Heatmap_Grid**: The 91-day colored square grid (GitHub contribution style) showing daily Health_Status.
- **Flatline_Log**: The incident list within the Detail_Panel showing `Ongoing`/`Resolved` incidents with description and duration.
- **KPI_Cards**: The four metric cards currently on the page (Fully Operational, Degraded Latency, Active Outages, SLA Compliance) — to be removed.
- **Slow_Threshold**: The response time in milliseconds above which a monitor is classified as `slow` (design phase to set the value).
- **getLatestPerUrl**: The `api.ts` function returning the latest `CheckRow` per distinct URL.
- **getUrlHistory**: The `api.ts` function returning recent checks for a single URL.
- **getUrlHistory91Days**: The `api.ts` function returning up to 2000 checks for a single URL for the Heatmap_Grid.
- **Uptime_Percentage**: The percentage of checks with `is_up` true within the selected Time_Range for a given monitor.

---

## Requirements

### Requirement 1 — Summary Header and Flatline Alert

**User Story:** As a dashboard user, I want a compact summary header showing how many systems are alive, so that I can instantly assess overall fleet health.

#### Acceptance Criteria

1. THE System SHALL render a summary header displaying "{aliveCount} of {totalCount} systems alive", where aliveCount is the number of monitors whose latest `CheckRow` has `is_up` true and totalCount is the total number of monitors returned by getLatestPerUrl.
2. WHEN one or more monitors have a latest `CheckRow` with `is_up` false, THE System SHALL render a Flatline_Alert line in red beneath the header containing the down monitor's hostname and the number of minutes since the most recent down check, formatted as "{hostname} flatlined {minutes}m ago".
3. WHILE all monitors have a latest `CheckRow` with `is_up` true, THE System SHALL render the summary header without a Flatline_Alert line.

---

### Requirement 2 — Time Range Selector

**User Story:** As a dashboard user, I want time-range tabs so that I can view heartbeat and uptime data across different periods.

#### Acceptance Criteria

1. THE System SHALL render four selectable range tabs labeled "24h", "7d", "30d", and "90d".
2. WHEN a user selects a range tab, THE System SHALL update the selected Time_Range and refresh the Heartbeat_Line and Uptime_Percentage data for all monitors.
3. THE System SHALL visually highlight the currently selected range tab to distinguish it from unselected tabs.

---

### Requirement 3 — Streaming Indicator and Section Label

**User Story:** As a dashboard user, I want a live streaming indicator so that I know the data is actively refreshing.

#### Acceptance Criteria

1. THE System SHALL render a "Live heartbeat · select a monitor" label above the monitor row list.
2. THE System SHALL render a Streaming_Indicator (a green pulsing dot) adjacent to the label.
3. WHERE the user's operating system prefers reduced motion, THE System SHALL disable the Streaming_Indicator pulsing animation while keeping the dot visible.

---

### Requirement 4 — Per-Monitor Heartbeat Rows

**User Story:** As a dashboard user, I want a row per monitored system showing its live heartbeat, so that I can see each system's status at a glance.

#### Acceptance Criteria

1. THE System SHALL render one row per monitor returned by getLatestPerUrl.
2. EACH row SHALL display a status icon color-coded by Health_Status: a green checkmark for `up`, a yellow warning for `slow`, a red X for `down`, and a pause icon for `paused`.
3. EACH row SHALL display the monitor's hostname, its protocol derived from the URL scheme, and a region descriptor.
4. EACH row SHALL display the monitor's Uptime_Percentage for the selected Time_Range on the right side, color-coded by Health_Status.
5. WHERE a monitor's Health_Status is `paused`, THE System SHALL display the word "Paused" in place of the Uptime_Percentage.
6. THE System SHALL NOT render the KPI_Cards (Fully Operational, Degraded Latency, Active Outages, SLA Compliance) anywhere on the page.

---

### Requirement 5 — Animated ECG Heartbeat Line

**User Story:** As a dashboard user, I want an animated ECG-style heartbeat line per monitor, so that I can visually distinguish healthy, degraded, and flatlined systems at a glance.

#### Acceptance Criteria

1. EACH monitor row SHALL render a Heartbeat_Line derived from the monitor's recent check history.
2. THE System SHALL color the Heartbeat_Line green for `up`, amber for `slow`, red for `down`, and render a dashed grey line for `paused`.
3. THE System SHALL animate the Heartbeat_Line with a continuous leftward sliding motion to convey a live pulse.
4. WHEN a monitor's latest `CheckRow` has `is_up` false, THE System SHALL render a glowing red dot at the right end of the Heartbeat_Line with a pulsing ring effect.
5. WHERE the user's operating system prefers reduced motion, THE System SHALL disable the sliding and pulsing animations while keeping the Heartbeat_Line visible.

---

### Requirement 6 — Clickable Row Detail Panel Expansion

**User Story:** As a dashboard user, I want to click a monitor row to expand a detail panel, so that I can review historical availability and incidents for that system.

#### Acceptance Criteria

1. WHEN a user clicks a monitor row, THE System SHALL toggle the expansion of a Detail_Panel directly beneath that row.
2. WHEN a row is expanded, THE System SHALL fetch 91-day history via getUrlHistory91Days for that monitor's URL.
3. THE System SHALL display at most one expanded Detail_Panel at a time; expanding a new row SHALL collapse any previously expanded row.

---

### Requirement 7 — 91-Day Heatmap Grid

**User Story:** As a dashboard user, I want a 91-day colored square grid, so that I can spot days with degraded performance or downtime at a glance.

#### Acceptance Criteria

1. THE Detail_Panel SHALL render a Heatmap_Grid of exactly 91 colored day squares ordered from oldest to newest.
2. THE System SHALL classify each day from that day's checks: a day containing any check with `is_up` false SHALL be classified `down`; a day whose average `response_ms` exceeds the Slow_Threshold and has no `is_up` false checks SHALL be classified `slow`; a day with all checks `is_up` true and average `response_ms` at or below the Slow_Threshold SHALL be classified `perfect`; a day with no checks SHALL be classified `nodata`.
3. THE System SHALL color each square green for `perfect`, amber for `slow`, rose for `down`, and grey for `nodata`.
4. THE Detail_Panel SHALL display a header reading "{hostname} · last 91 days" and a legend with `Perfect`, `Slow`, and `Down` color swatches.
5. THE System SHALL render "13 weeks ago" and "Today" labels beneath the Heatmap_Grid.

---

### Requirement 8 — Flatline / Incident Log

**User Story:** As a dashboard user, I want a flatline log listing incidents, so that I can review when and why a system went down.

#### Acceptance Criteria

1. THE Detail_Panel SHALL render a Flatline_Log section listing incidents derived from consecutive `is_up` false check runs within the 91-day history.
2. EACH incident entry SHALL display a status badge labeled "Ongoing" for an unresolved run and "Resolved" for a run followed by an up check.
3. EACH incident entry SHALL display a description derived from the failing check's `status_code` (for example "Status 500" or "Timeout") and a start-time label.
4. EACH incident entry SHALL display a duration label computed from the run's start and end `checked_at` values, formatted as a human-readable string.
5. WHEN no incidents exist in the 91-day history, THE System SHALL display "No incidents in this period." in the Flatline_Log section.

---

### Requirement 9 — Live Data Integration

**User Story:** As a dashboard user, I want the heartbeat page to display real monitoring data, so that the page reflects the actual state of my systems.

#### Acceptance Criteria

1. WHEN the System mounts, THE System SHALL call getLatestPerUrl to load all monitors.
2. FOR EACH monitor, THE System SHALL call getUrlHistory to build the Heartbeat_Line data.
3. THE System SHALL derive each monitor's Health_Status from its latest `CheckRow`: `is_up` false → `down`, `response_ms` exceeding the Slow_Threshold → `slow`, otherwise → `up`.
4. THE System SHALL compute Uptime_Percentage as the percentage of checks with `is_up` true within the selected Time_Range for that monitor.
5. THE System SHALL NOT render any hardcoded mock or sample monitor data.

---

### Requirement 10 — Auto-Refresh

**User Story:** As a dashboard user, I want the heartbeat data to refresh automatically, so that I see current status without manually reloading.

#### Acceptance Criteria

1. WHILE the System is mounted, THE System SHALL refresh monitor and Heartbeat_Line data every 60 seconds via a setInterval loop.
2. THE System SHALL clear the refresh interval when the System unmounts.

---

### Requirement 11 — Loading, Empty, and Error States

**User Story:** As a dashboard user, I want clear feedback while data loads or when errors occur, so that I always know the current state of the page.

#### Acceptance Criteria

1. WHILE data is being fetched, THE System SHALL display a loading spinner.
2. IF getLatestPerUrl returns an empty array, THE System SHALL display an empty state message indicating no monitors are configured.
3. IF a data fetch throws an error, THE System SHALL display an error banner with a Retry button that re-runs the fetch.
