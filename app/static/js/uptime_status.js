/**
 * Uptime Status — Frontend Application
 * =====================================
 * Professional observability console for website monitoring.
 *
 * Features:
 *   1. Website selector with live status
 *   2. Status banner with live updates
 *   3. Uptime activity timeline
 *   4. Downtime/incident history
 *   5. Status history table with pagination
 *   6. Incident detail drawer
 *   7. Regional monitoring status
 *   8. Response time information
 *   9. Filters (time range, status, incidents)
 *  10. Live polling with graceful error handling
 */

const UptimeApp = (() => {
    'use strict';

    // ── State ────────────────────────────────────────────────────
    let state = {
        selectedUrl: '',
        range: '24h',
        statusFilter: 'all',
        incidentFilter: 'all',
        page: 1,
        perPage: 50,
        pollInterval: null,
        pollMs: 30000, // 30 seconds
        lastUpdated: null,
        isStale: false,
        connectionState: 'live', // 'live' | 'reconnecting' | 'offline'
        failedAttempts: 0,
    };

    // ── DOM References ───────────────────────────────────────────
    const $ = (id) => document.getElementById(id);
    const $q = (sel) => document.querySelector(sel);
    const $qa = (sel) => document.querySelectorAll(sel);

    // ── Initialization ───────────────────────────────────────────
    function init() {
        const select = $('uptime-url-select');
        if (!select || select.options.length === 0) return;

        state.selectedUrl = select.value;

        // Wire up event listeners
        select.addEventListener('change', onWebsiteChange);
        wireFilters();
        wireDrawer();
        wirePagination();

        // Initial data load
        refresh();

        // Start live polling
        startPolling();

        // Update "last checked" relative time every 5s
        setInterval(updateRelativeTime, 5000);
    }

    // ── API Fetcher ──────────────────────────────────────────────
    async function apiFetch(endpoint, params = {}) {
        const url = new URL(endpoint, window.location.origin);
        Object.entries(params).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') {
                url.searchParams.set(k, v);
            }
        });

        try {
            const resp = await fetch(url.toString(), {
                headers: { 'Accept': 'application/json' },
            });
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}`);
            }
            state.failedAttempts = 0;
            setConnectionState('live');
            return await resp.json();
        } catch (err) {
            state.failedAttempts++;
            if (state.failedAttempts >= 3) {
                setConnectionState('offline');
            } else {
                setConnectionState('reconnecting');
            }
            throw err;
        }
    }

    // ── Connection state management ─────────────────────────────
    function setConnectionState(newState) {
        if (state.connectionState === newState) return;
        state.connectionState = newState;

        const badge = $('uptime-live-badge');
        if (!badge) return;

        badge.className = 'uptime-live-indicator ' + newState;
        const labels = {
            live: '<span class="uptime-live-dot"></span><span>Live</span>',
            reconnecting: '<span class="uptime-live-dot"></span><span>Reconnecting…</span>',
            offline: '<span>● Offline</span>',
        };
        badge.innerHTML = labels[newState] || labels.live;
        badge.setAttribute('aria-label', newState === 'live' ? 'Live monitoring active' : `Monitoring ${newState}`);
    }

    // ── Refresh all data ─────────────────────────────────────────
    async function refresh() {
        if (!state.selectedUrl) return;
        state.lastUpdated = new Date();

        // Fire all API calls in parallel
        await Promise.allSettled([
            loadStatus(),
            loadTimeline(),
            loadSummary(),
            loadIncidents(),
            loadHistory(),
            loadRegions(),
            loadResponseTime(),
        ]);
    }

    // ── 1. Status Banner ─────────────────────────────────────────
    async function loadStatus() {
        try {
            const data = await apiFetch('/api/uptime/status', { url: state.selectedUrl });
            renderBanner(data);
        } catch (e) {
            console.error('Failed to load status:', e);
        }
    }

    function renderBanner(data) {
        const banner = $('uptime-banner');
        const icon = $('uptime-status-icon');
        const label = $('uptime-status-label');
        const message = $('uptime-status-message');
        const urlEl = $('uptime-status-url');

        const st = data.status || 'unknown';

        // Update banner classes
        banner.className = 'uptime-banner status-' + st;
        icon.className = 'uptime-status-icon ' + st;
        label.className = 'uptime-banner-label ' + st;

        // Label text
        const labelMap = {
            operational: '● OPERATIONAL',
            degraded: '⚠ DEGRADED',
            down: '✕ DOWN',
            unknown: '? UNKNOWN',
        };
        label.textContent = labelMap[st] || labelMap.unknown;
        message.textContent = data.message || '';
        urlEl.textContent = state.selectedUrl;

        // Last checked
        if (data.last_checked) {
            state._lastCheckTime = new Date(data.last_checked);
            updateRelativeTime();
        }
    }

    function updateRelativeTime() {
        const el = $('uptime-last-checked');
        if (!el || !state._lastCheckTime) return;

        const diff = Math.floor((Date.now() - state._lastCheckTime.getTime()) / 1000);
        let text;
        if (diff < 5) text = 'Just now';
        else if (diff < 60) text = `${diff} sec ago`;
        else if (diff < 3600) text = `${Math.floor(diff / 60)} min ago`;
        else text = `${Math.floor(diff / 3600)}h ago`;

        el.textContent = `Last checked ${text}`;
    }

    // ── 2. Uptime Summary ────────────────────────────────────────
    async function loadSummary() {
        try {
            const data = await apiFetch('/api/uptime/summary', {
                url: state.selectedUrl,
                range: state.range,
            });
            renderSummary(data);
        } catch (e) {
            console.error('Failed to load summary:', e);
        }
    }

    function renderSummary(data) {
        const pctEl = $('uptime-pct');
        if (!pctEl) return;

        const pct = data.uptime_percentage ?? 0;
        pctEl.textContent = `${pct.toFixed(2)}% uptime`;

        if (pct >= 99) pctEl.className = 'uptime-pct good';
        else if (pct >= 95) pctEl.className = 'uptime-pct warn';
        else pctEl.className = 'uptime-pct bad';
    }

    // ── 3. Uptime Timeline ───────────────────────────────────────
    async function loadTimeline() {
        try {
            const segments = await apiFetch('/api/uptime/timeline', {
                url: state.selectedUrl,
                range: state.range,
            });
            renderTimeline(segments);
        } catch (e) {
            console.error('Failed to load timeline:', e);
        }
    }

    function renderTimeline(segments) {
        const loading = $('timeline-loading');
        const bar = $('uptime-bar');
        const labels = $('uptime-bar-labels');

        if (loading) loading.style.display = 'none';
        if (!bar || !labels) return;

        bar.style.display = 'flex';
        labels.style.display = 'flex';

        if (!segments || segments.length === 0) {
            bar.innerHTML = '<div class="uptime-bar-segment unknown" style="flex:1"></div>';
            labels.innerHTML = '<span>No data</span><span></span>';
            return;
        }

        // Build segments
        bar.innerHTML = segments.map((seg, i) => {
            const st = seg.status || 'unknown';
            return `<div class="uptime-bar-segment ${st}" 
                         data-segment="${i}"
                         aria-label="${st} from ${formatTimeShort(seg.start)} to ${formatTimeShort(seg.end)}"
                         tabindex="0"
                         role="button"></div>`;
        }).join('');

        // Labels
        const first = segments[0];
        const last = segments[segments.length - 1];
        labels.innerHTML = `
            <span>${formatDateLabel(first.start)}</span>
            <span>${formatDateLabel(last.end)}</span>
        `;

        // Tooltips
        bar.querySelectorAll('.uptime-bar-segment').forEach((el) => {
            const idx = parseInt(el.dataset.segment);
            const seg = segments[idx];

            el.addEventListener('mouseenter', (e) => showTooltip(e, seg));
            el.addEventListener('mousemove', (e) => positionTooltip(e));
            el.addEventListener('mouseleave', hideTooltip);
            el.addEventListener('focus', (e) => showTooltip(e, seg));
            el.addEventListener('blur', hideTooltip);
        });
    }

    // ── 4. Downtime/Incidents ────────────────────────────────────
    async function loadIncidents() {
        try {
            const incidents = await apiFetch('/api/uptime/incidents', {
                url: state.selectedUrl,
                range: state.range,
            });
            renderIncidents(incidents);
        } catch (e) {
            console.error('Failed to load incidents:', e);
            const body = $('uptime-incidents-body');
            if (body) body.innerHTML = '<div class="uptime-error"><div class="uptime-error-icon">✕</div><h4>Unable to load incidents</h4></div>';
        }
    }

    function renderIncidents(incidents) {
        const loading = $('incidents-loading');
        const body = $('uptime-incidents-body');
        const countBadge = $('incident-count-badge');

        if (loading) loading.style.display = 'none';
        if (!body) return;

        // Update count badge
        if (countBadge) {
            countBadge.textContent = incidents.length;
            countBadge.className = incidents.length > 0 ? 'uptime-incident-count' : 'uptime-incident-count zero';
        }

        if (!incidents || incidents.length === 0) {
            body.innerHTML = `
                <div class="uptime-incidents-empty">
                    <div class="uptime-incidents-empty-icon">
                        <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    </div>
                    <h4>No downtime recorded</h4>
                    <p>No incidents detected during this period. Your website has been running smoothly.</p>
                </div>`;
            return;
        }

        body.innerHTML = incidents.map(inc => {
            const sevIcon = inc.severity === 'down' ? '✕' : '⚠';
            const sevClass = inc.severity || 'down';
            const statusBadge = inc.status === 'resolved' ? 'resolved' : 'open';
            const started = formatTime(inc.started_at);
            const ended = inc.recovered_at ? formatTime(inc.recovered_at) : 'Ongoing';

            return `
                <div class="uptime-incident-item" data-incident-id="${inc.id}" 
                     role="button" tabindex="0" aria-label="Incident: ${inc.severity} starting ${started}">
                    <div class="uptime-incident-severity ${sevClass}">${sevIcon}</div>
                    <div class="uptime-incident-info">
                        <div class="uptime-incident-title">${inc.severity === 'down' ? 'Website Down' : 'Degraded Performance'}</div>
                        <div class="uptime-incident-meta">
                            <span>
                                <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                ${started} – ${ended}
                            </span>
                            <span>Duration: ${inc.duration_display || '—'}</span>
                            ${inc.region ? `<span>Region: ${inc.region}</span>` : ''}
                        </div>
                    </div>
                    <span class="uptime-incident-status-badge ${statusBadge}">${statusBadge}</span>
                </div>`;
        }).join('');

        // Wire incident click handlers
        body.querySelectorAll('.uptime-incident-item').forEach(el => {
            el.addEventListener('click', () => openIncidentDrawer(el.dataset.incidentId));
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openIncidentDrawer(el.dataset.incidentId);
                }
            });
        });
    }

    // ── 5. Status History Table ───────────────────────────────────
    async function loadHistory() {
        try {
            const statusParam = state.statusFilter === 'all' ? null : state.statusFilter;
            // If incidents filter is active, only show down events
            let effectiveStatus = statusParam;
            if (state.incidentFilter === 'incidents') {
                effectiveStatus = 'down';
            }

            const data = await apiFetch('/api/uptime/history', {
                url: state.selectedUrl,
                range: state.range,
                status: effectiveStatus,
                page: state.page,
                per_page: state.perPage,
            });
            renderHistory(data);
        } catch (e) {
            console.error('Failed to load history:', e);
            showHistoryError(e.message);
        }
    }

    function renderHistory(data) {
        const loading = $('history-loading');
        const container = $('uptime-table-container');
        const empty = $('history-empty');
        const error = $('history-error');
        const tbody = $('uptime-table-body');
        const countEl = $('history-result-count');

        if (loading) loading.style.display = 'none';
        if (error) error.style.display = 'none';

        if (!data.events || data.events.length === 0) {
            if (container) container.style.display = 'none';
            if (empty) empty.style.display = 'block';
            if (countEl) countEl.textContent = '0 events';
            return;
        }

        if (empty) empty.style.display = 'none';
        if (container) container.style.display = 'block';
        if (countEl) countEl.textContent = `${data.total} event${data.total !== 1 ? 's' : ''}`;

        // Render rows
        tbody.innerHTML = data.events.map(ev => {
            const st = ev.status || 'unknown';
            const timeStr = formatTime(ev.checked_at);

            // Response time styling
            let respClass = 'normal';
            if (ev.response_display === 'Timeout' || ev.response_display === 'Error') respClass = 'timeout';
            else if (ev.response_ms !== null) {
                if (ev.response_ms < 200) respClass = 'fast';
                else if (ev.response_ms > 500) respClass = 'slow';
            }

            // Event type styling
            let eventClass = 'health-check';
            if (ev.event_type === 'Incident') eventClass = 'incident';
            else if (ev.event_type === 'Slow Response') eventClass = 'slow-response';

            return `<tr>
                <td class="uptime-cell-time">${timeStr}</td>
                <td>
                    <span class="uptime-cell-status">
                        <span class="uptime-cell-status-dot ${st}" aria-hidden="true"></span>
                        <span class="uptime-cell-status-text">${ev.status_label}</span>
                    </span>
                </td>
                <td><span class="uptime-cell-response ${respClass}">${ev.response_display}</span></td>
                <td class="uptime-cell-region">${ev.region || '—'}</td>
                <td><span class="uptime-cell-event ${eventClass}">${ev.event_type}</span></td>
            </tr>`;
        }).join('');

        // Pagination
        renderPagination(data);
    }

    function showHistoryError(msg) {
        const loading = $('history-loading');
        const container = $('uptime-table-container');
        const empty = $('history-empty');
        const error = $('history-error');
        const errorMsg = $('history-error-msg');

        if (loading) loading.style.display = 'none';
        if (container) container.style.display = 'none';
        if (empty) empty.style.display = 'none';
        if (error) error.style.display = 'block';
        if (errorMsg) errorMsg.textContent = msg || 'An unexpected error occurred.';
    }

    function renderPagination(data) {
        const pag = $('uptime-pagination');
        const info = $('pagination-info');
        const btns = $('pagination-btns');

        if (!pag || data.total_pages <= 1) {
            if (pag) pag.style.display = 'none';
            return;
        }

        pag.style.display = 'flex';
        const start = (data.page - 1) * data.per_page + 1;
        const end = Math.min(data.page * data.per_page, data.total);
        info.textContent = `Showing ${start}–${end} of ${data.total}`;

        let html = '';
        html += `<button class="uptime-page-btn" data-page="${data.page - 1}" ${data.page <= 1 ? 'disabled' : ''}>← Prev</button>`;

        // Show max 5 page buttons
        const maxBtns = 5;
        let startP = Math.max(1, data.page - Math.floor(maxBtns / 2));
        let endP = Math.min(data.total_pages, startP + maxBtns - 1);
        if (endP - startP + 1 < maxBtns) startP = Math.max(1, endP - maxBtns + 1);

        for (let p = startP; p <= endP; p++) {
            html += `<button class="uptime-page-btn ${p === data.page ? 'active' : ''}" data-page="${p}">${p}</button>`;
        }

        html += `<button class="uptime-page-btn" data-page="${data.page + 1}" ${data.page >= data.total_pages ? 'disabled' : ''}>Next →</button>`;
        btns.innerHTML = html;
    }

    function wirePagination() {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.uptime-page-btn');
            if (!btn || btn.disabled) return;
            const page = parseInt(btn.dataset.page);
            if (page > 0) {
                state.page = page;
                loadHistory();
            }
        });
    }

    // ── 6. Incident Detail Drawer ────────────────────────────────
    async function openIncidentDrawer(incidentId) {
        const overlay = $('uptime-drawer-overlay');
        const drawer = $('uptime-drawer');
        const body = $('uptime-drawer-body');

        if (!overlay || !drawer || !body) return;

        overlay.classList.add('open');
        drawer.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
        drawer.setAttribute('aria-hidden', 'false');

        body.innerHTML = '<div class="uptime-loading"><div class="uptime-skeleton wide"></div><div class="uptime-skeleton medium"></div><div class="uptime-skeleton short"></div></div>';

        try {
            const data = await apiFetch(`/api/uptime/incidents/${incidentId}`);
            renderDrawer(data);
        } catch (e) {
            body.innerHTML = '<div class="uptime-error"><div class="uptime-error-icon">✕</div><h4>Unable to load incident</h4></div>';
        }
    }

    function renderDrawer(data) {
        const body = $('uptime-drawer-body');
        if (!body) return;

        const sevClass = data.severity || 'down';
        const sevLabel = sevClass === 'down' ? '● DOWN' : '⚠ DEGRADED';

        const fields = [
            { label: 'Website', value: data.url || 'N/A' },
            { label: 'Started', value: data.started_at ? formatTimeFull(data.started_at) : 'N/A', mono: true },
            { label: 'Detected', value: data.detected_at ? formatTimeFull(data.detected_at) : 'N/A', mono: true },
            { label: 'Recovered', value: data.recovered_at ? formatTimeFull(data.recovered_at) : (data.status === 'open' ? 'Not yet recovered' : 'N/A'), mono: true },
            { label: 'Duration', value: data.duration_display || 'Ongoing' },
            { label: 'Region', value: data.region || 'N/A' },
            { label: 'HTTP Status', value: data.http_status ? `${data.http_status}` : 'N/A', mono: true },
            { label: 'Response Time', value: data.response_ms != null ? `${data.response_ms} ms` : 'N/A', mono: true },
            { label: 'Error Message', value: data.error_message || 'Not available' },
            { label: 'Failed Checks', value: data.failure_count ? `${data.failure_count}` : 'N/A' },
            { label: 'Incident Status', value: data.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1) : 'N/A' },
        ];

        body.innerHTML = `
            <div class="uptime-drawer-severity ${sevClass}">${sevLabel}</div>
            ${fields.map(f => `
                <div class="uptime-drawer-field">
                    <div class="uptime-drawer-field-label">${f.label}</div>
                    <div class="uptime-drawer-field-value ${f.mono ? 'mono' : ''}">${f.value}</div>
                </div>
            `).join('')}
        `;
    }

    function closeDrawer() {
        const overlay = $('uptime-drawer-overlay');
        const drawer = $('uptime-drawer');
        if (overlay) { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true'); }
        if (drawer) { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); }
    }

    function wireDrawer() {
        const closeBtn = $('uptime-drawer-close');
        const overlay = $('uptime-drawer-overlay');
        if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
        if (overlay) overlay.addEventListener('click', closeDrawer);

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeDrawer();
        });
    }

    // ── 7. Regional Status ───────────────────────────────────────
    async function loadRegions() {
        try {
            const regions = await apiFetch('/api/uptime/regions', { url: state.selectedUrl });
            renderRegions(regions);
        } catch (e) {
            console.error('Failed to load regions:', e);
        }
    }

    function renderRegions(regions) {
        const loading = $('regions-loading');
        const list = $('uptime-region-list');
        if (loading) loading.style.display = 'none';
        if (!list) return;

        if (!regions || regions.length === 0) {
            list.innerHTML = '<div class="uptime-region-item"><span class="uptime-region-name">No regions configured</span></div>';
            return;
        }

        list.innerHTML = regions.map(r => {
            const st = r.status || 'unknown';
            const respText = r.response_ms != null ? `${r.response_ms} ms` : '';
            return `
                <div class="uptime-region-item">
                    <span class="uptime-region-name">${r.region}</span>
                    <span class="uptime-region-status">
                        ${respText ? `<span style="font-family:'JetBrains Mono',monospace;font-size:0.72rem;color:var(--text-faint);margin-right:4px;">${respText}</span>` : ''}
                        <span class="uptime-region-dot ${st}" aria-hidden="true"></span>
                        <span class="uptime-region-label">${r.status_label || st}</span>
                    </span>
                </div>`;
        }).join('');
    }

    // ── 8. Response Time ─────────────────────────────────────────
    async function loadResponseTime() {
        try {
            const data = await apiFetch('/api/uptime/response-time', {
                url: state.selectedUrl,
                range: state.range,
            });
            renderResponseTime(data);
        } catch (e) {
            console.error('Failed to load response time:', e);
        }
    }

    function renderResponseTime(data) {
        const loading = $('response-loading');
        const body = $('uptime-response-body');
        if (loading) loading.style.display = 'none';
        if (!body) return;

        if (data.current === null && data.avg === null) {
            body.innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);padding:4px 0;">No response data available yet.</p>';
            return;
        }

        // Sparkline
        let sparklineHtml = '';
        if (data.data_points && data.data_points.length > 1) {
            const maxVal = Math.max(...data.data_points.map(p => p.value || 0), 1);
            sparklineHtml = `<div class="uptime-sparkline">${data.data_points.map(p => {
                const h = Math.max(2, Math.round((p.value / maxVal) * 36));
                let color = 'var(--brand)';
                if (p.value > 500) color = 'var(--amber)';
                if (p.value > 1000 || p.value < 0) color = 'var(--red)';
                return `<div class="uptime-spark-bar" style="height:${h}px;background:${color}" title="${p.value} ms"></div>`;
            }).join('')}</div>`;
        }

        body.innerHTML = `
            <div class="uptime-response-current">
                <span class="uptime-response-value">${data.current ?? '—'}</span>
                <span class="uptime-response-unit">ms current</span>
            </div>
            <div class="uptime-response-stats">
                <div class="uptime-response-stat">
                    <span class="uptime-response-stat-label">Average</span>
                    <span class="uptime-response-stat-value">${data.avg ?? '—'} ms</span>
                </div>
                <div class="uptime-response-stat">
                    <span class="uptime-response-stat-label">P95</span>
                    <span class="uptime-response-stat-value">${data.p95 ?? '—'} ms</span>
                </div>
                <div class="uptime-response-stat">
                    <span class="uptime-response-stat-label">Min</span>
                    <span class="uptime-response-stat-value">${data.min ?? '—'} ms</span>
                </div>
                <div class="uptime-response-stat">
                    <span class="uptime-response-stat-label">Max</span>
                    <span class="uptime-response-stat-value">${data.max ?? '—'} ms</span>
                </div>
            </div>
            ${sparklineHtml}
        `;
    }

    // ── 9. Filters ───────────────────────────────────────────────
    function wireFilters() {
        $qa('.uptime-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const filterType = btn.dataset.filter;
                const value = btn.dataset.value;

                // Update active state within group
                btn.closest('.uptime-filter-group').querySelectorAll('.uptime-filter-btn').forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-checked', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-checked', 'true');

                // Update state
                if (filterType === 'range') {
                    state.range = value;
                    state.page = 1;
                } else if (filterType === 'status') {
                    state.statusFilter = value;
                    state.page = 1;
                } else if (filterType === 'incidents') {
                    state.incidentFilter = value;
                    state.page = 1;
                }

                // Reload data
                showAllLoadingStates();
                refresh();
            });
        });
    }

    function showAllLoadingStates() {
        // Show loading skeletons
        ['timeline-loading', 'incidents-loading', 'history-loading', 'regions-loading', 'response-loading'].forEach(id => {
            const el = $(id);
            if (el) el.style.display = 'flex';
        });
        const container = $('uptime-table-container');
        if (container) container.style.display = 'none';
        const empty = $('history-empty');
        if (empty) empty.style.display = 'none';
    }

    // ── 10. Live Polling ─────────────────────────────────────────
    function startPolling() {
        stopPolling();
        state.pollInterval = setInterval(() => {
            refresh();
        }, state.pollMs);
    }

    function stopPolling() {
        if (state.pollInterval) {
            clearInterval(state.pollInterval);
            state.pollInterval = null;
        }
    }

    // ── Website change handler ───────────────────────────────────
    function onWebsiteChange(e) {
        state.selectedUrl = e.target.value;
        state.page = 1;
        showAllLoadingStates();
        refresh();
    }

    // ── Tooltip ──────────────────────────────────────────────────
    function showTooltip(e, seg) {
        const tooltip = $('uptime-tooltip');
        if (!tooltip) return;

        const st = seg.status || 'unknown';
        const dotColor = {
            operational: 'var(--green)',
            degraded: 'var(--amber)',
            down: 'var(--red)',
            unknown: 'var(--text-faint)',
        }[st] || 'var(--text-faint)';

        tooltip.innerHTML = `
            <div class="uptime-tooltip-status">
                <span class="uptime-tooltip-dot" style="background:${dotColor}"></span>
                ${st.charAt(0).toUpperCase() + st.slice(1)}
            </div>
            <div class="uptime-tooltip-detail">
                ${formatTimeShort(seg.start)} — ${formatTimeShort(seg.end)}<br>
                ${seg.checks} check${seg.checks !== 1 ? 's' : ''}${seg.avg_response_ms != null ? ` · ${seg.avg_response_ms} ms avg` : ''}
            </div>
        `;
        tooltip.classList.add('visible');
        positionTooltip(e);
    }

    function positionTooltip(e) {
        const tooltip = $('uptime-tooltip');
        if (!tooltip) return;

        const x = (e.clientX || e.pageX || 0) + 12;
        const y = (e.clientY || e.pageY || 0) - 10;
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    }

    function hideTooltip() {
        const tooltip = $('uptime-tooltip');
        if (tooltip) tooltip.classList.remove('visible');
    }

    // ── Time Formatting Utilities ────────────────────────────────
    function formatTime(isoStr) {
        if (!isoStr) return '—';
        const d = new Date(isoStr);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    }

    function formatTimeFull(isoStr) {
        if (!isoStr) return '—';
        const d = new Date(isoStr);
        return d.toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        });
    }

    function formatTimeShort(isoStr) {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        return d.toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
        });
    }

    function formatDateLabel(isoStr) {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // ── Public API ───────────────────────────────────────────────
    return {
        init,
        refresh,
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', UptimeApp.init);
