/**
 * Shared time utilities for Nexora Monitor
 * Ensures UTC ISO strings are parsed and displayed in the user's local timezone.
 */

window.TimeUtils = {
    /**
     * Parses an ISO string (assumes UTC if naive by appending 'Z')
     * and formats it to a local string, e.g. "09 Oct 2026, 13:26:12"
     */
    formatLocalTime: function(isoString) {
        if (!isoString) return 'N/A';
        
        let safeIso = isoString;
        if (!safeIso.endsWith('Z') && !safeIso.includes('+')) {
            safeIso += 'Z';
        }

        const date = new Date(safeIso);
        if (isNaN(date.getTime())) return isoString;

        // Formats to "09 Oct 2026, 13:26:12"
        return date.toLocaleString(undefined, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    },

    /**
     * Returns a relative time string (e.g. "2 mins ago")
     */
    formatRelativeTime: function(isoString) {
        if (!isoString) return '';
        
        let safeIso = isoString;
        if (!safeIso.endsWith('Z') && !safeIso.includes('+')) {
            safeIso += 'Z';
        }

        const date = new Date(safeIso);
        if (isNaN(date.getTime())) return '';

        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 30) return 'Just now';
        if (diffInSeconds < 60) return diffInSeconds + 's ago';
        
        const mins = Math.floor(diffInSeconds / 60);
        if (mins < 60) return mins + ' min' + (mins !== 1 ? 's' : '') + ' ago';
        
        const hours = Math.floor(mins / 60);
        if (hours < 24) return hours + ' hr' + (hours !== 1 ? 's' : '') + ' ago';
        
        const days = Math.floor(hours / 24);
        return days + ' day' + (days !== 1 ? 's' : '') + ' ago';
    },
    
    /**
     * Apply relative time to all elements with class 'time-relative'
     * expecting data-time attribute with iso string.
     */
    updateRelativeTimes: function() {
        document.querySelectorAll('.time-relative').forEach(el => {
            const iso = el.getAttribute('data-time');
            if (iso) {
                el.textContent = this.formatRelativeTime(iso);
            }
        });
    },
    
    /**
     * Apply local time to all elements with class 'time-local'
     * expecting data-time attribute with iso string.
     */
    updateLocalTimes: function() {
        document.querySelectorAll('.time-local').forEach(el => {
            const iso = el.getAttribute('data-time');
            if (iso) {
                el.textContent = this.formatLocalTime(iso);
            }
        });
    }
};

// Auto update relative times every 30 seconds
setInterval(() => {
    window.TimeUtils.updateRelativeTimes();
}, 30000);

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    window.TimeUtils.updateRelativeTimes();
    window.TimeUtils.updateLocalTimes();
});
