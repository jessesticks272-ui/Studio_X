/* Shared header search for desktop navigation and the mobile menu.
   Sends the query to Explore, where the existing beat filters render results. */
(function () {
  'use strict';

  function submitSearch(input) {
    const query = input.value.trim();
    const destination = query
      ? 'explore.html?q=' + encodeURIComponent(query)
      : 'explore.html';
    window.location.href = destination;
  }

  function wireSearch(container) {
    const input = container.querySelector('input');
    const button = container.querySelector('button');
    if (!input || !button || container.dataset.searchWired === 'true') return;

    container.dataset.searchWired = 'true';
    input.setAttribute('aria-label', 'Search beats');
    input.setAttribute('autocomplete', 'off');
    button.type = 'button';

    button.addEventListener('click', function () {
      submitSearch(input);
    });

    input.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      submitSearch(input);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.topbar .search-box, .mobile-search').forEach(wireSearch);
  });
})();
