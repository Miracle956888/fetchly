/**
 * Input validation and sanitization utilities
 */

// Email regex according to HTML5 and RFC standards
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Phone validator: supports Nigerian formats (080..., 081..., 070..., 090..., 091..., +234..., 234...) and international numbers (+...)
const NIGERIAN_PHONE_REGEX = /^(?:\+?234|0)[789][01]\d{8}$/;
const GENERAL_PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;

const VALID_LEARNING_MODES = ['Physical', 'Online'];
const VALID_COMMUNICATION_METHODS = ['WhatsApp', 'Phone Call', 'Email', 'SMS'];
const VALID_REFERRAL_SOURCES = ['Facebook', 'Instagram', 'Google', 'Friend or Family', 'WhatsApp', 'Other'];
const VALID_STATUSES = ['New', 'Contacted', 'Interested', 'Enrolled', 'Not Interested', 'Follow Up', 'Closed'];

/**
 * Sanitize plain string (strip dangerous characters, trim)
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim();
}

/**
 * Validate phone number
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleanPhone = phone.trim().replace(/[\s\-()]/g, '');
  if (cleanPhone.length < 7 || cleanPhone.length > 20) return false;
  // Test either specific Nigerian format or general international format
  return NIGERIAN_PHONE_REGEX.test(cleanPhone) || GENERAL_PHONE_REGEX.test(phone.trim());
}

/**
 * Normalize phone number for consistent database storage & WhatsApp links
 */
function normalizePhone(phone) {
  if (!phone) return '';
  let clean = phone.trim().replace(/[\s\-()]/g, '');
  if (clean.startsWith('0') && clean.length === 11) {
    clean = '+234' + clean.slice(1);
  } else if (clean.startsWith('234') && !clean.startsWith('+')) {
    clean = '+' + clean;
  } else if (!clean.startsWith('+') && clean.length >= 10) {
    clean = '+' + clean;
  }
  return clean;
}

/**
 * Validate public lead submission form
 */
function validateLeadSubmission(data) {
  const errors = {};

  // 1. Full Name
  const fullName = sanitizeString(data.full_name);
  if (!fullName) {
    errors.full_name = 'Please enter your full name.';
  } else if (fullName.length < 2) {
    errors.full_name = 'Full name must be at least 2 characters.';
  } else if (fullName.length > 150) {
    errors.full_name = 'Full name cannot exceed 150 characters.';
  }

  // 2. Phone / WhatsApp Number
  const phone = sanitizeString(data.phone);
  if (!phone) {
    errors.phone = 'Please enter your phone/WhatsApp number.';
  } else if (!isValidPhone(phone)) {
    errors.phone = 'Please enter a valid phone/WhatsApp number (e.g. 08012345678 or +234...).';
  }

  // 3. Email Address
  const email = sanitizeString(data.email).toLowerCase();
  if (!email) {
    errors.email = 'Please enter your email address.';
  } else if (!EMAIL_REGEX.test(email) || email.length > 150) {
    errors.email = 'Please enter a valid email address.';
  }

  // 4. Course
  const course = sanitizeString(data.course);
  if (!course) {
    errors.course = 'Please select an ICT course.';
  } else if (course.length > 100) {
    errors.course = 'Invalid course selected.';
  }

  // 5. Preferred Learning Mode
  const learningMode = sanitizeString(data.learning_mode);
  if (!learningMode) {
    errors.learning_mode = 'Please select your preferred learning mode.';
  } else if (!VALID_LEARNING_MODES.includes(learningMode)) {
    errors.learning_mode = 'Learning mode must be either Physical or Online.';
  }

  // 6. Preferred Means of Communication
  const communicationMethod = sanitizeString(data.communication_method);
  if (!communicationMethod) {
    errors.communication_method = 'Please select your preferred means of communication.';
  } else if (!VALID_COMMUNICATION_METHODS.includes(communicationMethod)) {
    errors.communication_method = 'Please select a valid communication method (WhatsApp, Phone Call, Email, or SMS).';
  }

  // 7. Referral Source
  const referralSource = sanitizeString(data.referral_source);
  if (!referralSource) {
    errors.referral_source = 'Please let us know how you heard about us.';
  } else if (!VALID_REFERRAL_SOURCES.includes(referralSource)) {
    errors.referral_source = 'Invalid referral source selected.';
  }

  // Referral Other
  let referralOther = sanitizeString(data.referral_other);
  if (referralSource === 'Other' && !referralOther) {
    errors.referral_other = 'Please specify where you heard about us.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      full_name: fullName,
      phone: phone,
      email: email,
      course: course,
      learning_mode: learningMode,
      communication_method: communicationMethod,
      referral_source: referralSource,
      referral_other: referralSource === 'Other' ? referralOther : null
    }
  };
}

module.exports = {
  isValidPhone,
  normalizePhone,
  validateLeadSubmission,
  sanitizeString,
  VALID_LEARNING_MODES,
  VALID_COMMUNICATION_METHODS,
  VALID_REFERRAL_SOURCES,
  VALID_STATUSES
};
