let currentPage = 1;
const perPage = 10;
let currentFilters = {
    status: 'all',
    severity: 'all',
    type: 'all',
    website_id: 'all',
    from: '',
    to: '',
    q: ''
};
let radarWebsites = [];
let allAlerts = [];

document.addEventListener("DOMContentLoaded", () => {
    // Bind filter buttons
    document.querySelectorAll('.filter-group .btn-g-secondary').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-group .btn-g-secondary').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilters.status = e.target.dataset.status;
            currentPage = 1;
            loadAlerts();
        });
    });

    // Bind dropdowns and search
    ['severity', 'type', 'website', 'from', 'to'].forEach(f => {
        const el = document.getElementById(`filter-${f}`);
        if(el) {
            el.addEventListener('change', (e) => {
                currentFilters[f === 'website' ? 'website_id' : f] = e.target.value;
                currentPage = 1;
                loadAlerts();
            });
        }
    });

    const searchInput = document.getElementById('filter-search');
    let debounceTimer;
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentFilters.q = e.target.value;
                currentPage = 1;
                loadAlerts();
            }, 300);
        });
    }
    
    document.getElementById('btn-simulate')?.addEventListener('click', simulateDowntime);

    // Initial load
    loadAlerts();
    loadSummary();
    loadPulse();
    loadRadar();
    loadChannelsMini();
    
    // Auto-refresh
    setInterval(() => {
        if(currentPage === 1) { 
            loadAlerts();
            loadSummary();
            loadPulse();
            loadRadar();
        }
    }, 30000);

    // Ticking timers
    setInterval(tickTimers, 1000);
});

async function loadAlerts() {
    const params = new URLSearchParams({
        page: currentPage,
        per_page: perPage,
        ...currentFilters
    });
    
    for(const [key, val] of params.entries()) {
        if(!val || val === 'all') params.delete(key);
    }
    
    try {
        const res = await fetch(`/api/alerts?${params.toString()}`);
        const data = await res.json();
        allAlerts = data.alerts;
        renderCards(data.alerts);
        renderTimeline(data.alerts);
    } catch(err) {
        console.error("Failed to load alerts", err);
    }
}

async function loadSummary() {
    try {
        const res = await fetch('/api/alerts/summary');
        const data = await res.json();
        
        document.getElementById('kpi-active').textContent = data.active || 0;
        document.getElementById('kpi-active-sub').textContent = `${data.critical || 0} critical, ${data.warning || 0} warning`;
        document.getElementById('kpi-acked').textContent = data.acknowledged || 0;
        document.getElementById('kpi-resolved').textContent = data.resolved_today || 0;
        document.getElementById('kpi-mttr').textContent = data.avg_mttr_minutes ? `${Math.round(data.avg_mttr_minutes)}m` : '--';
        
        // Hero down stat
        const downCountStr = (data.sites_down || 0).toString().padStart(2, '0');
        document.getElementById('hero-down-count').textContent = downCountStr;
        if(data.sites_down > 0) {
            document.getElementById('hero-text-summary').textContent = `${data.sites_down} site(s) offline. ${data.sites_total - data.sites_down} healthy.`;
            document.getElementById('btn-ack-all').style.display = 'inline-block';
        } else {
            document.getElementById('hero-text-summary').textContent = `All ${data.sites_total} systems nominal.`;
            document.getElementById('btn-ack-all').style.display = 'none';
        }
        
    } catch(err) { console.error(err); }
}

async function loadPulse() {
    try {
        const res = await fetch('/api/alerts/pulse?hours=18');
        const data = await res.json();
        const container = document.getElementById('pulse-container');
        container.innerHTML = '';
        
        const maxVal = Math.max(...data.buckets, 1); // Avoid div by zero
        
        data.buckets.forEach((val, i) => {
            const h = (val / maxVal) * 100;
            const bar = document.createElement('div');
            bar.className = 'pulse-bar' + (val > 0 ? ' has-downtime' : '');
            bar.style.height = Math.max(h, 2) + '%';
            bar.title = `Bucket ${i+1}: ${val} failed checks`;
            container.appendChild(bar);
        });
    } catch(err) {}
}

// Pseudo-random hash to scatter dots predictably
function hashCode(str) {
    let hash = 0;
    for(let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; 
    }
    return hash;
}

