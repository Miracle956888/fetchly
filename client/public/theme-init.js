// Apply the saved theme before first paint, including under a strict CSP.
(function () {
  try {
    var saved = localStorage.getItem('fetchly-theme');
    var dark =
      saved === 'dark' ||
      (saved !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {
    // Private mode etc. — fall back to light.
  }
})();
