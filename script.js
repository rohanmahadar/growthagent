/* aiRA marketing site — light interactivity, reduced-motion aware */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- scroll reveal ---- */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      reveals.forEach(function (el) { el.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { threshold: 0.12 });
      reveals.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---- mobile menu (simple toggle of link visibility) ---- */
  var mb = document.querySelector('.menu-btn');
  if (mb) {
    mb.addEventListener('click', function () {
      var links = document.querySelector('.nav .links');
      if (!links) return;
      var open = links.style.display === 'flex';
      links.style.display = open ? '' : 'flex';
      links.style.position = 'absolute'; links.style.top = '64px'; links.style.left = '0';
      links.style.right = '0'; links.style.flexDirection = 'column';
      links.style.background = 'var(--bg-surface)'; links.style.padding = '16px 24px';
      links.style.borderBottom = '1px solid var(--border-default)';
      links.style.gap = '4px';
    });
  }

  /* ---- hero: agent count-up (bloom is CSS-only) ---- */
  var counterEl = document.getElementById('jcount');
  if (counterEl) {
    var TARGET = 247;
    if (reduce) {
      counterEl.textContent = TARGET;
    } else {
      var c = 0, stepN = Math.ceil(TARGET / 55);
      var cv = setInterval(function () {
        c += stepN;
        if (c >= TARGET) { c = TARGET; clearInterval(cv); }
        counterEl.textContent = c;
      }, 26);
    }
  }
})();