async function loadRadar() {
    try {
        const res = await fetch('/api/radar');
        radarWebsites = await res.json();
        
        const g = document.getElementById('radar-dots');
        g.innerHTML = '';
        
        radarWebsites.forEach(w => {
            // angle and radius
            const hash = Math.abs(hashCode(w.id));
            const angle = (hash % 360) * (Math.PI / 180);
            const radius = 10 + (hash % 35); // 10 to 45
            
            const cx = 50 + radius * Math.cos(angle);
            const cy = 50 + radius * Math.sin(angle);
            
            let color = 'var(--ok)'; // up
            if(w.status === 'down') color = 'var(--hot)';
            else if(w.status === 'degraded') color = 'var(--amber)';
            
            if(w.status === 'down') {
                const pulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                pulse.setAttribute("cx", cx);
                pulse.setAttribute("cy", cy);
                pulse.setAttribute("r", 5);
                pulse.setAttribute("fill", color);
                pulse.classList.add("radar-pulse");
                g.appendChild(pulse);
            }
            
            const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            dot.setAttribute("cx", cx);
            dot.setAttribute("cy", cy);
            dot.setAttribute("r", 2);
            dot.setAttribute("fill", color);
            g.appendChild(dot);
        });
    } catch(err) {}
}

function renderCards(alerts) {
    const grid = document.getElementById('alerts-grid');
    grid.innerHTML = '';
    
    if(alerts.length === 0) {
        document.getElementById('empty-state').style.display = 'block';
        grid.style.display = 'none';
        return;
    }
    
    document.getElementById('empty-state').style.display = 'none';
    grid.style.display = 'grid';

    alerts.forEach(alert => {
        const isCritical = alert.severity === 'critical';
        const isWarning = alert.severity === 'warning';
        
        let cardClass = 'g-card alert-card';
        if(alert.status === 'active' && isCritical) cardClass += ' alert-card-critical';
        else if(alert.status === 'active' && isWarning) cardClass += ' alert-card-warning';
        else if(alert.status === 'resolved') cardClass += ' alert-card-resolved';
        
        let statusChip = 'chip-violet';
        if(alert.status === 'active') statusChip = isCritical ? 'chip-hot' : 'chip-amber';
        else if(alert.status === 'resolved') statusChip = 'chip-ok';

        const el = document.createElement('div');
        el.className = cardClass;
        
        el.innerHTML = `
            <div class="alert-card-header">
                <div style="display:flex; gap:8px;">
                    <div class="chip ${isCritical?'chip-hot':'chip-amber'}">${alert.severity}</div>
                    <div class="chip ${statusChip}">${alert.status}</div>
                </div>
                <div class="timer-font" data-start="${alert.started_at}" data-resolved="${alert.resolved_at || ''}" style="font-size:14px; font-weight:700; color:var(--text);">
                    00:00
                </div>
            </div>
            
            <div class="alert-card-body">
                <div style="font-weight:700; font-size:16px; margin-bottom:4px; word-break:break-all;">${alert.website_id}</div>
                <div style="color:var(--muted); font-size:13px; line-height:1.4;">${alert.title}: ${alert.message}</div>
            </div>
            
            <div class="alert-card-stats">
                <div class="mini-stat">
                    <div class="mini-stat-label">Started</div>
                    <div class="mini-stat-val" style="font-size:12px;">${new Date(alert.started_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                </div>
                <div class="mini-stat">
                    <div class="mini-stat-label">HTTP</div>
                    <div class="mini-stat-val">${alert.http_code || '---'}</div>
                </div>
                <div class="mini-stat">
                    <div class="mini-stat-label">Speed</div>
                    <div class="mini-stat-val">${alert.response_time_ms ? alert.response_time_ms+'ms' : '---'}</div>
                </div>
            </div>
            
            <div class="alert-card-actions">
                ${alert.status === 'active' ? `<button class="btn-g-primary" style="flex:1;" onclick="ackAlert(${alert.id})">Acknowledge</button>` : ''}
                ${(alert.status === 'active' || alert.status === 'acknowledged') ? `<button class="btn-g-secondary" style="flex:1;" onclick="resolveAlert(${alert.id})">Mark Resolved</button>` : ''}
                <button class="btn-g-secondary" onclick="viewAlert(${alert.id})" title="Details">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14m7-7H5"/></svg>
                </button>
            </div>
        `;
        grid.appendChild(el);
    });
    
    tickTimers();
}

