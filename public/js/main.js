/**
 * ICT Course Lead Generation System - Form Logic
 * Vanilla JavaScript (No React/Vue/Angular)
 */

document.addEventListener('DOMContentLoaded', () => {
  initCourseCatalog();
  initLeadForm();
});

// Fetch Active Courses from Backend & Populate Dropdown
async function initCourseCatalog() {
  const courseSelect = document.getElementById('course');

  try {
    const response = await fetch('/api/courses');
    if (!response.ok) throw new Error('Failed to load courses');
    const data = await response.json();

    if (data.success && Array.isArray(data.courses) && data.courses.length > 0) {
      populateCourseSelect(data.courses, courseSelect);
    }
  } catch (err) {
    console.error('Error fetching courses:', err);
  }
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

// Lead Form Validation & Submission
function initLeadForm() {
  const form = document.getElementById('leadRegistrationForm');
  const referralSelect = document.getElementById('referral_source');
  const referralOtherGroup = document.getElementById('referralOtherContainer');
  const referralOtherInput = document.getElementById('referral_other');
  const submitBtn = document.getElementById('submitLeadBtn');
  const successCard = document.getElementById('successCard');
  const submitAnotherBtn = document.getElementById('submitAnotherBtn');

  // Radio button card styling for learning modes
  const modeOptions = document.querySelectorAll('.mode-option');
  modeOptions.forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    if (radio && radio.checked) card.classList.add('active');

    card.addEventListener('click', () => {
      modeOptions.forEach(c => c.classList.remove('active'));
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

  // Clear errors on user input
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

    // 2. Prevent duplicate accidental submissions & Show loading state
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
      showFormAlert('A network error occurred. Please check your connection and try again.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });

  // Reset & submit another inquiry button
  if (submitAnotherBtn) {
    submitAnotherBtn.addEventListener('click', () => {
      form.reset();
      modeOptions.forEach(c => c.classList.remove('active'));
      const firstRadio = document.querySelector('input[name="learning_mode"][value="Physical"]');
      if (firstRadio) {
        firstRadio.checked = true;
        firstRadio.closest('.mode-option').classList.add('active');
      }
      if (referralOtherGroup) referralOtherGroup.classList.remove('visible');
      successCard.classList.remove('visible');
      form.style.display = 'flex';
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <span>Get Course Details</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      `;
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

  // 2. Phone / WhatsApp Number
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
  const parent = field.closest('.form-group');
  const errorContainer = parent ? parent.querySelector('.error-message') : null;
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.classList.add('visible');
  }
}

function clearFieldError(field) {
  field.classList.remove('is-invalid');
  const parent = field.closest('.form-group');
  const errorContainer = parent ? parent.querySelector('.error-message') : null;
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
    const nameEl = document.getElementById('summaryName');
    const courseEl = document.getElementById('summaryCourse');
    const modeEl = document.getElementById('summaryMode');
    const commEl = document.getElementById('summaryComm');
    const chatBtn = document.getElementById('whatsappChatBtn');

    if (nameEl) nameEl.textContent = data.full_name;
    if (courseEl) courseEl.textContent = data.course;
    if (modeEl) modeEl.textContent = `${data.learning_mode} Campus`;
    if (commEl) commEl.textContent = `Via ${data.communication_method}`;

    // Direct WhatsApp admissions advisor link
    if (chatBtn) {
      const waMsg = encodeURIComponent(
        `Hello ICT Academy Admissions, my name is ${data.full_name}. I just submitted my inquiry for the ${data.course} training (${data.learning_mode} mode) and would like to get course details right away!`
      );
      chatBtn.href = `https://wa.me/2348034567890?text=${waMsg}`;
    }

    successCard.classList.add('visible');
    successCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
