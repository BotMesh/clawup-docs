(function () {
  var scrollbox = document.querySelector('.sidebar .sidebar-scrollbox');
  if (!scrollbox) return;
  var link = document.createElement('a');
  link.href = 'https://clawup.org';
  link.className = 'sidebar-console-link';
  link.textContent = '\u2190 Back to Console';
  scrollbox.insertBefore(link, scrollbox.firstChild);
})();
