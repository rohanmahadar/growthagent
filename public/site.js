/* ask-aira.com — shared behavior
   Nav, dropdown, mobile menu, scroll reveal, SVG draws, count-ups,
   tabs, hero chat sequencing, scroll tour, book-a-demo form. */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) root.classList.add('no-motion');

  /* ---------- Nav: scrolled state ---------- */
  var nav = document.querySelector('.nav');
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle('nav--scrolled', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Solutions dropdown ---------- */
  var dd = document.querySelector('.nav__dd');
  if (dd) {
    var ddBtn = dd.querySelector('.nav__dd-btn');
    var ddPanel = dd.querySelector('.nav__dd-panel');
    var ddLinks = Array.prototype.slice.call(ddPanel.querySelectorAll('a'));

    var setOpen = function (open) {
      dd.classList.toggle('is-open', open);
      ddBtn.setAttribute('aria-expanded', String(open));
    };
    ddBtn.addEventListener('click', function () {
      setOpen(!dd.classList.contains('is-open'));
    });
    ddBtn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); ddLinks[0].focus(); }
    });
    ddPanel.addEventListener('keydown', function (e) {
      var i = ddLinks.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); ddLinks[Math.min(i + 1, ddLinks.length - 1)].focus(); }
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (i <= 0) { setOpen(false); ddBtn.focus(); } else { ddLinks[i - 1].focus(); }
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && dd.classList.contains('is-open')) { setOpen(false); ddBtn.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (!dd.contains(e.target)) setOpen(false);
    });
    dd.addEventListener('focusout', function () {
      requestAnimationFrame(function () {
        if (!dd.contains(document.activeElement)) setOpen(false);
      });
    });
  }

  /* ---------- Mobile menu ---------- */
  var burger = document.querySelector('.nav__burger');
  var mobile = document.getElementById('mobile-menu');
  if (burger && mobile) {
    var setMenu = function (open) {
      mobile.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('menu-open', open);
    };
    burger.addEventListener('click', function () {
      setMenu(!mobile.classList.contains('is-open'));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobile.classList.contains('is-open')) {
        setMenu(false);
        burger.focus();
      }
    });
  }

  /* ---------- Logo marquee pause/play (WCAG 2.2.2) ---------- */
  var logosBand = document.querySelector('.logos');
  var logosPause = document.querySelector('.logos__pause');
  if (logosBand && logosPause) {
    logosPause.addEventListener('click', function () {
      var paused = logosBand.classList.toggle('is-paused');
      logosPause.setAttribute('aria-pressed', String(paused));
      logosPause.textContent = paused ? 'Play animation' : 'Pause animation';
    });
  }

  /* ---------- Scroll reveal + SVG draws + count-ups ---------- */
  var revealEls = document.querySelectorAll('[data-reveal],[data-reveal-stagger],[data-draw],.compare--with');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) {
      el.classList.add('is-in');
      if (el.hasAttribute('data-draw')) el.classList.add('is-drawn');
    });
    document.querySelectorAll('[data-count]').forEach(function (el) {
      el.textContent = el.getAttribute('data-count');
    });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add('is-in');
        if (el.hasAttribute('data-draw')) el.classList.add('is-drawn');
        el.querySelectorAll('[data-count]').forEach(countUp);
        io.unobserve(el);
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { io.observe(el); });

    // count-ups not inside a reveal container
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        countUp(entry.target);
        cio.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    document.querySelectorAll('[data-count]').forEach(function (el) {
      if (!el.closest('[data-reveal],[data-reveal-stagger]')) cio.observe(el);
    });
  }

  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    var target = parseFloat(el.getAttribute('data-count'));
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    if (isNaN(target)) return;
    var start = null;
    var dur = 1200;
    function frame(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      el.textContent = (target * eased).toFixed(decimals);
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = target.toFixed(decimals).replace(/\.0$/, decimals ? '' : '');
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Hero chat sequencing ---------- */
  var chat = document.querySelector('.mock-chat');
  if (chat && !reduceMotion) {
    var userMsg = chat.querySelector('.msg--user');
    var airaMsg = chat.querySelector('.msg--aira');
    var rows = chat.querySelectorAll('.plan-row');
    setTimeout(function () { if (userMsg) userMsg.classList.add('is-in'); }, 200);
    setTimeout(function () { if (airaMsg) airaMsg.classList.add('is-in'); }, 600);
    rows.forEach(function (row, i) {
      setTimeout(function () { row.classList.add('is-in'); }, 900 + i * 90);
    });
  } else if (chat) {
    chat.querySelectorAll('.msg,.plan-row').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Tabs (capabilities) ---------- */
  document.querySelectorAll('[data-tabs]').forEach(function (widget) {
    var tabs = Array.prototype.slice.call(widget.querySelectorAll('[role="tab"]'));
    var panels = Array.prototype.slice.call(widget.querySelectorAll('[role="tabpanel"]'));

    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p) {
        var on = p.id === tab.getAttribute('aria-controls');
        p.hidden = !on;
        if (on && !reduceMotion) {
          p.classList.remove('is-entering');
          void p.offsetWidth;
          p.classList.add('is-entering');
        }
      });
      if (focus) tab.focus();
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var i = tabs.indexOf(tab);
        var next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });
  });

  /* ---------- Sticky scroll tour (how-it-works) ---------- */
  var tour = document.querySelector('.tour');
  if (tour && !reduceMotion && 'IntersectionObserver' in window) {
    var steps = Array.prototype.slice.call(tour.querySelectorAll('.tour__step'));
    var tourPanels = Array.prototype.slice.call(tour.querySelectorAll('.tour-panel'));
    var mq = window.matchMedia('(max-width: 980px)');
    var activate = function (idx) {
      tourPanels.forEach(function (p, i) { p.classList.toggle('is-active', i === idx); });
      steps.forEach(function (s, i) {
        var b = s.querySelector('.step-badge');
        if (b) b.classList.toggle('is-active', i === idx);
      });
    };
    if (steps.length && tourPanels.length) {
      activate(0);
      var tio = new IntersectionObserver(function (entries) {
        if (mq.matches) return; // static layout on tablet/mobile
        entries.forEach(function (entry) {
          if (entry.isIntersecting) activate(steps.indexOf(entry.target));
        });
      }, { rootMargin: '-45% 0px -45%' });
      steps.forEach(function (s) { tio.observe(s); });
    }
  } else if (tour) {
    tour.querySelectorAll('.tour-panel').forEach(function (p) { p.classList.add('is-active'); });
  }

  /* ---------- Book-a-demo form ---------- */
  var form = document.getElementById('demo-form');
  if (form) {
    var card = form.closest('.form-card');
    var submitBtn = form.querySelector('button[type="submit"]');
    var attempted = false;

    var MESSAGES = {
      first_name: 'Please enter your name.',
      last_name: 'Please enter your name.',
      email_required: 'Please enter your work email.',
      email_invalid: 'Please enter a valid work email address.',
      company: 'Please enter your company name.',
      select: 'Please choose an option.',
      generic: 'This field is required.'
    };
    var GENERIC_FAIL = "Something went wrong on our side and your request wasn't sent. Please try again — or write to us at hello@ask-aira.com and we'll set it up directly.";
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var FREE_MAIL = /@(gmail|googlemail|yahoo|hotmail|outlook|live|msn|aol|icloud|me|proton|protonmail|mail|gmx|zoho|yandex|rediffmail)\./i;

    function fieldWrap(input) { return input.closest('.field'); }

    function setError(input, msg) {
      var wrap = fieldWrap(input);
      if (!wrap) return;
      clearError(input);
      wrap.classList.add('field--error');
      input.setAttribute('aria-invalid', 'true');
      var id = input.id + '-error';
      var p = document.createElement('p');
      p.className = 'field__msg';
      p.id = id;
      p.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg><span></span>';
      p.querySelector('span').textContent = msg;
      wrap.appendChild(p);
      input.setAttribute('aria-describedby', id);
    }

    function clearError(input) {
      var wrap = fieldWrap(input);
      if (!wrap) return;
      wrap.classList.remove('field--error');
      input.removeAttribute('aria-invalid');
      var msg = wrap.querySelector('.field__msg');
      if (msg) msg.remove();
      input.removeAttribute('aria-describedby');
    }

    function validateField(input) {
      var name = input.name;
      var val = input.value.trim();
      if (name === 'website') return true; // honeypot — never validated
      var required = input.hasAttribute('required');
      if (required && !val) {
        if (name === 'email') setError(input, MESSAGES.email_required);
        else if (name === 'first_name' || name === 'last_name') setError(input, MESSAGES[name]);
        else if (name === 'company') setError(input, MESSAGES.company);
        else if (input.tagName === 'SELECT') setError(input, MESSAGES.select);
        else setError(input, MESSAGES.generic);
        return false;
      }
      if (name === 'email' && val && !EMAIL_RE.test(val)) {
        setError(input, MESSAGES.email_invalid);
        return false;
      }
      clearError(input);
      return true;
    }

    var emailInput = form.querySelector('[name="email"]');
    var emailHint = null;
    if (emailInput) {
      // Persistent polite live region so the nudge is announced when it appears
      emailHint = document.createElement('p');
      emailHint.className = 'field__hint';
      emailHint.setAttribute('aria-live', 'polite');
      fieldWrap(emailInput).appendChild(emailHint);
    }
    function softNudge() {
      if (!emailInput || !emailHint) return;
      var val = emailInput.value.trim();
      var isFree = val && EMAIL_RE.test(val) && FREE_MAIL.test(val);
      emailHint.textContent = isFree ? 'Please use your work email' : '';
    }
    if (emailInput) {
      emailInput.addEventListener('blur', softNudge);
      emailInput.addEventListener('input', function () { if (emailHint.textContent) softNudge(); });
    }

    var inputs = Array.prototype.slice.call(form.querySelectorAll('input:not([name="website"]), select, textarea'));
    inputs.forEach(function (input) {
      input.addEventListener('blur', function () { if (attempted) validateField(input); });
    });

    function showBanner(text) {
      removeBanner();
      var div = document.createElement('div');
      div.className = 'form-banner';
      div.setAttribute('role', 'alert');
      div.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg><span></span>';
      div.querySelector('span').textContent = text;
      form.insertBefore(div, form.firstChild);
      div.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    function removeBanner() {
      var b = form.querySelector('.form-banner');
      if (b) b.remove();
    }

    function showSuccess() {
      var success = document.createElement('div');
      success.className = 'form-success';
      success.setAttribute('role', 'status');
      success.innerHTML =
        '<div class="ok-circle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg></div>' +
        '<h3 tabindex="-1">Thank you — your demo request is in.</h3>' +
        '<p>A member of the aiRA team will reach out within one business day to schedule your walkthrough. To make the session count, have a growth goal and a rough list of the systems you run ready — that’s all we need to make it concrete.</p>' +
        '<a class="btn--ghost" href="/">← Back to home</a>';
      var heading = card.querySelector('h2');
      if (heading) heading.remove();
      form.replaceWith(success);
      success.querySelector('h3').focus();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      attempted = true;
      removeBanner();

      var valid = true;
      var firstInvalid = null;
      inputs.forEach(function (input) {
        if (!validateField(input) && valid !== false) { /* keep order */ }
        if (fieldWrap(input) && fieldWrap(input).classList.contains('field--error')) {
          valid = false;
          if (!firstInvalid) firstInvalid = input;
        }
      });
      if (!valid) { if (firstInvalid) firstInvalid.focus(); return; }

      var payload = {
        first_name: form.first_name.value.trim(),
        last_name: form.last_name.value.trim(),
        email: form.email.value.trim(),
        company: form.company.value.trim(),
        role: form.role.value.trim(),
        company_size: form.company_size.value,
        interest: form.interest.value,
        message: form.message.value.trim(),
        website: form.website.value
      };

      var label = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';

      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (res.ok && data.ok) { showSuccess(); return; }
          submitBtn.disabled = false;
          submitBtn.textContent = label;
          if (res.status === 422 && data.errors) {
            Object.keys(data.errors).forEach(function (name) {
              var input = form.querySelector('[name="' + name + '"]');
              if (input) setError(input, data.errors[name]);
            });
            var first = form.querySelector('.field--error input, .field--error select, .field--error textarea');
            if (first) first.focus();
          } else if (res.status === 429 && data.error) {
            // Rate-limit responses carry a server-provided message worth showing
            showBanner(data.error);
          } else {
            showBanner(GENERIC_FAIL);
          }
        });
      }).catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = label;
        showBanner(GENERIC_FAIL);
      });
    });
  }
})();
