/**
 * Admin Authentication & Session Management Helper
 */

// Helper to get auth token from storage if present
function getAuthToken() {
  return localStorage.getItem('ict_admin_token') || '';
}

function setAuthToken(token) {
  if (token) {
    localStorage.setItem('ict_admin_token', token);
  } else {
    localStorage.removeItem('ict_admin_token');
  }
}

// Authenticated fetch wrapper
async function authFetch(url, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Include cookies automatically
  options.credentials = 'include';
  options.headers = headers;

  const response = await fetch(url, options);

  // If session expired or unauthorized, redirect to login
  if (response.status === 401 && !window.location.pathname.includes('/admin/login')) {
    setAuthToken(null);
    window.location.href = '/admin/login';
    return response;
  }

  return response;
}

// Verify current session on protected admin pages
async function checkAdminSession() {
  try {
    const res = await authFetch('/api/admin/me');
    if (!res.ok) {
      throw new Error('Unauthorized');
    }
    const data = await res.json();
    if (data.success && data.admin) {
      updateAdminUserUI(data.admin);
      initNewLeadsNotificationPoller();
    } else {
      throw new Error('Invalid admin payload');
    }
  } catch (err) {
    if (!window.location.pathname.includes('/admin/login')) {
      window.location.href = '/admin/login';
    }
  }
}

// Update Admin info in Sidebar
function updateAdminUserUI(admin) {
  const nameEl = document.getElementById('adminUserName');
  const roleEl = document.getElementById('adminUserRole');
  const avatarEl = document.getElementById('adminUserAvatar');

  if (nameEl) nameEl.textContent = admin.full_name || admin.username;
  if (roleEl) roleEl.textContent = admin.role || 'Administrator';
  if (avatarEl) {
    const initials = (admin.full_name || admin.username || 'AD')
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
    avatarEl.textContent = initials;
  }
}

// Logout handler
async function handleLogout() {
  try {
    await authFetch('/api/admin/logout', { method: 'POST' });
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    setAuthToken(null);
    window.location.href = '/admin/login';
  }
}

// Notification Poller for New Leads (Section 16)
let notificationInterval = null;
async function fetchNewLeadsCount() {
  try {
    const res = await authFetch('/api/admin/leads/stats');
    if (!res.ok) return;
    const data = await res.json();
    if (data.success && data.stats) {
      const newCount = data.stats.newLeads || 0;
      updateNewLeadsBadges(newCount);
    }
  } catch (e) {
    // Fail silently in background
  }
}

function updateNewLeadsBadges(count) {
  const badges = document.querySelectorAll('.new-leads-count-badge');
  badges.forEach(badge => {
    badge.textContent = count;
    if (count > 0) {
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  });

  const headerNotice = document.getElementById('headerNewLeadsNotice');
  if (headerNotice) {
    headerNotice.textContent = `New Leads: ${count}`;
    headerNotice.style.display = count > 0 ? 'inline-flex' : 'none';
  }
}

function initNewLeadsNotificationPoller() {
  fetchNewLeadsCount();
  if (!notificationInterval) {
    notificationInterval = setInterval(fetchNewLeadsCount, 30000); // 30s poll
  }
}

// Setup common sidebar navigation toggles
document.addEventListener('DOMContentLoaded', () => {
  const logoutBtns = document.querySelectorAll('.btn-admin-logout');
  logoutBtns.forEach(btn => btn.addEventListener('click', handleLogout));

  const mobileToggle = document.getElementById('adminSidebarToggle');
  const sidebar = document.querySelector('.admin-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    // Close on click outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      }
    });
  }
});
