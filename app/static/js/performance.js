document.addEventListener('DOMContentLoaded', () => {
    let currentRange = '7d';
    const tooltip = document.getElementById('tooltip');
    
    // UI Elements
    const elements = {
        gaugeScore: document.getElementById('gauge-score'),
        gaugeLabel: document.getElementById('gauge-label'),
        gaugeFootnote: document.getElementById('gauge-footnote'),
        gaugeContainer: document.getElementById('speed-gauge-container'),
        terrainContainer: document.getElementById('terrain-container'),
        tileAvg: document.getElementById('tile-avg-ms'),
        tileAvgTrend: document.getElementById('tile-avg-trend'),
        tileFastestName: document.getElementById('tile-fastest-name'),
        tileFastestMs: document.getElementById('tile-fastest-ms'),
        tileSlowestName: document.getElementById('tile-slowest-name'),
        tileSlowestMs: document.getElementById('tile-slowest-ms'),
        tileSlowPct: document.getElementById('tile-slow-pct'),
        tileP95: document.getElementById('tile-p95-ms'),
        lanesContainer: document.getElementById('lanes-container'),
        heatmapContainer: document.getElementById('heatmap-container'),
        insightsContainer: document.getElementById('insights-container')
    };

    // Range Selection
    document.querySelectorAll('.time-range-segmented .segment').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.time-range-segmented .segment').forEach(b => b.setAttribute('aria-checked', 'false'));
            e.target.setAttribute('aria-checked', 'true');
            currentRange = e.target.dataset.range;
            loadAllData();
        });
    });

    function showTooltip(e, content) {
        tooltip.innerHTML = content;
        tooltip.style.display = 'block';
        tooltip.style.left = (e.pageX + 10) + 'px';
        tooltip.style.top = (e.pageY + 10) + 'px';
    }
    
    function hideTooltip() {
        tooltip.style.display = 'none';
    }

    async function fetchApi(endpoint) {
        try {
            const res = await fetch(`/api/performance/${endpoint}?time_range=${currentRange}`);
            if (!res.ok) throw new Error('API Error');
            return await res.json();
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    function getColorForMs(ms) {
        if (ms === null || ms === undefined) return '#a9a5d0'; // offline/none
        if (ms < 500) return 'var(--perf-cyan)';
        if (ms < 1500) return 'var(--perf-ok)';
        if (ms < 3000) return 'var(--perf-amber)';
        return 'var(--perf-hot)';
    }

    function getLevelForMs(ms) {
        if (ms === null) return 'offline';
        if (ms < 500) return 'lvl-0';
        if (ms < 1500) return 'lvl-1';
        if (ms < 3000) return 'lvl-2';
        return 'lvl-3';
    }

    async function loadAllData() {
        const [summary, terrain, lanes, heatmap, insights] = await Promise.all([
            fetchApi('summary'),
            fetchApi('terrain'),
            fetchApi('lanes'),
            fetchApi('heatmap'),
            fetchApi('insights')
        ]);

        if (summary) renderSummary(summary);
        if (terrain) renderTerrain(terrain);
        if (lanes) renderLanes(lanes);
        if (heatmap) renderHeatmap(heatmap);
        if (insights) renderInsights(insights);
    }

    function renderSummary(data) {
        // Tiles
        elements.tileAvg.textContent = Math.round(data.avg_response_time) || '--';
        
        const fastest = data.fastest_site;
        elements.tileFastestName.textContent = fastest ? fastest.name : '--';
        elements.tileFastestMs.textContent = fastest ? Math.round(fastest.avg_time) : '--';
        
        const slowest = data.slowest_site;
        elements.tileSlowestName.textContent = slowest ? slowest.name : '--';
        elements.tileSlowestMs.textContent = slowest ? Math.round(slowest.avg_time) : '--';

        elements.tileSlowPct.textContent = data.slow_checks_percent.toFixed(1);
        elements.tileP95.textContent = Math.round(data.p95_response_time) || '--';

        // Score Gauge
        const score = data.overall_score;
        elements.gaugeScore.textContent = score;
        
        let label = 'Needs Work', color = 'var(--perf-hot)';
        if (score >= 90) { label = 'Excellent'; color = 'var(--perf-cyan)'; }
        else if (score >= 70) { label = 'Good'; color = 'var(--perf-ok)'; }
        else if (score >= 50) { label = 'Fair'; color = 'var(--perf-amber)'; }

        elements.gaugeLabel.textContent = label;
        elements.gaugeLabel.style.color = color;
        elements.gaugeFootnote.textContent = `Measuring ${data.total_checks} checks`;

        // Draw Gauge SVG
        const svg = `
            <svg class="gauge-svg" viewBox="0 0 200 200" fill="none">
                <path d="M 20 180 A 80 80 0 0 1 180 180" stroke="rgba(255,255,255,0.1)" stroke-width="15" stroke-linecap="round"/>
                <path d="M 20 180 A 80 80 0 0 1 180 180" stroke="${color}" stroke-width="15" stroke-linecap="round" stroke-dasharray="251.2" stroke-dashoffset="${251.2 - (251.2 * score / 100)}"/>
            </svg>
        `;
        // Keep the score and label elements
        const currentScore = elements.gaugeScore.outerHTML;
        const currentLabel = elements.gaugeLabel.outerHTML;
        elements.gaugeContainer.innerHTML = svg + currentScore + currentLabel;
        
        // Reattach elements to avoid losing references
        elements.gaugeScore = elements.gaugeContainer.querySelector('#gauge-score');
        elements.gaugeLabel = elements.gaugeContainer.querySelector('#gauge-label');
    }

    function renderTerrain(data) {
        if (!data || !data.series || data.series.length === 0) {
            elements.terrainContainer.innerHTML = '<div style="color:var(--perf-muted);text-align:center;padding-top:40px">No data</div>';
            return;
        }

        const width = elements.terrainContainer.clientWidth || 400;
        const height = elements.terrainContainer.clientHeight || 150;
        
        let svg = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">`;
        
        const series = data.series;
        series.forEach((s, i) => {
            const dataPoints = s.data;
            if (dataPoints.length === 0) return;
            
            const maxVal = Math.max(...series.flatMap(x => x.data.map(d => d.avg_ms || 0)), 3000);
            const pts = dataPoints.map((d, j) => {
                const x = (j / Math.max(1, dataPoints.length - 1)) * width;
                const y = height - ((d.avg_ms || 0) / maxVal) * height * 0.8;
                return `${x},${y}`;
            });
            
            const pathData = `M 0,${height} L ${pts.join(' L ')} L ${width},${height} Z`;
            const opacity = 1 - (i * 0.15); // Layering effect
            
            svg += `
                <path d="${pathData}" fill="rgba(139, 92, 246, ${0.1 * opacity})" stroke="rgba(34, 228, 255, ${0.5 * opacity})" stroke-width="2"/>
            `;
        });
        
        svg += `</svg>`;
        elements.terrainContainer.innerHTML = svg;
    }

    function renderLanes(data) {
        elements.lanesContainer.innerHTML = '';
        
        if (!data || data.length === 0) {
            elements.lanesContainer.innerHTML = '<div style="color:var(--perf-muted)">No sites monitored</div>';
            return;
        }

        const maxMs = Math.max(...data.map(s => s.avg_time || 0), 2000);

        data.forEach(site => {
            const ms = site.avg_time;
            const isOffline = ms === null;
            const msStr = isOffline ? 'OFFLINE' : `${Math.round(ms)}ms`;
            const color = getColorForMs(ms);
            
            const pct = isOffline ? 0 : Math.min(100, (ms / Math.max(maxMs, 3000)) * 100);

            const lane = document.createElement('div');
            lane.className = `lane ${isOffline ? 'offline' : ''}`;
            lane.innerHTML = `
                <div class="lane-name">${site.name}</div>
                <div class="lane-track">
                    <div class="lane-marker" style="left: ${pct}%; color: ${color}"></div>
                </div>
                <div class="lane-value" style="color: ${color}">${msStr}</div>
            `;
            
            lane.addEventListener('click', () => openDrawer(site.url));
            elements.lanesContainer.appendChild(lane);
        });
    }

    function renderHeatmap(data) {
        elements.heatmapContainer.innerHTML = '';
        
        if (!data || !data.sites || data.sites.length === 0) {
            elements.heatmapContainer.innerHTML = '<div style="color:var(--perf-muted)">No data</div>';
            return;
        }

        const cols = data.time_buckets.length;
        elements.heatmapContainer.style.gridTemplateColumns = `auto repeat(${cols}, 1fr)`;

        // Header row
        elements.heatmapContainer.insertAdjacentHTML('beforeend', `<div class="heatmap-cell" style="background:transparent"></div>`);
        data.time_buckets.forEach(b => {
            elements.heatmapContainer.insertAdjacentHTML('beforeend', `<div style="font-size:10px;color:var(--perf-muted);text-align:center;overflow:hidden">${b.split('T')[1].substring(0,5)}</div>`);
        });

        // Data rows
        data.sites.forEach(site => {
            elements.heatmapContainer.insertAdjacentHTML('beforeend', `<div style="font-size:12px;font-weight:600;padding-right:8px">${site.name}</div>`);
            
            site.buckets.forEach((ms, i) => {
                const cell = document.createElement('div');
                cell.className = `heatmap-cell ${getLevelForMs(ms)}`;
                cell.addEventListener('mouseenter', (e) => showTooltip(e, `${site.name}<br>${data.time_buckets[i]}<br>${ms === null ? 'Offline' : Math.round(ms) + 'ms'}`));
                cell.addEventListener('mouseleave', hideTooltip);
                cell.addEventListener('click', () => openDrawer(site.url));
                elements.heatmapContainer.appendChild(cell);
            });
        });
    }

    function renderInsights(data) {
        elements.insightsContainer.innerHTML = '';
        if (!data || data.length === 0) {
             elements.insightsContainer.innerHTML = '<div style="color:var(--perf-muted)">No specific insights found.</div>';
             return;
        }
        
        data.forEach(ins => {
            let color = 'var(--perf-muted)';
            if (ins.type === 'bottleneck') color = 'var(--perf-hot)';
            else if (ins.type === 'improvement') color = 'var(--perf-cyan)';
            else if (ins.type === 'stable') color = 'var(--perf-ok)';
            
            const card = document.createElement('div');
            card.className = 'insight-card';
            card.innerHTML = `
                <div style="color:${color};font-weight:700;margin-bottom:8px;text-transform:uppercase;font-size:12px;">${ins.type}</div>
                <div>${ins.message}</div>
            `;
            elements.insightsContainer.appendChild(card);
        });
    }

    // Drawer Logic
    let drawerChart = null;
    const overlay = document.getElementById('perf-drawer-overlay');
    const closeBtn = document.getElementById('drawer-close');
    
    closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', (e) => {
        if(e.target === overlay) closeDrawer();
    });

    async function openDrawer(url) {
        overlay.setAttribute('aria-hidden', 'false');
        document.getElementById('drawer-title').textContent = 'Loading...';
        
        try {
            const data = await fetchApi(`site/${encodeURIComponent(url)}`);
            if (!data) throw new Error("No data");
            
            document.getElementById('drawer-title').textContent = data.site.name;
            document.getElementById('drawer-min').textContent = Math.round(data.stats.min_ms) + 'ms';
            document.getElementById('drawer-avg').textContent = Math.round(data.stats.avg_ms) + 'ms';
            document.getElementById('drawer-p95').textContent = Math.round(data.stats.p95_ms) + 'ms';
            document.getElementById('drawer-max').textContent = Math.round(data.stats.max_ms) + 'ms';
            
            // Render Chart
            const ctx = document.getElementById('drawer-chart').getContext('2d');
            if (drawerChart) drawerChart.destroy();
            
            drawerChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.history.map(h => {
                        const localTime = window.TimeUtils.formatLocalTime(h.timestamp);
                        return localTime.split(', ')[1] || localTime;
                    }),
                    datasets: [{
                        label: 'Response Time (ms)',
                        data: data.history.map(h => h.ms),
                        borderColor: '#22e4ff',
                        backgroundColor: 'rgba(34, 228, 255, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { display: false }
                    }
                }
            });

            // Recent checks
            const list = document.getElementById('recent-checks-list');
            list.innerHTML = '';
            data.history.slice(0, 5).forEach(h => {
                list.insertAdjacentHTML('beforeend', `
                    <div class="recent-check-item">
                        <span class="rc-time">${window.TimeUtils.formatLocalTime(h.timestamp)}</span>
                        <span class="rc-status" style="color:${h.is_up ? 'var(--perf-ok)' : 'var(--perf-hot)'}">${h.is_up ? 'OK' : 'DOWN'}</span>
                        <span class="rc-ms">${h.ms !== null ? Math.round(h.ms) + 'ms' : '--'}</span>
                    </div>
                `);
            });

        } catch(err) {
            document.getElementById('drawer-title').textContent = 'Error loading data';
        }
    }

    function closeDrawer() {
        overlay.setAttribute('aria-hidden', 'true');
    }

    document.getElementById('perf-export-btn').addEventListener('click', () => {
        window.location.href = `/api/performance/export?time_range=${currentRange}`;
    });

    // Initial Load
    loadAllData();
});
