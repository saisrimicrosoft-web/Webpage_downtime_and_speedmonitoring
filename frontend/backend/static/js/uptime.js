document.addEventListener('DOMContentLoaded', () => {
    const timeRangeSelector = document.getElementById('time-range-selector');
    const exportBtn = document.getElementById('export-csv-btn');
    const searchInput = document.getElementById('website-search-input');
    const statusFilter = document.getElementById('status-filter');
    
    let currentData = { websites: [], incidents: [] };
    let trendChart = null;
    let websiteCharts = {};
    let autoRefreshTimer = null;
    let lastFetchTime = null;
    let updateTextTimer = null;

    function formatDuration(seconds) {
        if (seconds === undefined || seconds === null) return '--';
        if (seconds === 0) return '0s';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }

    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return (unsafe || '').toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async function loadData() {
        const range = timeRangeSelector.value;
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const [summaryRes, websitesRes, incidentsRes] = await Promise.all([
                fetch(`/api/uptime/summary?range=${range}`, { headers }),
                fetch(`/api/uptime/websites?range=${range}`, { headers }),
                fetch(`/api/uptime/incidents?range=${range}`, { headers })
            ]);

            const summary = await summaryRes.json();
            const websites = await websitesRes.json();
            const incidents = await incidentsRes.json();

            currentData.websites = websites;
            currentData.incidents = incidents.incidents || [];
            lastFetchTime = new Date();

            updateKPIs(summary);
            renderTrendChart(websites, range);
            renderWebsites();
            renderIncidents();
            updateLastUpdatedText();
        } catch (err) {
            console.error('Error loading uptime data', err);
            document.getElementById('websites-container').innerHTML = `<div style="padding: 32px; text-align: center; color: var(--danger-color);">Failed to load data. <button onclick="window.location.reload()" class="btn btn-sm btn-primary">Retry</button></div>`;
        }
        
        // Auto-refresh every 60s
        clearTimeout(autoRefreshTimer);
        autoRefreshTimer = setTimeout(loadData, 60000);
        
        clearInterval(updateTextTimer);
        updateTextTimer = setInterval(updateLastUpdatedText, 1000);
    }

    function updateLastUpdatedText() {
        if (!lastFetchTime) return;
        const diff = Math.floor((new Date() - lastFetchTime) / 1000);
        const textEl = document.getElementById('last-updated-text');
        if (diff < 5) {
            textEl.textContent = 'Last updated: just now';
        } else {
            textEl.textContent = `Last updated: ${diff}s ago`;
        }
    }

    function updateKPIs(summary) {
        document.getElementById('kpi-uptime').textContent = summary.overall_uptime_pct !== null ? `${summary.overall_uptime_pct.toFixed(2)}%` : '--%';
        document.getElementById('kpi-downtime').textContent = formatDuration(summary.total_downtime_seconds);
        document.getElementById('kpi-incidents').textContent = summary.incident_count;
        document.getElementById('kpi-response').textContent = summary.avg_response_time ? `${summary.avg_response_time} ms` : '-- ms';
        document.getElementById('kpi-longest').textContent = formatDuration(summary.longest_outage_seconds);

        const banner = document.getElementById('overall-status-banner');
        const text = document.getElementById('overall-status-text');
        
        banner.className = 'alert';
        if (summary.overall_state === 'down') {
            banner.classList.add('alert-danger');
            text.textContent = 'Major Outage';
        } else if (summary.overall_state === 'degraded' || summary.overall_state === 'partial') {
            banner.classList.add('alert-warning');
            text.textContent = 'Partial Outage';
        } else {
            banner.classList.add('alert-success');
            text.textContent = 'All Systems Operational';
        }
    }

    function renderTrendChart(websites, range) {
        // Aggregate daily data across all websites to compute an overall trend
        const dailyAgg = {};
        websites.forEach(ws => {
            if (ws.daily) {
                ws.daily.forEach(d => {
                    if (!dailyAgg[d.date]) dailyAgg[d.date] = { up: 0, total: 0 };
                    dailyAgg[d.date].total += d.checks;
                    if (d.uptime_pct !== null) {
                        dailyAgg[d.date].up += Math.round(d.checks * (d.uptime_pct / 100));
                    }
                });
            }
        });

        // Filter dates by selected range roughly
        const dates = Object.keys(dailyAgg).sort();
        let daysToKeep = 1;
        if (range === '7d') daysToKeep = 7;
        else if (range === '30d') daysToKeep = 30;
        else if (range === '90d') daysToKeep = 90;
        
        const filteredDates = dates.slice(-daysToKeep);
        const labels = filteredDates;
        const data = filteredDates.map(date => {
            const agg = dailyAgg[date];
            return agg.total > 0 ? (agg.up / agg.total) * 100 : null;
        });

        const ctx = document.getElementById('uptimeTrendChart').getContext('2d');
        if (trendChart) {
            trendChart.data.labels = labels;
            trendChart.data.datasets[0].data = data;
            trendChart.update();
        } else {
            trendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Overall Uptime %',
                        data: data,
                        borderColor: '#7c3aed',
                        backgroundColor: 'rgba(124, 58, 237, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { min: 0, max: 100 }
                    }
                }
            });
        }
    }

    function renderWebsites() {
        const container = document.getElementById('websites-container');
        const q = searchInput.value.toLowerCase();
        const stat = statusFilter.value;
        const range = timeRangeSelector.value;
        
        let html = '';
        let count = 0;
        
        const rangeKey = 'uptime_' + range;
        
        currentData.websites.forEach((ws, idx) => {
            const nameMatch = ws.name.toLowerCase().includes(q) || ws.url.toLowerCase().includes(q);
            const statMatch = stat === 'all' || ws.status === stat;
            
            if (!nameMatch || !statMatch) return;
            count++;
            
            const badgeClass = ws.status === 'operational' ? 'badge-success' : (ws.status === 'down' ? 'badge-danger' : 'badge-warning');
            const statusText = ws.status === 'operational' ? 'Online' : (ws.status === 'down' ? 'Offline' : 'Degraded');
            const avgResp = ws.avg_response_time ? ws.avg_response_time + ' ms' : '-- ms';
            
            const u24 = ws.uptime_24h !== null ? ws.uptime_24h.toFixed(2) + '%' : '--%';
            const u7 = ws.uptime_7d !== null ? ws.uptime_7d.toFixed(2) + '%' : '--%';
            const u30 = ws.uptime_30d !== null ? ws.uptime_30d.toFixed(2) + '%' : '--%';
            const u90 = ws.uptime_90d !== null ? ws.uptime_90d.toFixed(2) + '%' : '--%';
            
            // Generate 90-day bar segments
            let barHtml = '';
            if (ws.daily) {
                ws.daily.forEach(d => {
                    let segClass = 'segment-nodata';
                    if (d.uptime_pct !== null) {
                        if (d.uptime_pct >= 99) segClass = 'segment-operational';
                        else if (d.uptime_pct >= 90) segClass = 'segment-degraded';
                        else segClass = 'segment-down';
                    }
                    barHtml += `
                        <div class="uptime-segment ${segClass}">
                            <div class="uptime-tooltip">
                                <strong>${d.date}</strong><br>
                                Uptime: ${d.uptime_pct !== null ? d.uptime_pct.toFixed(2)+'%' : 'No Data'}<br>
                                Downtime: ${d.downtime_minutes}m<br>
                                Checks: ${d.checks}
                            </div>
                        </div>
                    `;
                });
            }

            html += `
                <div class="website-row" onclick="toggleChart('${escapeHtml(ws.url)}', ${idx})">
                    <div class="website-header">
                        <div class="website-info">
                            <img src="https://www.google.com/s2/favicons?domain=${escapeHtml(ws.url)}&sz=64" class="website-favicon" alt="favicon">
                            <div>
                                <div class="website-name">${escapeHtml(ws.name)}</div>
                                <div class="website-url">${escapeHtml(ws.url)}</div>
                            </div>
                            <span class="badge ${badgeClass}" style="margin-left: 8px;"><span class="status-dot"></span>${statusText}</span>
                        </div>
                        <div class="website-metrics">
                            <div class="metric-item">
                                <span class="metric-label">24h</span>
                                <span class="metric-value">${u24}</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">7d</span>
                                <span class="metric-value">${u7}</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">30d</span>
                                <span class="metric-value">${u30}</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">90d</span>
                                <span class="metric-value">${u90}</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">Avg Resp</span>
                                <span class="metric-value">${avgResp}</span>
                            </div>
                        </div>
                    </div>
                    <div class="uptime-bar-container">
                        ${barHtml}
                    </div>
                    <div class="chart-container" id="chart-container-${idx}" onclick="event.stopPropagation()">
                        <canvas id="chart-canvas-${idx}" height="60"></canvas>
                    </div>
                </div>
            `;
        });
        
        if (count === 0) {
            html = `<div style="padding: 32px; text-align: center; color: var(--text-muted);">No websites found matching your filters.</div>`;
        }
        
        container.innerHTML = html;
    }

    window.toggleChart = async function(url, idx) {
        const row = document.getElementById(`chart-container-${idx}`).parentElement;
        const wasExpanded = row.classList.contains('expanded');
        
        // Collapse all others
        document.querySelectorAll('.website-row').forEach(r => r.classList.remove('expanded'));
        
        if (!wasExpanded) {
            row.classList.add('expanded');
            
            // Fetch history data for chart
            const range = timeRangeSelector.value;
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const res = await fetch(`/api/uptime/websites/${encodeURIComponent(url)}/history?range=${range}`, { headers });
            const history = await res.json();
            
            const labels = history.map(h => {
                const d = new Date(h.time);
                return d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            });
            const data = history.map(h => h.response_ms);
            
            const ctx = document.getElementById(`chart-canvas-${idx}`).getContext('2d');
            if (websiteCharts[idx]) {
                websiteCharts[idx].destroy();
            }
            websiteCharts[idx] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Response Time (ms)',
                        data: data,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.1,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true } }
                }
            });
        }
    };

    function renderIncidents() {
        const tbody = document.getElementById('incidents-tbody');
        if (currentData.incidents.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 32px; color: var(--text-muted);">No incidents in this period</td></tr>`;
            return;
        }
        
        let html = '';
        currentData.incidents.forEach(inc => {
            const badgeClass = inc.status === 'Ongoing' ? 'badge-danger' : 'badge-success';
            const duration = formatDuration(inc.duration_seconds);
            
            const startStr = inc.started_at ? window.TimeUtils.formatLocalTime(inc.started_at) : '--';
            const endStr = inc.resolved_at ? window.TimeUtils.formatLocalTime(inc.resolved_at) : '--';
            
            html += `
                <tr>
                    <td><strong>${escapeHtml(inc.name)}</strong></td>
                    <td><span class="badge ${badgeClass}">${inc.status}</span></td>
                    <td>${startStr}</td>
                    <td>${endStr}</td>
                    <td>${duration}</td>
                    <td>${escapeHtml(inc.cause || 'Unknown Error')}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    function exportToCSV() {
        let csv = 'Website,URL,Status,Uptime %,Avg Response Time (ms)\n';
        const rangeKey = 'uptime_' + timeRangeSelector.value;
        currentData.websites.forEach(ws => {
            const uptime = ws[rangeKey] !== null ? ws[rangeKey].toFixed(2) : '';
            csv += `"${ws.name}","${ws.url}","${ws.status}","${uptime}","${ws.avg_response_time || ''}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', `uptime-export-${timeRangeSelector.value}.csv`);
        a.click();
    }

    // Event Listeners
    timeRangeSelector.addEventListener('change', loadData);
    searchInput.addEventListener('input', renderWebsites);
    statusFilter.addEventListener('change', renderWebsites);
    exportBtn.addEventListener('click', exportToCSV);

    // Initial Load
    loadData();
});
