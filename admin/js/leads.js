/**
 * Admin Leads Management Page Logic
 */

let currentLeads = [];
let currentPage = 1;
let currentLimit = 25;
let currentTotalPages = 1;
let activeLeadData = null;
let activeCoursesList = [];

document.addEventListener('DOMContentLoaded', async () => {
  await checkAdminSession();
  await loadCoursesList();
  initFilterListeners();
  initModalListeners();
  parseUrlParams();
  loadLeads();
});

// Load Course list for filters and edit dropdown
async function loadCoursesList() {
  try {
    const res = await authFetch('/api/courses');
    if (!res.ok) return;
    const data = await res.json();
    if (data.success && Array.isArray(data.courses)) {
      activeCoursesList = data.courses;

      // Populate filter dropdown
      const filterSelect = document.getElementById('filterCourse');
      if (filterSelect) {
        data.courses.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.name;
          opt.textContent = c.name;
          filterSelect.appendChild(opt);
        });
      }

      // Populate edit modal dropdown
      const editSelect = document.getElementById('editCourse');
      if (editSelect) {
        editSelect.innerHTML = '';
        data.courses.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.name;
          opt.textContent = c.name;
          editSelect.appendChild(opt);
        });
      }
    }
  } catch (err) {
    console.error('Error loading courses for filters:', err);
  }
}

// Parse URL search parameters (e.g. ?status=New or ?viewId=12)
function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const statusParam = params.get('status');
  if (statusParam) {
    const statusSelect = document.getElementById('filterStatus');
    if (statusSelect) statusSelect.value = statusParam;
  }
  const viewId = params.get('viewId');
  if (viewId) {
    openLeadViewModal(viewId);
  }
}

// Set up Filter & Search event listeners
function initFilterListeners() {
  const searchInput = document.getElementById('filterSearch');
  const courseSelect = document.getElementById('filterCourse');
  const modeSelect = document.getElementById('filterMode');
  const commSelect = document.getElementById('filterComm');
  const referralSelect = document.getElementById('filterReferral');
  const statusSelect = document.getElementById('filterStatus');
  const limitSelect = document.getElementById('filterLimit');
  const resetBtn = document.getElementById('btnResetFilters');
  const exportBtn = document.getElementById('exportLeadsCsvBtn');

  let debounceTimer = null;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentPage = 1;
        loadLeads();
      }, 350);
    });
  }

  [courseSelect, modeSelect, commSelect, referralSelect, statusSelect].forEach(el => {
    if (el) {
      el.addEventListener('change', () => {
        currentPage = 1;
        loadLeads();
      });
    }
  });

  if (limitSelect) {
    limitSelect.addEventListener('change', () => {
      currentLimit = parseInt(limitSelect.value, 10) || 25;
      currentPage = 1;
      loadLeads();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (courseSelect) courseSelect.value = '';
      if (modeSelect) modeSelect.value = '';
      if (commSelect) commSelect.value = '';
      if (referralSelect) referralSelect.value = '';
      if (statusSelect) statusSelect.value = '';
      currentPage = 1;
      loadLeads();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', handleExportCsv);
  }
}

// Build query string from current filters
function buildQueryString() {
  const search = document.getElementById('filterSearch')?.value.trim() || '';
  const course = document.getElementById('filterCourse')?.value || '';
  const mode = document.getElementById('filterMode')?.value || '';
  const comm = document.getElementById('filterComm')?.value || '';
  const referral = document.getElementById('filterReferral')?.value || '';
  const status = document.getElementById('filterStatus')?.value || '';

  const params = new URLSearchParams({
    page: currentPage,
    limit: currentLimit
  });

  if (search) params.set('search', search);
  if (course) params.set('course', course);
  if (mode) params.set('learning_mode', mode);
  if (comm) params.set('communication_method', comm);
  if (referral) params.set('referral_source', referral);
  if (status) params.set('status', status);

  return params.toString();
}

// Fetch Leads from Backend
async function loadLeads() {
  const tbody = document.getElementById('leadsTableBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align: center; color: var(--text-muted); padding: 3rem;">
          <span class="spinner" style="width:20px;height:20px;border-width:2px;display:inline-block;border-radius:50%;border:2px solid var(--border);border-top-color:var(--admin-primary);animation:spin 0.8s linear infinite;" aria-hidden="true"></span>
          <div style="margin-top: 0.5rem;">Loading leads from database...</div>
        </td>
      </tr>
    `;
  }

  try {
    const qs = buildQueryString();
    const res = await authFetch(`/api/admin/leads?${qs}`);
    if (!res.ok) throw new Error('Failed to fetch leads');

    const data = await res.json();
    if (data.success) {
      currentLeads = data.leads || [];
      currentTotalPages = data.pagination.totalPages || 1;
      renderLeadsTable(currentLeads);
      renderPagination(data.pagination);
    }
  } catch (err) {
    console.error('Error loading leads:', err);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11" style="text-align: center; color: var(--danger); padding: 2rem;">
            Failed to load leads from server. Please try refreshing.
          </td>
        </tr>
      `;
    }
  }
}

