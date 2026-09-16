/**
 * Admin Login Page Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect directly to dashboard
  checkExistingSession();

  const form = document.getElementById('adminLoginForm');
  const alertEl = document.getElementById('loginAlert');
  const loginBtn = document.getElementById('loginBtn');
  const passwordInput = document.getElementById('password');
  const togglePassBtn = document.getElementById('togglePasswordBtn');

  // Toggle password visibility
  if (togglePassBtn && passwordInput) {
    togglePassBtn.addEventListener('click', () => {
      const isPass = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPass ? 'text' : 'password');
    });
  }

  // Handle Login Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      showAlert('Please enter both your username/email and password.');
      return;
    }

    const origBtnHtml = loginBtn.innerHTML;
    loginBtn.disabled = true;
    loginBtn.innerHTML = `
      <span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;border-radius:50%;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;animation:spin 0.8s linear infinite;" aria-hidden="true"></span>
      <span>Authenticating...</span>
    `;

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.token) {
          setAuthToken(data.token);
        }
        window.location.href = '/admin/dashboard';
      } else {
        showAlert(data.message || 'Invalid username/email or password.');
        loginBtn.disabled = false;
        loginBtn.innerHTML = origBtnHtml;
      }
    } catch (err) {
      console.error('Login network error:', err);
      showAlert('Unable to connect to the authentication server. Please check your connection.');
      loginBtn.disabled = false;
      loginBtn.innerHTML = origBtnHtml;
    }
  });

  function showAlert(msg) {
    if (alertEl) {
      alertEl.textContent = msg;
      alertEl.classList.add('visible');
    }
  }

  function hideAlert() {
    if (alertEl) {
      alertEl.classList.remove('visible');
      alertEl.textContent = '';
    }
  }

  async function checkExistingSession() {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch('/api/admin/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        window.location.href = '/admin/dashboard';
      }
    } catch (e) {
      // Ignore
    }
  }
});
