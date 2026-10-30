/* LyTune Market page interactions.
   The live catalog is the Explore page. Search is routed there with a
   query string so the marketplace never renders invented listings. */
(function () {
  function initMarketSearch() {
    const input = document.getElementById("marketSearchInput");
    const button = document.getElementById("marketSearchButton");
    if (!input || !button) return;

    function openResults() {
      const query = input.value.trim();
      const destination = query
        ? "explore.html?q=" + encodeURIComponent(query)
        : "explore.html";
      window.location.href = destination;
    }

    button.addEventListener("click", openResults);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        openResults();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMarketSearch, { once: true });
  } else {
    initMarketSearch();
  }
})();
