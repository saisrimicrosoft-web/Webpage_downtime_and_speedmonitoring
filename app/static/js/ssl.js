document.addEventListener('DOMContentLoaded', () => {
    const cardsContainer = document.getElementById('ssl-cards-container');
    const searchInput = document.getElementById('ssl-search');
    const filterSelect = document.getElementById('ssl-filter');
    const sortSelect = document.getElementById('ssl-sort');
    const refreshBtn = document.getElementById('btn-force-refresh');

    const drawer = document.getElementById('ssl-drawer');
    const drawerOverlay = document.getElementById('ssl-drawer-overlay');
    const drawerClose = document.getElementById('drawer-close');

    let allCertificates = [];

    // Initialize Trust Shield (SVG)
    const initShield = (valid, warning, danger) => {
        const total = valid + warning + danger || 1;
        const vPerc = (valid / total) * 100;
        const wPerc = (warning / total) * 100;
        const dPerc = (danger / total) * 100;

        let color = '#4ade80';
        if (dPerc > 0) color = '#f87171';
        else if (wPerc > 0) color = '#facc15';
        else if (valid === 0 && total === 1) color = '#6b7280'; // empty

        const svg = `
            <svg viewBox="0 0 100 100" width="100%" height="100%">
                <path d="M50 5 L10 20 L10 50 C10 75 30 90 50 95 C70 90 90 75 90 50 L90 20 Z" 
                      fill="none" stroke="${color}" stroke-width="8" stroke-linejoin="round"/>
                <path d="M50 5 L10 20 L10 50 C10 75 30 90 50 95 C70 90 90 75 90 50 L90 20 Z" 
                      fill="${color}" opacity="0.2"/>
            </svg>
        `;
        document.getElementById('trust-shield-container').innerHTML = svg;
    };

    // Initialize Runway (SVG)
    const initRunway = (certs) => {
        const expiring = certs.filter(c => c.days_left !== null && c.days_left >= 0 && c.days_left <= 90);
        
        let dots = '';
        expiring.forEach(c => {
            const x = (c.days_left / 90) * 100;
            const color = c.days_left < 30 ? '#f87171' : '#facc15';
            dots += `<circle cx="${x}%" cy="50" r="6" fill="${color}" stroke="#18181b" stroke-width="2">
                <title>${c.name} (${c.days_left} days)</title>
            </circle>`;
        });

        const svg = `
            <svg width="100%" height="100%" style="overflow:visible;">
                <line x1="0" y1="50" x2="100%" y2="50" stroke="#333" stroke-width="4" stroke-linecap="round"/>
                <text x="0" y="80" fill="#9ca3af" font-size="12">Today</text>
                <text x="50%" y="80" fill="#9ca3af" font-size="12" text-anchor="middle">45 Days</text>
                <text x="100%" y="80" fill="#9ca3af" font-size="12" text-anchor="end">90 Days</text>
                ${dots}
            </svg>
        `;
        document.getElementById('runway-chart-container').innerHTML = svg;
    };

    const updateOverview = (certs) => {
        let valid = 0, warning = 0, danger = 0;
        certs.forEach(c => {
            if (c.status === 'valid') valid++;
            else if (c.status === 'expiring') warning++;
            else if (c.status === 'expired' || c.status === 'untrusted' || c.status === 'handshake_failed') danger++;
        });

        document.getElementById('stat-valid').textContent = valid;
        document.getElementById('stat-expiring').textContent = warning;
        document.getElementById('stat-invalid').textContent = danger;

        initShield(valid, warning, danger);
        initRunway(certs);
    };

    const createCard = (cert) => {
        const div = document.createElement('div');
        div.className = 'cert-card';
        div.onclick = () => openDrawer(cert);

        let icon = '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>';
        
        let daysHtml = '';
        if (cert.days_left !== null) {
            let colorClass = cert.days_left < 30 ? 'text-danger' : (cert.days_left < 60 ? 'text-warning' : 'text-success');
            daysHtml = `<span class="days-left ${colorClass}">${cert.days_left} days</span>`;
        }

        div.innerHTML = `
            <div class="cert-card-header">
                <div>
                    <div class="cert-domain">${cert.name}</div>
                    <div class="cert-issuer">${cert.issuer || 'Unknown Issuer'}</div>
                </div>
                <div class="cert-status status-${cert.status}">${cert.status.replace('_', ' ')}</div>
            </div>
            <div class="cert-footer">
                ${daysHtml}
                <div class="cert-badges">
                    ${cert.san_match ? '<span class="cert-badge badge-success">SAN ✓</span>' : ''}
                    ${cert.hsts ? '<span class="cert-badge badge-success">HSTS</span>' : ''}
                </div>
            </div>
        `;
        return div;
    };

    const renderCards = () => {
        const query = searchInput.value.toLowerCase();
        const filter = filterSelect.value;
        const sort = sortSelect.value;

        let filtered = allCertificates.filter(c => {
            const matchQuery = c.name.toLowerCase().includes(query) || (c.issuer && c.issuer.toLowerCase().includes(query));
            if (!matchQuery) return false;

            if (filter === 'valid' && c.status !== 'valid') return false;
            if (filter === 'expiring' && c.status !== 'expiring') return false;
            if (filter === 'invalid' && !['expired', 'untrusted', 'handshake_failed', 'no_https'].includes(c.status)) return false;
            
            return true;
        });

        filtered.sort((a, b) => {
            if (sort === 'name-asc') return a.name.localeCompare(b.name);
            
            const aDays = a.days_left !== null ? a.days_left : 9999;
            const bDays = b.days_left !== null ? b.days_left : 9999;
            
            if (sort === 'expiry-asc') return aDays - bDays;
            if (sort === 'expiry-desc') return bDays - aDays;
            return 0;
        });

        cardsContainer.innerHTML = '';
        if (filtered.length === 0) {
            cardsContainer.innerHTML = '<div class="loading-state"><p>No certificates match your criteria.</p></div>';
            return;
        }

        filtered.forEach(c => cardsContainer.appendChild(createCard(c)));
    };

    const openDrawer = (cert) => {
        document.getElementById('drawer-domain').textContent = cert.name;
        document.getElementById('drawer-status-text').textContent = cert.status.replace('_', ' ').toUpperCase();
        
        const banner = document.getElementById('drawer-banner');
        banner.className = `drawer-status-banner status-${cert.status}`;

        document.getElementById('drawer-issuer').textContent = cert.issuer || 'N/A';
        document.getElementById('drawer-valid-from').textContent = cert.valid_from ? window.TimeUtils.formatLocalTime(cert.valid_from) : 'N/A';
        document.getElementById('drawer-valid-to').textContent = cert.valid_to ? window.TimeUtils.formatLocalTime(cert.valid_to) : 'N/A';
        document.getElementById('drawer-days-left').textContent = cert.days_left !== null ? cert.days_left : 'N/A';
        
        document.getElementById('drawer-protocol').textContent = cert.protocol || 'N/A';
        document.getElementById('drawer-cipher').textContent = cert.cipher || 'N/A';
        
        document.getElementById('drawer-san-match').textContent = cert.san_match ? 'Yes' : 'No';
        document.getElementById('drawer-san-match').className = `badge ${cert.san_match ? 'badge-success' : 'badge-danger'}`;
        
        document.getElementById('drawer-hsts').textContent = cert.hsts ? 'Yes' : 'No';
        document.getElementById('drawer-hsts').className = `badge ${cert.hsts ? 'badge-success' : ''}`;

        const errSec = document.getElementById('drawer-error-section');
        if (cert.error_message) {
            errSec.style.display = 'block';
            document.getElementById('drawer-error-msg').textContent = cert.error_message;
        } else {
            errSec.style.display = 'none';
        }

        const chainContainer = document.getElementById('drawer-chain');
        chainContainer.innerHTML = '';
        try {
            const chain = JSON.parse(cert.chain_json || '[]');
            chain.forEach((item, idx) => {
                chainContainer.innerHTML += `
                    <div class="chain-item">
                        <div class="chain-icon">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                        </div>
                        <div class="chain-details">
                            <h4>${item.name}</h4>
                            <p>${item.type === 'leaf' ? 'Server Certificate' : 'Intermediate/Root CA'}</p>
                        </div>
                    </div>
                    ${idx < chain.length - 1 ? '<div style="text-align:center;color:#444;">↓</div>' : ''}
                `;
            });
        } catch (e) {
            chainContainer.innerHTML = '<p>Could not parse chain</p>';
        }

        drawer.classList.add('active');
        drawerOverlay.classList.add('active');
    };

    const closeDrawer = () => {
        drawer.classList.remove('active');
        drawerOverlay.classList.remove('active');
    };

    drawerClose.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);

    // Fetch data
    const loadData = async () => {
        try {
            const res = await fetch('/api/ssl');
            allCertificates = await res.json();
            updateOverview(allCertificates);
            renderCards();
        } catch (e) {
            console.error('Failed to load SSL data', e);
            cardsContainer.innerHTML = '<div class="loading-state"><p class="text-danger">Failed to load data.</p></div>';
        }
    };

    searchInput.addEventListener('input', renderCards);
    filterSelect.addEventListener('change', renderCards);
    sortSelect.addEventListener('change', renderCards);
    
    refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('loading');
        // If there was a /api/ssl/refresh endpoint, we would call it. 
        // For now just reload data.
        loadData().then(() => refreshBtn.classList.remove('loading'));
    });

    // Alerts Modal
    const modal = document.getElementById('alerts-modal');
    const modalOverlay = document.getElementById('alerts-modal-overlay');
    document.getElementById('btn-alerts-modal').addEventListener('click', () => {
        modal.classList.add('active');
        modalOverlay.classList.add('active');
    });
    
    const closeModal = () => {
        modal.classList.remove('active');
        modalOverlay.classList.remove('active');
    };
    document.getElementById('alerts-modal-close').addEventListener('click', closeModal);
    document.getElementById('alerts-modal-cancel').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);
    
    document.getElementById('alerts-modal-save').addEventListener('click', () => {
        // Save logic to settings endpoint would go here
        closeModal();
    });

    loadData();
});
