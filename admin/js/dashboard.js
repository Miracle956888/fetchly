/**
 * Admin Dashboard View Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  await checkAdminSession();
  loadDashboardData();
});

async function loadDashboardData() {
  try {
    const res = await authFetch('/api/admin/leads/stats');
    if (!res.ok) throw new Error('Failed to load stats');

    const data = await res.json();
    if (!data.success) return;

    renderStatCards(data.stats);
    renderCourseBars(data.analytics.byCourse, data.stats.totalLeads);
    renderModeBars(data.analytics.byMode, data.stats.totalLeads);
    renderReferralBars(data.analytics.byReferral, data.stats.totalLeads);
    renderRecentLeads(data.recentLeads);
  } catch (err) {
    console.error('Error loading dashboard data:', err);
  }
}

function renderStatCards(stats) {
  document.getElementById('statTotalLeads').textContent = stats.totalLeads || 0;
  document.getElementById('statNewLeads').textContent = stats.newLeads || 0;
  document.getElementById('statContactedLeads').textContent = stats.contactedLeads || 0;
  document.getElementById('statEnrolledLeads').textContent = stats.enrolledLeads || 0;
  document.getElementById('statTodayLeads').textContent = stats.todayLeads || 0;
  document.getElementById('statWeekLeads').textContent = stats.thisWeekLeads || 0;
}

function renderCourseBars(courses, total) {
  const container = document.getElementById('chartCoursesList');
  if (!container) return;

  if (!courses || courses.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">No lead data yet.</div>';
    return;
  }

  const maxCount = Math.max(...courses.map(c => c.count), 1);

  container.innerHTML = courses.slice(0, 6).map(item => {
    const pct = Math.round((item.count / (total || 1)) * 100);
    const barWidth = Math.round((item.count / maxCount) * 100);
    return `
      <div class="chart-bar-row">
        <div class="chart-bar-label">
          <span>${escapeHtml(item.course)}</span>
          <span>${item.count} leads (${pct}%)</span>
        </div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width: ${barWidth}%;"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderModeBars(modes, total) {
  const container = document.getElementById('chartModesList');
  if (!container) return;

  if (!modes || modes.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">No data yet.</div>';
    return;
  }

  container.innerHTML = modes.map(item => {
    const pct = Math.round((item.count / (total || 1)) * 100);
    return `
      <div class="chart-bar-row">
        <div class="chart-bar-label">
          <span>${escapeHtml(item.learning_mode)}</span>
          <span>${item.count} (${pct}%)</span>
        </div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width: ${pct}%; background: ${item.learning_mode === 'Physical' ? '#f59e0b' : '#3b82f6'};"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderReferralBars(referrals, total) {
  const container = document.getElementById('chartReferralsList');
  if (!container) return;

  if (!referrals || referrals.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">No referral data yet.</div>';
    return;
  }

  container.innerHTML = referrals.slice(0, 4).map(item => {
    const pct = Math.round((item.count / (total || 1)) * 100);
    return `
      <div class="chart-bar-row">
        <div class="chart-bar-label">
          <span>${escapeHtml(item.referral_source)}</span>
          <span>${item.count} (${pct}%)</span>
        </div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width: ${pct}%; background: #10b981;"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderRecentLeads(leads) {
  const tbody = document.getElementById('recentLeadsTableBody');
  if (!tbody) return;

  if (!leads || leads.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          No leads submitted yet.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = leads.map(lead => {
    const statusClass = getStatusClass(lead.status);
    const dateFormatted = formatDisplayDate(lead.created_at);
    return `
      <tr>
        <td style="font-weight: 700; color: var(--text-muted);">#${lead.id}</td>
        <td>
          <div class="table-lead-name">${escapeHtml(lead.full_name)}</div>
        </td>
        <td>${escapeHtml(lead.phone)}</td>
        <td>${escapeHtml(lead.email)}</td>
        <td><strong>${escapeHtml(lead.course)}</strong></td>
        <td>${escapeHtml(lead.learning_mode)}</td>
        <td>
          <span class="status-badge ${statusClass}">
            <span class="status-dot"></span>
            ${escapeHtml(lead.status)}
          </span>
        </td>
        <td style="color: var(--text-muted); white-space: nowrap;">${dateFormatted}</td>
        <td>
          <a href="/admin/leads?viewId=${lead.id}" class="btn-action-icon btn-action-view" title="View Full Lead Details">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

function getStatusClass(status) {
  const map = {
    'New': 'status-new',
    'Contacted': 'status-contacted',
    'Interested': 'status-interested',
    'Enrolled': 'status-enrolled',
    'Not Interested': 'status-not-interested',
    'Follow Up': 'status-follow-up',
    'Closed': 'status-closed'
  };
  return map[status] || 'status-new';
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
