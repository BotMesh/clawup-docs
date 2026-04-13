(function () {
  var sidebar = document.querySelector('#sidebar, sidebar, [id="sidebar-content"], [data-component-name="sidebar"]');
  if (!sidebar) return;

  var existing = document.querySelector('.sidebar-console-link');
  if (existing) return;

  var link = document.createElement('a');
  link.href = 'https://clawup.org';
  link.className = 'sidebar-console-link';
  link.textContent = 'Back to Console';

  sidebar.insertBefore(link, sidebar.firstChild);
})();