// Render Leads Table
function renderLeadsTable(leads) {
  const tbody = document.getElementById('leadsTableBody');
  const countPill = document.getElementById('totalLeadsCountPill');
  if (!tbody) return;

  if (leads.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align: center; color: var(--text-muted); padding: 3rem;">
          No leads match the specified filters.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = leads.map(lead => {
    const statusClass = getStatusClass(lead.status);
    const dateFormatted = formatDisplayDate(lead.created_at);
    const sanitizedPhone = (lead.phone || '').replace(/[^0-9]/g, '');

    return `
      <tr>
        <td style="font-weight: 700; color: var(--text-muted);">#${lead.id}</td>
        <td>
          <div class="table-lead-name">${escapeHtml(lead.full_name)}</div>
        </td>
        <td>
          <a href="tel:${escapeHtml(lead.phone)}" style="color: var(--text-primary); font-weight: 500;">
            ${escapeHtml(lead.phone)}
          </a>
        </td>
        <td>
          <a href="mailto:${escapeHtml(lead.email)}" style="color: var(--admin-primary);">
            ${escapeHtml(lead.email)}
          </a>
        </td>
        <td><strong>${escapeHtml(lead.course)}</strong></td>
        <td>
          <span style="font-size: 0.8rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: var(--radius-sm); background: ${lead.learning_mode === 'Physical' ? '#fef3c7' : '#dbeafe'}; color: ${lead.learning_mode === 'Physical' ? '#92400e' : '#1e40af'};">
            ${escapeHtml(lead.learning_mode)}
          </span>
        </td>
        <td>${escapeHtml(lead.communication_method)}</td>
        <td>
          <span style="font-size: 0.8rem; color: var(--text-secondary);">
            ${escapeHtml(lead.referral_source)}
            ${lead.referral_other ? `(${escapeHtml(lead.referral_other)})` : ''}
          </span>
        </td>
        <td>
          <span class="status-badge ${statusClass}">
            <span class="status-dot"></span>
            ${escapeHtml(lead.status)}
          </span>
        </td>
        <td style="color: var(--text-muted); font-size: 0.8rem; white-space: nowrap;">
          ${dateFormatted}
        </td>
        <td>
          <div class="action-buttons-cell" style="justify-content: flex-end;">
            <!-- View Button -->
            <button type="button" class="btn-action-icon btn-action-view" onclick="openLeadViewModal(${lead.id})" title="View Lead Details">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>

            <!-- WhatsApp Direct Button -->
            <a href="https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(`Hello ${lead.full_name}, thank you for reaching out to Apex ICT Academy regarding the ${lead.course} training!`)}" target="_blank" class="btn-action-icon btn-action-wa" title="Open WhatsApp Chat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.586 1.761.882 2.796.882 3.183 0 5.769-2.587 5.769-5.768 0-3.179-2.586-5.767-5.769-5.767zm7.653 5.766c0 4.22-3.432 7.653-7.653 7.653-1.309 0-2.536-.33-3.619-.914l-4.041 1.059 1.08-3.935c-.689-1.144-1.073-2.48-1.073-3.863 0-4.221 3.433-7.653 7.653-7.653 4.221 0 7.653 3.432 7.653 7.653z"/></svg>
            </a>

            <!-- Edit Button -->
            <button type="button" class="btn-action-icon" onclick="openLeadEditModal(${lead.id})" title="Edit Lead">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>

            <!-- Delete Button -->
            <button type="button" class="btn-action-icon btn-action-delete" onclick="openLeadDeleteModal(${lead.id}, '${escapeHtml(lead.full_name)}')" title="Delete Lead">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Render Pagination Controls
function renderPagination(pagination) {
  const infoEl = document.getElementById('paginationInfo');
  const controlsEl = document.getElementById('paginationControls');
  const countPill = document.getElementById('totalLeadsCountPill');

  if (countPill) countPill.textContent = `${pagination.total} leads`;

  if (infoEl) {
    const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
    infoEl.textContent = `Showing ${start} to ${end} of ${pagination.total} leads`;
  }

  if (controlsEl) {
    let html = '';

    // Prev Button
    html += `
      <button type="button" class="btn-page" ${!pagination.hasPrev ? 'disabled' : ''} onclick="goToPage(${pagination.page - 1})">
        &laquo; Prev
      </button>
    `;

    // Numeric Pages
    const maxPagesToShow = 5;
    let startPage = Math.max(1, pagination.page - 2);
    let endPage = Math.min(pagination.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let p = startPage; p <= endPage; p++) {
      html += `
        <button type="button" class="btn-page ${p === pagination.page ? 'active' : ''}" onclick="goToPage(${p})">
          ${p}
        </button>
      `;
    }

    // Next Button
    html += `
      <button type="button" class="btn-page" ${!pagination.hasNext ? 'disabled' : ''} onclick="goToPage(${pagination.page + 1})">
        Next &raquo;
      </button>
    `;

    controlsEl.innerHTML = html;
  }
}

function goToPage(page) {
  if (page < 1 || page > currentTotalPages) return;
  currentPage = page;
  loadLeads();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Section 9: Open Complete Lead Details Modal
async function openLeadViewModal(leadId) {
  try {
    const res = await authFetch(`/api/admin/leads/${leadId}`);
    if (!res.ok) throw new Error('Failed to load lead details');

    const data = await res.json();
    if (!data.success || !data.lead) return;

    activeLeadData = data.lead;
    const lead = data.lead;
    const activities = data.activities || [];

    // Header info
    document.getElementById('viewModalTitle').textContent = lead.full_name;
    const statusBadge = document.getElementById('viewModalStatusBadge');
    statusBadge.textContent = lead.status;
    statusBadge.className = `status-badge ${getStatusClass(lead.status)}`;

    // Details Grid (Section 9)
    document.getElementById('viewLeadFullName').textContent = lead.full_name;
    document.getElementById('viewLeadPhone').textContent = lead.phone;
    document.getElementById('viewLeadEmail').textContent = lead.email;
    document.getElementById('viewLeadCourse').textContent = lead.course;
    document.getElementById('viewLeadMode').textContent = `${lead.learning_mode} Learning`;
    document.getElementById('viewLeadComm').textContent = lead.communication_method;
    document.getElementById('viewLeadReferral').textContent = lead.referral_source;
    document.getElementById('viewLeadReferralOther').textContent = lead.referral_other || 'N/A';
    document.getElementById('viewLeadCreated').textContent = formatFullDate(lead.created_at);
    document.getElementById('viewLeadUpdated').textContent = formatFullDate(lead.updated_at);

    // Notes
    document.getElementById('viewLeadNotes').textContent = lead.notes || 'No internal notes added yet.';
    document.getElementById('newNoteInput').value = '';

    // Quick Status dropdown
    document.getElementById('quickStatusSelect').value = lead.status;

    // Contact buttons
    const sanitizedPhone = (lead.phone || '').replace(/[^0-9]/g, '');
    const waBtn = document.getElementById('viewLeadWhatsAppBtn');
    const callBtn = document.getElementById('viewLeadCallBtn');
    const emailBtn = document.getElementById('viewLeadEmailBtn');

    if (waBtn) {
      waBtn.href = `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(`Hello ${lead.full_name}, thank you for contacting Apex ICT Academy about the ${lead.course} training!`)}`;
    }
    if (callBtn) {
      callBtn.href = `tel:${lead.phone}`;
    }
    if (emailBtn) {
      emailBtn.href = `mailto:${lead.email}?subject=${encodeURIComponent(`ICT Course Information - ${lead.course}`)}`;
    }

    // Timeline Activities (Section 17)
    renderTimeline(activities);

    // Show modal
    openModal('viewLeadModal');
  } catch (err) {
    console.error('Error fetching lead profile:', err);
    alert('Unable to load lead details.');
  }
}

// Render Timeline Activities (Section 17)
function renderTimeline(activities) {
  const container = document.getElementById('viewLeadTimeline');
  if (!container) return;

  if (activities.length === 0) {
    container.innerHTML = `
      <li style="color: var(--text-muted); font-size: 0.85rem; padding-left: 0.5rem;">
        No activity history recorded.
      </li>
    `;
    return;
  }

  container.innerHTML = activities.map(act => {
    return `
      <li class="timeline-node">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-meta">
            <strong>${escapeHtml(act.created_by || 'System')}</strong>
            <span>${formatFullDate(act.created_at)}</span>
          </div>
          <div>${escapeHtml(act.description)}</div>
        </div>
      </li>
    `;
  }).join('');
}

// Quick Status Update
document.addEventListener('DOMContentLoaded', () => {
  const updateStatusBtn = document.getElementById('btnUpdateQuickStatus');
  if (updateStatusBtn) {
    updateStatusBtn.addEventListener('click', async () => {
      if (!activeLeadData) return;
      const newStatus = document.getElementById('quickStatusSelect').value;

      try {
        const res = await authFetch(`/api/admin/leads/${activeLeadData.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        const result = await res.json();
        if (res.ok && result.success) {
          // Refresh view modal & table
          openLeadViewModal(activeLeadData.id);
          loadLeads();
          fetchNewLeadsCount();
        } else {
          alert(result.message || 'Failed to update status');
        }
      } catch (e) {
        alert('Network error updating status');
      }
    });
  }

  // Add Note Handler
  const addNoteBtn = document.getElementById('btnAddNoteBtn');
  if (addNoteBtn) {
    addNoteBtn.addEventListener('click', async () => {
      if (!activeLeadData) return;
      const noteInput = document.getElementById('newNoteInput');
      const noteText = noteInput.value.trim();

      if (!noteText) {
        alert('Please enter a note before saving.');
        return;
      }

      try {
        const res = await authFetch(`/api/admin/leads/${activeLeadData.id}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: noteText })
        });
        const result = await res.json();
        if (res.ok && result.success) {
          noteInput.value = '';
          openLeadViewModal(activeLeadData.id);
          loadLeads();
        } else {
          alert(result.message || 'Failed to add note');
        }
      } catch (e) {
        alert('Network error adding note');
      }
    });
  }

  // Edit Lead Modal Open from View
  const openEditFromViewBtn = document.getElementById('btnOpenEditFromView');
  if (openEditFromViewBtn) {
    openEditFromViewBtn.addEventListener('click', () => {
      closeModal('viewLeadModal');
      if (activeLeadData) {
        openLeadEditModal(activeLeadData.id);
      }
    });
  }
});

// Section 10: Open Edit Lead Modal
async function openLeadEditModal(leadId) {
  try {
    const res = await authFetch(`/api/admin/leads/${leadId}`);
    if (!res.ok) throw new Error('Failed to load lead details');

    const data = await res.json();
    if (!data.success || !data.lead) return;

    const lead = data.lead;
    document.getElementById('editLeadId').value = lead.id;
    document.getElementById('editFullName').value = lead.full_name;
    document.getElementById('editPhone').value = lead.phone;
    document.getElementById('editEmail').value = lead.email;
    document.getElementById('editCourse').value = lead.course;
    document.getElementById('editLearningMode').value = lead.learning_mode;
    document.getElementById('editCommMethod').value = lead.communication_method;
    document.getElementById('editReferral').value = lead.referral_source;
    document.getElementById('editReferralOther').value = lead.referral_other || '';
    document.getElementById('editStatus').value = lead.status;
    document.getElementById('editNotes').value = lead.notes || '';

    openModal('editLeadModal');
  } catch (err) {
    alert('Unable to load lead for editing.');
  }
}

// Handle Save Edit Form
document.addEventListener('DOMContentLoaded', () => {
  const editForm = document.getElementById('editLeadForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const leadId = document.getElementById('editLeadId').value;
      const payload = {
        full_name: document.getElementById('editFullName').value.trim(),
        phone: document.getElementById('editPhone').value.trim(),
        email: document.getElementById('editEmail').value.trim(),
        course: document.getElementById('editCourse').value,
        learning_mode: document.getElementById('editLearningMode').value,
        communication_method: document.getElementById('editCommMethod').value,
        referral_source: document.getElementById('editReferral').value,
        referral_other: document.getElementById('editReferralOther').value.trim(),
        status: document.getElementById('editStatus').value,
        notes: document.getElementById('editNotes').value.trim()
      };

      try {
        const res = await authFetch(`/api/admin/leads/${leadId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (res.ok && result.success) {
          closeModal('editLeadModal');
          loadLeads();
          fetchNewLeadsCount();
        } else {
          alert(result.message || 'Failed to update lead');
        }
      } catch (err) {
        alert('Network error updating lead.');
      }
    });
  }
});

