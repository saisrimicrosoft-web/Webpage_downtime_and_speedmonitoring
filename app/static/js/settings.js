document.addEventListener('DOMContentLoaded', () => {

    // Tab Navigation
    const tabs = document.querySelectorAll('.settings-tab');
    const sections = document.querySelectorAll('.settings-section');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all
            tabs.forEach(t => t.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            // Add active to clicked
            tab.classList.add('active');
            document.getElementById(tab.dataset.target).classList.add('active');
        });
    });

    // Load Settings
    loadSettings();

    // Auto-save form inputs
    document.querySelectorAll('.auto-save-form input, .auto-save-form select').forEach(input => {
        if (input.type === 'radio' || input.type === 'checkbox' || input.tagName === 'SELECT') {
            input.addEventListener('change', (e) => {
                if (input.name === 'theme') applyTheme(input.value);
                saveSetting(input.name, input.type === 'checkbox' ? input.checked : input.value);
            });
        } else {
            input.addEventListener('change', (e) => {
                saveSetting(input.name, input.value);
            });
        }
    });

    // Profile Form Save
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById('profile-name').value,
            email: document.getElementById('profile-email').value
        };
        try {
            const res = await fetch('/api/settings/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                showSaveStatus("Profile updated");
                const result = await res.json();
                updateSidebarUser(result.user);
            }
        } catch (err) {
            console.error("Failed to update profile", err);
        }
    });

    // Avatar Upload
    document.getElementById('avatar-upload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const res = await fetch('/api/settings/profile/avatar', {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                const result = await res.json();
                const preview = document.getElementById('settings-avatar-preview');
                preview.style.backgroundImage = `url(${result.avatar_url})`;
                preview.textContent = '';
                
                // Update sidebar/topbar avatars if element exists
                document.querySelectorAll('.sidebar-avatar, .topbar-user-avatar').forEach(el => {
                    el.style.backgroundImage = `url(${result.avatar_url})`;
                    el.style.backgroundSize = 'cover';
                    el.textContent = '';
                });
                
                showSaveStatus("Avatar updated");
            }
        } catch (err) {
            console.error("Failed to upload avatar", err);
        }
    });

    // Password Update
    document.getElementById('password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            current_password: document.getElementById('current-pwd').value,
            new_password: document.getElementById('new-pwd').value
        };
        try {
            const res = await fetch('/api/settings/profile/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                showSaveStatus("Password updated");
                document.getElementById('password-form').reset();
            } else {
                const err = await res.json();
                alert("Error: " + err.error);
            }
        } catch (err) {
            console.error("Failed to update password", err);
        }
    });

    // Test Notifications
    document.querySelectorAll('.test-notify-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const channel = e.target.dataset.channel;
            try {
                const res = await fetch(`/api/settings/notifications/test?channel=${channel}`, { method: 'POST' });
                if (res.ok) {
                    showSaveStatus(`Test sent via ${channel}`);
                } else {
                    const err = await res.json();
                    alert(`Test failed: ${err.error}`);
                }
            } catch (err) {
                console.error("Failed to test notification", err);
            }
        });
    });

    // Purge Data Confirmation Logic
    const confirmInput = document.getElementById('purge-confirm-input');
    const confirmBtn = document.getElementById('purge-confirm-btn');
    confirmInput.addEventListener('input', (e) => {
        confirmBtn.disabled = e.target.value !== 'DELETE';
    });
    
    confirmBtn.addEventListener('click', async () => {
        if (confirmInput.value !== 'DELETE') return;
        
        try {
            const res = await fetch('/api/settings/data/purge', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirm: 'DELETE' })
            });
            if (res.ok) {
                closePurgeModal();
                showSaveStatus("All data purged successfully");
                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (err) {
            console.error("Failed to purge data", err);
        }
    });
});

async function loadSettings() {
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            const data = await res.json();
            
            // Populate profile
            document.getElementById('profile-name').value = data.profile.name || '';
            document.getElementById('profile-email').value = data.profile.email || '';
            if (data.profile.avatar) {
                document.getElementById('settings-avatar-preview').style.backgroundImage = `url(${data.profile.avatar})`;
                document.getElementById('settings-avatar-preview').textContent = '';
            } else if (data.profile.name) {
                const initials = data.profile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                document.getElementById('settings-avatar-preview').textContent = initials;
            }

            // Populate settings
            for (const [key, val] of Object.entries(data.settings)) {
                const input = document.querySelector(`[name="${key}"]`);
                if (!input) continue;
                
                if (input.type === 'checkbox') {
                    input.checked = val === 'true';
                } else if (input.type === 'radio') {
                    const radio = document.querySelector(`[name="${key}"][value="${val}"]`);
                    if (radio) radio.checked = true;
                } else {
                    input.value = val;
                }
            }

            // Apply Theme
            const savedTheme = data.settings.theme || 'auto';
            applyTheme(savedTheme);
        }
    } catch (err) {
        console.error("Failed to load settings", err);
    }
}

async function saveSetting(key, value) {
    try {
        const res = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value })
        });
        if (res.ok) {
            showSaveStatus("Changes saved");
        }
    } catch (err) {
        console.error("Failed to save setting", err);
    }
}

let saveStatusTimeout;
function showSaveStatus(msg = "Changes saved") {
    const el = document.getElementById('save-status');
    el.textContent = msg;
    el.style.opacity = '1';
    
    clearTimeout(saveStatusTimeout);
    saveStatusTimeout = setTimeout(() => {
        el.style.opacity = '0';
    }, 2000);
}

function applyTheme(theme) {
    if (theme === 'auto') {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    } else if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

function updateSidebarUser(user) {
    document.querySelectorAll('.sidebar-user-name, .topbar-user-name').forEach(el => el.textContent = user.name);
    
    if (!user.avatar && user.name) {
        const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        document.querySelectorAll('.sidebar-avatar, .topbar-user-avatar, #settings-avatar-preview').forEach(el => {
            el.style.backgroundImage = 'none';
            el.textContent = initials;
        });
    }
}

// Modal Functions
function openPurgeModal() {
    document.getElementById('purge-confirm-input').value = '';
    document.getElementById('purge-confirm-btn').disabled = true;
    document.getElementById('purge-modal').classList.add('active');
}

function closePurgeModal() {
    document.getElementById('purge-modal').classList.remove('active');
}