function tickTimers() {
    document.querySelectorAll('.timer-font').forEach(el => {
        const start = new Date(el.dataset.start);
        const end = el.dataset.resolved ? new Date(el.dataset.resolved) : new Date();
        const diffMs = end - start;
        const diffSec = Math.floor(diffMs / 1000);
        
        const m = Math.floor(diffSec / 60);
        const s = diffSec % 60;
        
        if(m < 60) {
            el.textContent = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        } else {
            const h = Math.floor(m / 60);
            const rm = m % 60;
            el.textContent = `${h}h ${rm}m`;
        }
    });
}

function renderTimeline(alerts) {
    const tl = document.getElementById('timeline-container');
    tl.innerHTML = '';
    
    // Extract recent events from alerts
    let events = [];
    alerts.forEach(a => {
        events.push({ time: a.started_at, type: 'started', alert: a });
        if(a.acknowledged_at) events.push({ time: a.acknowledged_at, type: 'acked', alert: a });
        if(a.resolved_at) events.push({ time: a.resolved_at, type: 'resolved', alert: a });
    });
    
    events.sort((a,b) => new Date(b.time) - new Date(a.time));
    events = events.slice(0, 15); // latest 15
    
    events.forEach(ev => {
        let color = 'var(--muted)';
        let text = '';
        if(ev.type === 'started') { color = ev.alert.severity==='critical'?'var(--hot)':'var(--amber)'; text = `Alert triggered on ${ev.alert.website_id}`; }
        if(ev.type === 'acked') { color = 'var(--violet)'; text = `Alert acknowledged on ${ev.alert.website_id}`; }
        if(ev.type === 'resolved') { color = 'var(--ok)'; text = `Alert resolved on ${ev.alert.website_id}`; }
        
        tl.innerHTML += `
            <div style="display:flex; gap:12px; margin-bottom:16px;">
                <div style="margin-top:4px;">
                    <div style="width:10px; height:10px; border-radius:50%; background:${color}; box-shadow:0 0 8px ${color};"></div>
                </div>
                <div>
                    <div style="font-size:13px; color:var(--text);">${text}</div>
                    <div style="font-size:11px; color:var(--muted); font-family:'JetBrains Mono',monospace;">${new Date(ev.time).toLocaleTimeString()}</div>
                </div>
            </div>
        `;
    });
}

// Inline Actions
async function ackAlert(id) { await fetch(`/api/alerts/${id}/acknowledge`, {method: 'POST'}); reloadAll(); }
async function resolveAlert(id) { await fetch(`/api/alerts/${id}/resolve`, {method: 'POST'}); reloadAll(); }
async function deleteAlert(id) { await fetch(`/api/alerts/${id}`, {method: 'DELETE'}); reloadAll(); closeDrawer(); }
async function ackAllActive() {
    const activeAlerts = allAlerts.filter(a => a.status === 'active').map(a => a.id);
    if(activeAlerts.length) {
        await fetch('/api/alerts/bulk', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ ids: activeAlerts, action: 'acknowledge' })
        });
        reloadAll();
    }
}

function reloadAll() {
    loadAlerts();
    loadSummary();
    loadRadar();
    if(typeof pollAlertsCount === 'function') pollAlertsCount();
}

function setFilter(key, val) {
    currentFilters[key] = val;
    currentPage = 1;
    loadAlerts();
}

function resetFilters() {
    currentFilters = {status:'all', severity:'all', type:'all', website_id:'all', from:'', to:'', q:''};
    document.getElementById('filter-severity').value = 'all';
    document.getElementById('filter-search').value = '';
    document.querySelectorAll('.filter-group .btn-g-secondary').forEach(b => {
        b.classList.toggle('active', b.dataset.status === 'all');
    });
    currentPage = 1;
    loadAlerts();
}

