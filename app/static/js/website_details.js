document.addEventListener('DOMContentLoaded', function() {
    if (typeof checkUrl === 'undefined') return;

    // Fetch check history from the API
    fetch(`/api/checks/${encodeURIComponent(checkUrl)}`)
        .then(response => response.json())
        .then(data => {
            if (data.length === 0) return;

            // Sort ascending by time for the chart
            data.reverse();

            const labels = data.map(c => {
                const date = new Date(c.checked_at);
                return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
            });

            const responseTimes = data.map(c => c.response_ms);

            const pointColors = data.map(c => {
                return c.is_up ? '#10b981' : '#ef4444';
            });

            const ctx = document.getElementById('responseTimeChart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Response Time (ms)',
                        data: responseTimes,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        pointBackgroundColor: pointColors,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            labels: { color: '#f8fafc' }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: '#94a3b8' },
                            grid: { color: 'rgba(255,255,255,0.05)' }
                        },
                        x: {
                            ticks: { color: '#94a3b8' },
                            grid: { color: 'rgba(255,255,255,0.05)' }
                        }
                    }
                }
            });
        })
        .catch(error => console.error('Error fetching chart data:', error));
});