// Section 10: Delete Lead Confirmation
function openLeadDeleteModal(leadId, leadName) {
  document.getElementById('deleteLeadTargetId').value = leadId;
  document.getElementById('deleteLeadTargetName').textContent = `"${leadName}" (ID: #${leadId})`;
  openModal('deleteLeadModal');
}

document.addEventListener('DOMContentLoaded', () => {
  const confirmDeleteBtn = document.getElementById('btnConfirmDeleteLead');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      const leadId = document.getElementById('deleteLeadTargetId').value;
      if (!leadId) return;

      try {
        const res = await authFetch(`/api/admin/leads/${leadId}`, { method: 'DELETE' });
        const result = await res.json();
        if (res.ok && result.success) {
          closeModal('deleteLeadModal');
          loadLeads();
          fetchNewLeadsCount();
        } else {
          alert(result.message || 'Failed to delete lead');
        }
      } catch (err) {
        alert('Network error deleting lead.');
      }
    });
  }
});

// Section 14: Export CSV (Filtered or All)
async function handleExportCsv() {
  const qs = buildQueryString();
  const token = getAuthToken();

  try {
    const res = await authFetch(`/api/admin/leads/export?${qs}`);
    if (!res.ok) throw new Error('Failed to export CSV');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ict_leads_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export error:', err);
    alert('Unable to export leads CSV.');
  }
}

// Modal System Handlers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('visible');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('visible');
}

function initModalListeners() {
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = e.currentTarget.getAttribute('data-close-modal');
      closeModal(modalId);
    });
  });

  // Close on backdrop click
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('visible');
      }
    });
  });
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
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}

function formatFullDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
