/**
 * ICT Course Lead Generation System - Frontend Application Logic
 * Vanilla JavaScript (No React/Vue/Angular)
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initCourseCatalog();
  initLeadForm();
});

// Mobile Navigation Toggle
function initMobileNav() {
  const toggleBtn = document.getElementById('mobileNavToggle');
  const navLinks = document.getElementById('navLinks');

  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });

    // Close mobile nav when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
      });
    });
  }
}

// Fetch Active Courses from Backend & Render Public Grid and Dropdown
async function initCourseCatalog() {
  const courseSelect = document.getElementById('course');
  const coursesGrid = document.getElementById('coursesGrid');

  try {
    const response = await fetch('/api/courses');
    if (!response.ok) throw new Error('Failed to load courses');
    const data = await response.json();

    if (data.success && Array.isArray(data.courses) && data.courses.length > 0) {
      renderCoursesGrid(data.courses, coursesGrid);
      populateCourseSelect(data.courses, courseSelect);
    } else {
      console.warn('No active courses found from API, using fallback list.');
    }
  } catch (err) {
    console.error('Error fetching courses:', err);
    // Even if backend had a temporary hiccup, the HTML fallback options exist
  }
}

function renderCoursesGrid(courses, container) {
  if (!container) return;

  const iconsMap = {
    code: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`,
    terminal: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>`,
    cpu: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>`,
    layout: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>`,
    'pen-tool': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>`,
    'file-text': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
    database: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>`,
    server: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>`,
    shield: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
    'bar-chart': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>`,
    'more-horizontal': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>`
  };

  container.innerHTML = courses.map(course => {
    const iconSvg = iconsMap[course.icon] || iconsMap.code;
    return `
      <div class="course-card" data-course-name="${escapeHtml(course.name)}">
        <div class="course-meta">
          <span class="course-category">${escapeHtml(course.category || 'ICT Course')}</span>
          <span class="course-duration">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            ${escapeHtml(course.duration || '8 Weeks')}
          </span>
        </div>
        <h3 class="course-name">${escapeHtml(course.name)}</h3>
        <p class="course-description">${escapeHtml(course.description || 'Hands-on practical training designed to prepare students for real-world industry demands.')}</p>
        <div class="course-action">
          <button type="button" class="btn-select-course" data-target-course="${escapeHtml(course.name)}">
            Select This Course &rarr;
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach click listener to "Select This Course" buttons
  container.querySelectorAll('.btn-select-course').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const courseName = e.currentTarget.getAttribute('data-target-course');
      selectCourseAndScroll(courseName);
    });
  });
}

function populateCourseSelect(courses, selectElement) {
  if (!selectElement) return;

  const currentValue = selectElement.value;
  selectElement.innerHTML = '<option value="">-- Choose an ICT Course --</option>';

  courses.forEach(course => {
    const opt = document.createElement('option');
    opt.value = course.name;
    opt.textContent = course.name;
    if (course.name === currentValue) opt.selected = true;
    selectElement.appendChild(opt);
  });
}

function selectCourseAndScroll(courseName) {
  const courseSelect = document.getElementById('course');
  if (courseSelect) {
    courseSelect.value = courseName;
    clearFieldError(courseSelect);
  }

  const formSection = document.getElementById('lead-form-section');
  if (formSection) {
    formSection.scrollIntoView({ behavior: 'smooth' });
    const nameInput = document.getElementById('full_name');
    if (nameInput) {
      setTimeout(() => nameInput.focus(), 600);
    }
  }
}

// Lead Form Validation & Submission
function initLeadForm() {
  const form = document.getElementById('leadRegistrationForm');
  const referralSelect = document.getElementById('referral_source');
  const referralOtherGroup = document.getElementById('referralOtherContainer');
  const referralOtherInput = document.getElementById('referral_other');
  const submitBtn = document.getElementById('submitLeadBtn');
  const formAlert = document.getElementById('formAlert');
  const successCard = document.getElementById('successCard');
  const submitAnotherBtn = document.getElementById('submitAnotherBtn');

  // Radio button card styling
  const radioCards = document.querySelectorAll('.radio-card');
  radioCards.forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    if (radio && radio.checked) card.classList.add('active');

    card.addEventListener('click', () => {
      radioCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      if (radio) {
        radio.checked = true;
        const learningModeErr = document.getElementById('learningModeError');
        if (learningModeErr) learningModeErr.classList.remove('visible');
      }
    });
  });

  // Dynamic "Other" referral source field
  if (referralSelect && referralOtherGroup) {
    referralSelect.addEventListener('change', () => {
      if (referralSelect.value === 'Other') {
        referralOtherGroup.classList.add('visible');
        if (referralOtherInput) referralOtherInput.focus();
      } else {
        referralOtherGroup.classList.remove('visible');
        if (referralOtherInput) {
          referralOtherInput.value = '';
          clearFieldError(referralOtherInput);
        }
      }
    });
  }

  // Clear errors on input
  form.querySelectorAll('input, select, textarea').forEach(field => {
    field.addEventListener('input', () => clearFieldError(field));
    field.addEventListener('change', () => clearFieldError(field));
  });

  // Submit Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Validate Form
    const isValid = validateClientSide();
    if (!isValid) {
      showFormAlert('Please fix the highlighted errors before submitting.');
      return;
    }

    hideFormAlert();

    // 2. Prevent duplicate submissions & Show loading state
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span class="spinner" aria-hidden="true"></span>
      <span>Submitting Details...</span>
    `;

    // 3. Extract Form Data
    const selectedMode = form.querySelector('input[name="learning_mode"]:checked');
    const payload = {
      full_name: document.getElementById('full_name').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      email: document.getElementById('email').value.trim(),
      course: document.getElementById('course').value,
      learning_mode: selectedMode ? selectedMode.value : '',
      communication_method: document.getElementById('communication_method').value,
      referral_source: document.getElementById('referral_source').value,
      referral_other: document.getElementById('referral_other') ? document.getElementById('referral_other').value.trim() : ''
    };

    try {
      // 4. Send to Node.js backend using fetch()
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // 5. Display the thank-you message after successful submission
        displayThankYouMessage(payload);
      } else {
        // Handle validation errors from server
        if (result.errors) {
          applyServerErrors(result.errors);
        }
        showFormAlert(result.message || 'Submission failed. Please check your information and try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    } catch (err) {
      console.error('Network error during lead submission:', err);
      showFormAlert('A network error occurred. Please check your internet connection and try again.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });

  // Reset & submit another inquiry button
  if (submitAnotherBtn) {
    submitAnotherBtn.addEventListener('click', () => {
      form.reset();
      radioCards.forEach(c => c.classList.remove('active'));
      const firstRadio = document.querySelector('input[name="learning_mode"][value="Physical"]');
      if (firstRadio) {
        firstRadio.checked = true;
        firstRadio.closest('.radio-card').classList.add('active');
      }
      if (referralOtherGroup) referralOtherGroup.classList.remove('visible');
      successCard.classList.remove('visible');
      form.style.display = 'flex';
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Get Course Details`;
    });
  }
}

// Client-Side Validation
function validateClientSide() {
  let valid = true;

  // 1. Full Name
  const nameField = document.getElementById('full_name');
  const nameVal = nameField.value.trim();
  if (!nameVal) {
    setFieldError(nameField, 'Please enter your full name.');
    valid = false;
  } else if (nameVal.length < 2) {
    setFieldError(nameField, 'Full name must be at least 2 characters.');
    valid = false;
  } else {
    clearFieldError(nameField);
  }

  // 2. Phone / WhatsApp Number (Nigerian & International formats)
  const phoneField = document.getElementById('phone');
  const phoneVal = phoneField.value.trim();
  const cleanPhone = phoneVal.replace(/[\s\-()]/g, '');
  const isNigerian = /^(?:\+?234|0)[789][01]\d{8}$/.test(cleanPhone);
  const isGeneralIntl = /^\+?[0-9\s\-()]{7,20}$/.test(phoneVal);

  if (!phoneVal) {
    setFieldError(phoneField, 'Please enter your phone/WhatsApp number.');
    valid = false;
  } else if (!isNigerian && !isGeneralIntl) {
    setFieldError(phoneField, 'Please enter a valid phone/WhatsApp number (e.g. 08012345678 or +234...).');
    valid = false;
  } else {
    clearFieldError(phoneField);
  }

  // 3. Email Address
  const emailField = document.getElementById('email');
  const emailVal = emailField.value.trim();
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!emailVal) {
    setFieldError(emailField, 'Please enter your email address.');
    valid = false;
  } else if (!emailRegex.test(emailVal)) {
    setFieldError(emailField, 'Please enter a valid email address.');
    valid = false;
  } else {
    clearFieldError(emailField);
  }

  // 4. Course
  const courseField = document.getElementById('course');
  if (!courseField.value) {
    setFieldError(courseField, 'Please select an ICT course.');
    valid = false;
  } else {
    clearFieldError(courseField);
  }

  // 5. Learning Mode
  const modeSelected = document.querySelector('input[name="learning_mode"]:checked');
  const modeErr = document.getElementById('learningModeError');
  if (!modeSelected) {
    if (modeErr) {
      modeErr.textContent = 'Please select your preferred learning mode.';
      modeErr.classList.add('visible');
    }
    valid = false;
  } else {
    if (modeErr) modeErr.classList.remove('visible');
  }

  // 6. Communication Method
  const commField = document.getElementById('communication_method');
  if (!commField.value) {
    setFieldError(commField, 'Please select your preferred means of communication.');
    valid = false;
  } else {
    clearFieldError(commField);
  }

  // 7. Referral Source
  const refField = document.getElementById('referral_source');
  if (!refField.value) {
    setFieldError(refField, 'Please let us know how you heard about us.');
    valid = false;
  } else {
    clearFieldError(refField);
  }

  // If Other, validate referral_other
  if (refField.value === 'Other') {
    const otherField = document.getElementById('referral_other');
    if (!otherField.value.trim()) {
      setFieldError(otherField, 'Please specify where you heard about us.');
      valid = false;
    } else {
      clearFieldError(otherField);
    }
  }

  return valid;
}

function setFieldError(field, message) {
  field.classList.add('is-invalid');
  const errorContainer = field.parentElement.querySelector('.error-message');
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.classList.add('visible');
  }
}

function clearFieldError(field) {
  field.classList.remove('is-invalid');
  const errorContainer = field.parentElement.querySelector('.error-message');
  if (errorContainer) {
    errorContainer.textContent = '';
    errorContainer.classList.remove('visible');
  }
}

function applyServerErrors(errors) {
  for (const [key, msg] of Object.entries(errors)) {
    const field = document.getElementById(key);
    if (field) {
      setFieldError(field, msg);
    }
  }
}

function showFormAlert(msg) {
  const alert = document.getElementById('formAlert');
  if (alert) {
    alert.textContent = msg;
    alert.className = 'form-alert alert-danger visible';
    alert.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function hideFormAlert() {
  const alert = document.getElementById('formAlert');
  if (alert) {
    alert.className = 'form-alert';
    alert.textContent = '';
  }
}

// Display Thank-You Message (Section 4)
function displayThankYouMessage(data) {
  const form = document.getElementById('leadRegistrationForm');
  const successCard = document.getElementById('successCard');

  if (form) form.style.display = 'none';

  if (successCard) {
    // Populate summary fields
    const nameEl = document.getElementById('summaryName');
    const courseEl = document.getElementById('summaryCourse');
    const modeEl = document.getElementById('summaryMode');
    const commEl = document.getElementById('summaryComm');
    const chatBtn = document.getElementById('whatsappChatBtn');

    if (nameEl) nameEl.textContent = data.full_name;
    if (courseEl) courseEl.textContent = data.course;
    if (modeEl) modeEl.textContent = `${data.learning_mode} Learning`;
    if (commEl) commEl.textContent = `Via ${data.communication_method}`;

    // Setup direct WhatsApp Admissions chat link
    if (chatBtn) {
      const waMsg = encodeURIComponent(
        `Hello ICT Academy Admissions, my name is ${data.full_name}. I just registered for the ${data.course} training (${data.learning_mode} mode) and would love to get course details right away!`
      );
      chatBtn.href = `https://wa.me/2348000000000?text=${waMsg}`;
    }

    successCard.classList.add('visible');
    successCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
