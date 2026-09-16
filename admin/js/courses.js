/**
 * Admin Course Management Logic
 */

let allCourses = [];

document.addEventListener('DOMContentLoaded', async () => {
  await checkAdminSession();
  initCourseActions();
  loadAdminCourses();
});

async function loadAdminCourses() {
  const tbody = document.getElementById('coursesTableBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 3rem;">
          <span class="spinner" style="width:20px;height:20px;border-width:2px;display:inline-block;border-radius:50%;border:2px solid var(--border);border-top-color:var(--admin-primary);animation:spin 0.8s linear infinite;" aria-hidden="true"></span>
          <div style="margin-top: 0.5rem;">Loading course catalog...</div>
        </td>
      </tr>
    `;
  }

  try {
    const res = await authFetch('/api/admin/courses');
    if (!res.ok) throw new Error('Failed to load courses');

    const data = await res.json();
    if (data.success) {
      allCourses = data.courses || [];
      renderCoursesTable(allCourses);
    }
  } catch (err) {
    console.error('Error fetching courses:', err);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--danger); padding: 2rem;">
            Failed to load courses. Please refresh.
          </td>
        </tr>
      `;
    }
  }
}

function renderCoursesTable(courses) {
  const tbody = document.getElementById('coursesTableBody');
  if (!tbody) return;

  if (courses.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 3rem;">
          No courses found. Click "+ Add New Course" to create one.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = courses.map(course => {
    const isActive = course.status === 'Active';
    const statusClass = isActive ? 'status-enrolled' : 'status-not-interested';
    const dateFormatted = formatSimpleDate(course.created_at);

    return `
      <tr>
        <td>
          <div style="font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">
            ${escapeHtml(course.name)}
          </div>
        </td>
        <td>
          <span style="font-size: 0.8rem; font-weight: 600; padding: 0.2rem 0.55rem; background: var(--canvas); border: 1px solid var(--border); border-radius: var(--radius-sm);">
            ${escapeHtml(course.category || 'Technology')}
          </span>
        </td>
        <td>${escapeHtml(course.duration || '8 Weeks')}</td>
        <td>
          <div style="max-width: 320px; font-size: 0.825rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${escapeHtml(course.description || 'No description entered.')}
          </div>
        </td>
        <td>
          <span style="font-weight: 700; color: var(--admin-primary); font-size: 0.9rem;">
            ${course.lead_count || 0}
          </span>
        </td>
        <td>
          <span class="status-badge ${statusClass}">
            <span class="status-dot"></span>
            ${escapeHtml(course.status)}
          </span>
        </td>
        <td style="color: var(--text-muted); font-size: 0.8rem; white-space: nowrap;">
          ${dateFormatted}
        </td>
        <td>
          <div class="action-buttons-cell" style="justify-content: flex-end;">
            <!-- Toggle Status Button -->
            <button type="button" class="btn-action-icon" onclick="toggleCourseStatus(${course.id})" title="${isActive ? 'Deactivate course' : 'Activate course'}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${isActive
                  ? '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>'
                  : '<polygon points="5 3 19 12 5 21 5 3"></polygon>'
                }
              </svg>
            </button>

            <!-- Edit Button -->
            <button type="button" class="btn-action-icon" onclick="openEditCourseModal(${course.id})" title="Edit Course">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>

            <!-- Delete Button -->
            <button type="button" class="btn-action-icon btn-action-delete" onclick="deleteCourse(${course.id}, '${escapeHtml(course.name)}')" title="Delete Course">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function initCourseActions() {
  const addBtn = document.getElementById('btnOpenAddCourseModal');
  const addForm = document.getElementById('addCourseForm');
  const editForm = document.getElementById('editCourseForm');

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      document.getElementById('addCourseForm').reset();
      openModal('addCourseModal');
    });
  }

  // Create course submit
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('newCourseName').value.trim(),
        category: document.getElementById('newCourseCategory').value.trim(),
        duration: document.getElementById('newCourseDuration').value.trim(),
        icon: document.getElementById('newCourseIcon').value,
        status: document.getElementById('newCourseStatus').value,
        description: document.getElementById('newCourseDesc').value.trim()
      };

      if (!payload.name) {
        alert('Please enter course name.');
        return;
      }

      try {
        const res = await authFetch('/api/admin/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.success) {
          closeModal('addCourseModal');
          loadAdminCourses();
        } else {
          alert(data.message || 'Failed to create course');
        }
      } catch (err) {
        alert('Network error creating course.');
      }
    });
  }

  // Edit course submit
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editCourseId').value;
      const payload = {
        name: document.getElementById('editCourseName').value.trim(),
        category: document.getElementById('editCourseCategory').value.trim(),
        duration: document.getElementById('editCourseDuration').value.trim(),
        icon: document.getElementById('editCourseIcon').value,
        status: document.getElementById('editCourseStatus').value,
        description: document.getElementById('editCourseDesc').value.trim()
      };

      try {
        const res = await authFetch(`/api/admin/courses/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.success) {
          closeModal('editCourseModal');
          loadAdminCourses();
        } else {
          alert(data.message || 'Failed to update course');
        }
      } catch (err) {
        alert('Network error updating course.');
      }
    });
  }

  // Modal close listeners
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = e.currentTarget.getAttribute('data-close-modal');
      closeModal(modalId);
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('visible');
      }
    });
  });
}

function openEditCourseModal(id) {
  const course = allCourses.find(c => c.id === id);
  if (!course) return;

  document.getElementById('editCourseId').value = course.id;
  document.getElementById('editCourseName').value = course.name;
  document.getElementById('editCourseCategory').value = course.category || '';
  document.getElementById('editCourseDuration').value = course.duration || '';
  document.getElementById('editCourseIcon').value = course.icon || 'code';
  document.getElementById('editCourseStatus').value = course.status;
  document.getElementById('editCourseDesc').value = course.description || '';

  openModal('editCourseModal');
}

async function toggleCourseStatus(id) {
  try {
    const res = await authFetch(`/api/admin/courses/${id}/status`, { method: 'PATCH' });
    const data = await res.json();
    if (res.ok && data.success) {
      loadAdminCourses();
    } else {
      alert(data.message || 'Failed to toggle status');
    }
  } catch (e) {
    alert('Network error toggling course status');
  }
}

async function deleteCourse(id, name) {
  if (!confirm(`Are you sure you want to delete or deactivate the course "${name}"?`)) {
    return;
  }

  try {
    const res = await authFetch(`/api/admin/courses/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && data.success) {
      alert(data.message);
      loadAdminCourses();
    } else {
      alert(data.message || 'Failed to delete course');
    }
  } catch (e) {
    alert('Network error deleting course');
  }
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('visible');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('visible');
}

function formatSimpleDate(dateStr) {
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

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
