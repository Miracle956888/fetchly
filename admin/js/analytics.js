/**
 * Admin Reports & Analytics View Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  await checkAdminSession();
  loadAnalyticsReport();
});

async function loadAnalyticsReport() {
  try {
    const res = await authFetch('/api/admin/leads/stats');
    if (!res.ok) throw new Error('Failed to load stats');

    const data = await res.json();
    if (!data.success) return;

    const totalLeads = data.stats.totalLeads || 1;

    renderCourseAnalytics(data.analytics.byCourse, totalLeads);
    renderStatusAnalytics(data.analytics.byStatus, totalLeads);
    renderModeAnalytics(data.analytics.byMode, totalLeads);
    renderReferralAnalytics(data.analytics.byReferral, totalLeads);
  } catch (err) {
    console.error('Error loading analytics:', err);
  }
}

function renderCourseAnalytics(courses, total) {
  const container = document.getElementById('analyticsCoursesList');
  if (!container) return;

  if (!courses || courses.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">No leads recorded yet.</div>';
    return;
  }

  const maxVal = Math.max(...courses.map(c => c.count), 1);

  container.innerHTML = courses.map(item => {
    const pct = Math.round((item.count / total) * 100);
    const barWidth = Math.round((item.count / maxVal) * 100);
    return `
      <div class="chart-bar-row">
        <div class="chart-bar-label">
          <span>${escapeHtml(item.course)}</span>
          <span><strong>${item.count}</strong> inquiries (${pct}%)</span>
        </div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width: ${barWidth}%;"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderStatusAnalytics(statuses, total) {
  const container = document.getElementById('analyticsStatusList');
  if (!container) return;

  const colorMap = {
    'New': '#2563eb',
    'Contacted': '#7c3aed',
    'Interested': '#d97706',
    'Enrolled': '#059669',
    'Not Interested': '#64748b',
    'Follow Up': '#ea580c',
    'Closed': '#334155'
  };

  if (!statuses || statuses.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">No statuses recorded.</div>';
    return;
  }

  container.innerHTML = statuses.map(item => {
    const pct = Math.round((item.count / total) * 100);
    const color = colorMap[item.status] || '#2563eb';
    return `
      <div class="chart-bar-row">
        <div class="chart-bar-label">
          <span>${escapeHtml(item.status)}</span>
          <span><strong>${item.count}</strong> (${pct}%)</span>
        </div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width: ${pct}%; background-color: ${color};"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderModeAnalytics(modes, total) {
  const container = document.getElementById('analyticsModesList');
  if (!container) return;

  if (!modes || modes.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">No mode data.</div>';
    return;
  }

  container.innerHTML = modes.map(item => {
    const pct = Math.round((item.count / total) * 100);
    const isPhysical = item.learning_mode === 'Physical';
    const color = isPhysical ? '#f59e0b' : '#3b82f6';
    return `
      <div class="chart-bar-row">
        <div class="chart-bar-label">
          <span>${isPhysical ? '🏫 Physical Campus' : '🌐 Online Virtual'}</span>
          <span><strong>${item.count}</strong> students (${pct}%)</span>
        </div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width: ${pct}%; background-color: ${color};"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderReferralAnalytics(referrals, total) {
  const container = document.getElementById('analyticsReferralsList');
  if (!container) return;

  if (!referrals || referrals.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">No referral data.</div>';
    return;
  }

  container.innerHTML = referrals.map(item => {
    const pct = Math.round((item.count / total) * 100);
    return `
      <div class="chart-bar-row">
        <div class="chart-bar-label">
          <span>${escapeHtml(item.referral_source)}</span>
          <span><strong>${item.count}</strong> (${pct}%)</span>
        </div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width: ${pct}%; background: linear-gradient(90deg, #10b981, #34d399);"></div>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