// Drawer
async function viewAlert(id) {
    document.getElementById('overlay').style.display = 'block';
    const drawer = document.getElementById('alert-drawer');
    drawer.style.right = '0';
    
    const content = document.getElementById('drawer-content');
    content.innerHTML = '<div style="color:var(--muted);">Loading...</div>';
    
    try {
        const res = await fetch(`/api/alerts/${id}`);
        const data = await res.json();
        
        let logsHtml = (data.notification_logs || []).map(l => `
            <div style="padding:12px 0; border-bottom:1px solid rgba(255,255,255,.1); font-size:13px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <strong style="text-transform:uppercase;">${l.channel_type}</strong>
                    <span style="color:var(--muted);">${new Date(l.sent_at).toLocaleTimeString()}</span>
                </div>
                <div style="color:var(--text);">${l.target}</div>
                <div style="color:${l.status === 'simulated' ? 'var(--amber)' : (l.status==='sent'?'var(--ok)':'var(--hot)')}">${l.status.toUpperCase()}</div>
                ${l.error_message ? `<div style="color:var(--hot); margin-top:4px; font-family:monospace; background:rgba(255,61,127,.1); padding:4px;">${l.error_message}</div>` : ''}
            </div>
        `).join('') || '<p style="color:var(--muted); font-size:13px;">No notifications sent.</p>';

        content.innerHTML = `
            <div style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 16px 0; font-size: 20px; font-weight:700;">${data.title}</h4>
                <div style="display:flex; gap:8px; margin-bottom: 24px; flex-wrap:wrap;">
                    <span class="chip chip-violet">${data.website_id}</span>
                    <span class="chip ${data.severity==='critical'?'chip-hot':'chip-amber'}">${data.severity}</span>
                    <span class="chip ${data.status==='resolved'?'chip-ok':'chip-violet'}">${data.status}</span>
                </div>
                
                <div style="background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); padding:16px; border-radius:12px; margin-bottom:24px;">
                    <div style="margin-bottom:12px;">
                        <div style="font-size:11px; color:var(--muted); text-transform:uppercase; margin-bottom:4px;">Message</div>
                        <div style="font-size:14px; color:var(--text);">${data.message}</div>
                    </div>
                    <div style="display:flex; gap:24px;">
                        <div>
                            <div style="font-size:11px; color:var(--muted); text-transform:uppercase; margin-bottom:4px;">Started</div>
                            <div style="font-size:14px; font-family:monospace;">${new Date(data.started_at).toLocaleString()}</div>
                        </div>
                        ${data.resolved_at ? `
                        <div>
                            <div style="font-size:11px; color:var(--muted); text-transform:uppercase; margin-bottom:4px;">Resolved</div>
                            <div style="font-size:14px; font-family:monospace;">${new Date(data.resolved_at).toLocaleString()}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <h5 style="margin:0 0 12px 0; font-size:14px; color:var(--muted); text-transform:uppercase;">Notification Delivery Log</h5>
                <div style="background:rgba(0,0,0,.2); border:1px solid rgba(255,255,255,.1); border-radius:12px; padding:0 16px;">
                    ${logsHtml}
                </div>
                
                <div style="margin-top:32px; display:flex; flex-direction:column; gap:12px;">
                    ${data.status === 'active' ? `<button class="btn-g-primary" style="width:100%; justify-content:center;" onclick="ackAlert(${data.id}); closeDrawer();">Acknowledge Alert</button>` : ''}
                    ${data.status !== 'resolved' ? `<button class="btn-g-secondary" style="width:100%; justify-content:center;" onclick="resolveAlert(${data.id}); closeDrawer();">Mark as Resolved</button>` : ''}
                    <button class="btn-g-secondary" style="width:100%; justify-content:center; color:var(--hot); border-color:rgba(255,61,127,.3);" onclick="deleteAlert(${data.id})">Delete Alert</button>
                </div>
            </div>
        `;
    } catch(err) {
        content.innerHTML = '<p style="color:var(--hot)">Failed to load details.</p>';
    }
}

function closeDrawer() {
    document.getElementById('alert-drawer').style.right = '-500px';
    if(document.getElementById('rules-modal').style.display === 'none' && document.getElementById('channels-modal').style.display === 'none'){
        document.getElementById('overlay').style.display = 'none';
    }
}

function closeAllOverlays() {
    closeDrawer();
    document.getElementById('rules-modal').style.display = 'none';
    document.getElementById('channels-modal').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}

// Rules Modal
async function openRulesModal() {
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('rules-modal').style.display = 'block';
    try {
        const res = await fetch('/api/alerts/rules');
        const rules = await res.json();
        if(rules.length > 0) {
            document.getElementById('rule-failures').value = rules[0].consecutive_failures_threshold;
            document.getElementById('rule-slow').value = rules[0].slow_response_threshold_ms;
            document.getElementById('rule-ssl').value = rules[0].ssl_expiry_warning_days;
        }
    } catch(err) {}
}

async function saveRules(e) {
    e.preventDefault();
    const payload = {
        consecutive_failures_threshold: parseInt(document.getElementById('rule-failures').value),
        slow_response_threshold_ms: parseInt(document.getElementById('rule-slow').value),
        ssl_expiry_warning_days: parseInt(document.getElementById('rule-ssl').value)
    };
    try {
        await fetch('/api/alerts/rules', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        closeAllOverlays();
    } catch(err) { alert("Failed to save"); }
}

// Channels Modal
async function openChannelsModal() {
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('channels-modal').style.display = 'flex';
    loadChannelsMini();
}

async function loadChannelsMini() {
    try {
        const res = await fetch('/api/alerts/channels');
        const channels = await res.json();
        
        // Populate modal table
        const tbody = document.getElementById('channels-tbody');
        if (tbody) {
            tbody.innerHTML = '';
            channels.forEach(ch => {
                tbody.innerHTML += `
                    <tr style="border-bottom:1px solid rgba(255,255,255,.05);">
                        <td style="padding:12px 8px; text-transform:capitalize;">${ch.channel_type}</td>
                        <td style="padding:12px 8px;">${ch.target}</td>
                        <td style="padding:12px 8px;"><div class="chip ${ch.is_active?'chip-ok':'chip-violet'}">${ch.is_active ? 'ON' : 'MUTED'}</div></td>
                        <td style="padding:12px 8px;">
                            <button class="btn-g-secondary" style="min-height:28px; padding:0 8px; font-size:12px;" onclick="testChannel(${ch.id})">Test</button>
                        </td>
                    </tr>
                `;
            });
        }
        
        // Populate mini container on dashboard
        const mini = document.getElementById('channels-mini-container');
        if(mini) {
            mini.innerHTML = channels.map(ch => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid rgba(255,255,255,.1);">
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <span style="font-weight:600; text-transform:capitalize; font-size:14px;">${ch.channel_type}</span>
                        <span style="color:var(--muted); font-size:12px;">${ch.target}</span>
                    </div>
                    <div class="chip ${ch.is_active?'chip-ok':'chip-violet'}">${ch.is_active?'ON':'MUTED'}</div>
                </div>
            `).join('') || '<div style="color:var(--muted); font-size:13px; margin-top:12px;">No channels configured.</div>';
        }
    } catch(err) {}
}

