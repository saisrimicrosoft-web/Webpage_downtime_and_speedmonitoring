/**
 * website_details.js
 * Fetches check history from the API and renders a premium Chart.js graph.
 */
document.addEventListener('DOMContentLoaded', function () {
    if (typeof checkUrl === 'undefined') return;

    const canvas = document.getElementById('responseTimeChart');
    if (!canvas) return;

    // Show a loading skeleton while fetching
    const container = canvas.parentElement;
    container.insertAdjacentHTML('afterbegin', '<p class="chart-loading" style="color:#7a8aaa;font-size:0.88rem;text-align:center;padding-bottom:8px">Loading chart data…</p>');

    fetch(`/api/checks/${encodeURIComponent(checkUrl)}`)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(data => {
            // Remove loading text
            const loadingEl = container.querySelector('.chart-loading');
            if (loadingEl) loadingEl.remove();

            if (!data || data.length === 0) {
                canvas.insertAdjacentHTML('afterend',
                    '<p style="text-align:center;color:#7a8aaa;padding:40px 0;font-size:0.9rem">No check data available yet. Check back after the next monitoring cycle.</p>');
                canvas.remove();
                return;
            }

            // Sort ascending (oldest → newest) for the chart
            const sorted = [...data].reverse();

            const labels = sorted.map(c => {
                const d = new Date(c.checked_at);
                return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
            });

            // Filter out error sentinel values (-1) for display
            const responseTimes = sorted.map(c => c.response_ms >= 0 ? c.response_ms : null);

            // Colour each point by up/down
            const pointColors      = sorted.map(c => c.is_up ? '#22c55e' : '#f43f5e');
            const pointBorderColors = sorted.map(c => c.is_up ? '#16a34a' : '#be123c');

            new Chart(canvas, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Response Time (ms)',
                        data: responseTimes,
                        borderColor: '#4f90ff',
                        borderWidth: 2,
                        backgroundColor: (ctx) => {
                            const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
                            gradient.addColorStop(0, 'rgba(79, 144, 255, 0.25)');
                            gradient.addColorStop(1, 'rgba(79, 144, 255, 0.01)');
                            return gradient;
                        },
                        pointBackgroundColor: pointColors,
                        pointBorderColor: pointBorderColors,
                        pointBorderWidth: 1.5,
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        pointHoverBorderWidth: 2,
                        fill: true,
                        tension: 0.35,
                        spanGaps: false,    // break the line on null (error) values
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 800, easing: 'easeOutQuart' },
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: {
                            labels: {
                                color: '#f0f4ff',
                                font: { family: 'Inter', weight: '600', size: 12 },
                                boxWidth: 12,
                                boxHeight: 12,
                                borderRadius: 3,
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(14,25,50,0.95)',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderWidth: 1,
                            titleColor: '#f0f4ff',
                            bodyColor: '#7a8aaa',
                            titleFont: { family: 'Inter', weight: '700', size: 13 },
                            bodyFont: { family: 'Inter', size: 12 },
                            padding: 14,
                            cornerRadius: 10,
                            callbacks: {
                                label: ctx => {
                                    const val = ctx.parsed.y;
                                    if (val === null) return ' Connection error';
                                    const status = sorted[ctx.dataIndex];
                                    const upStr = status.is_up ? '✓ Online' : '✕ Offline';
                                    return [
                                        ` Response: ${val} ms`,
                                        ` Status: ${upStr} (HTTP ${status.status_code ?? 'N/A'})`
                                    ];
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'ms',
                                color: '#7a8aaa',
                                font: { family: 'Inter', size: 11, weight: '600' }
                            },
                            ticks: {
                                color: '#7a8aaa',
                                font: { family: 'JetBrains Mono', size: 11 },
                                callback: v => `${v}`
                            },
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            border: { color: 'transparent' }
                        },
                        x: {
                            ticks: {
                                color: '#7a8aaa',
                                font: { family: 'JetBrains Mono', size: 11 },
                                maxTicksLimit: 12,
                                maxRotation: 0
                            },
                            grid: { color: 'rgba(255,255,255,0.03)' },
                            border: { color: 'transparent' }
                        }
                    }
                }
            });
        })
        .catch(err => {
            const loadingEl = container.querySelector('.chart-loading');
            if (loadingEl) loadingEl.remove();
            console.error('Chart data fetch failed:', err);
            canvas.insertAdjacentHTML('afterend',
                '<p style="text-align:center;color:#f43f5e;padding:40px 0;font-size:0.88rem">Could not load chart data.</p>');
            canvas.remove();
        });
});
