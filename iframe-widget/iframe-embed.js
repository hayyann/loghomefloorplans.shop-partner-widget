(function () {
  var debounceTimer;

  function postHeight() {
    // scrollHeight captures full content height including filter panel
    // expansions and the product grid after async load
    var height = document.body.scrollHeight;
    window.parent.postMessage({ type: 'fp-resize', height: height }, '*');
  }

  function debouncedPost() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(postHeight, 60);
  }

  // Primary: ResizeObserver fires automatically whenever the body grows or
  // shrinks — covers filter toggle, product load, and grid reflow
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(debouncedPost);
    ro.observe(document.body);
  }

  // Fallback: staggered posts on load to catch async render delays
  // (products fetch, image layout, slow connections)
  function onReady() {
    postHeight();
    setTimeout(postHeight, 500);
    setTimeout(postHeight, 1000);
    setTimeout(postHeight, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