async function addChannel(e) {
    e.preventDefault();
    const payload = {
        channel_type: document.getElementById('new-channel-type').value,
        target: document.getElementById('new-channel-target').value,
        is_active: true
    };
    try {
        await fetch('/api/alerts/channels', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        document.getElementById('channel-form').reset();
        loadChannelsMini();
    } catch(err) { alert("Failed to add channel"); }
}

async function testChannel(id) {
    try {
        const res = await fetch(`/api/alerts/channels/${id}/test`, {method: 'POST'});
        const data = await res.json();
        alert(`Test result: ${data.message || 'Sent'}`);
    } catch(err) {}
}

// Export CSV
function exportCSV() {
    const params = new URLSearchParams(currentFilters);
    params.set('format', 'csv');
    window.location.href = `/api/alerts/export?${params.toString()}`;
}

// Simulate Downtime
async function simulateDowntime() {
    try {
        const res = await fetch('/api/alerts/simulate', { method: 'POST' });
        if(res.ok) {
            reloadAll();
            
            // Native browser notification if permitted
            if (Notification.permission === "granted") {
                new Notification("Nexora Alert", { body: "Simulated downtime occurred!" });
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(perm => {
                    if (perm === "granted") new Notification("Nexora Alert", { body: "Simulated downtime occurred!" });
                });
            }
        }
    } catch(err) { alert("Failed to simulate downtime"); }
}
