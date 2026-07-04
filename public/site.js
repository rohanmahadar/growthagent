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

  /* ---------- Capability demo loops (index §1.6) ----------
     Six looping storyboard panels inside the capabilities tabs.
     Reuses the site's motion vocabulary: staggered row fades
     (hero chat), drawn connector lines (architecture diagram)
     and count-ups (metrics band). Panels are "armed" only when
     the loop can actually run; otherwise the CSS renders each
     storyboard's final resting frame (no-JS / reduced motion).
     Only the visible panel plays: an IntersectionObserver
     starts/stops each loop when its panel is shown/hidden or
     scrolled out of view, and page visibility pauses them. */
  var capDemos = Array.prototype.slice.call(document.querySelectorAll('.cap-demo[data-cap-demo]'));
  if (capDemos.length && !reduceMotion && 'IntersectionObserver' in window) {
    var cdQ = function (root, name) { return root.querySelector('[data-cd="' + name + '"]'); };
    var cdOn = function (el) { if (el) el.classList.add('is-on'); };
    var cdOff = function (el) { if (el) el.classList.remove('is-on'); };
    var cdPulse = function (el) {
      if (!el) return;
      el.classList.remove('is-pulse');
      el.getBoundingClientRect(); // restart the one-shot pulse animation
      el.classList.add('is-pulse');
    };
    var cdClear = function (root) {
      Array.prototype.slice.call(root.querySelectorAll('.is-on, .is-pulse, .is-drawn, .is-glow')).forEach(function (el) {
        el.classList.remove('is-on');
        el.classList.remove('is-pulse');
        el.classList.remove('is-drawn');
        el.classList.remove('is-glow');
      });
    };
    var cdCount = function (el, target, suffix, dur) {
      if (!el) return;
      if (el._cdRaf) cancelAnimationFrame(el._cdRaf);
      var start = null;
      var frame = function (ts) {
        if (start === null) start = ts;
        var t = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - t, 3); // same ease-out cubic as the metrics band
        el.textContent = (target * eased).toFixed(1) + suffix;
        el._cdRaf = t < 1 ? requestAnimationFrame(frame) : null;
      };
      el._cdRaf = requestAnimationFrame(frame);
    };
    var cdStopCount = function (el) {
      if (el && el._cdRaf) { cancelAnimationFrame(el._cdRaf); el._cdRaf = null; }
    };

    /* Each builder returns { steps:[[ms, fn]…], total, reset }.
       total = start of the soft reset (≥2s after the last beat). */
    var cdBuilders = {

      /* 1 · brief typed → plan rows → approval pill (hero chat miniature) */
      chat: function (root) {
        var input = cdQ(root, 'input');
        var typed = cdQ(root, 'typed');
        var brief = 'Win back customers we lost this year';
        var steps = [[0, function () { cdOn(input); }]];
        for (var i = 0; i < brief.length; i++) {
          (function (n) {
            steps.push([500 + Math.round(n * (1600 / brief.length)), function () {
              input.classList.add('is-typing');
              typed.textContent = brief.slice(0, n + 1);
            }]);
          })(i);
        }
        steps.push([2400, function () { cdOff(input); cdOn(cdQ(root, 'sent')); }]);
        steps.push([2700, function () { cdOn(cdQ(root, 'think')); }]);
        steps.push([4100, function () { cdOff(cdQ(root, 'think')); cdOn(cdQ(root, 'planhead')); }]);
        steps.push([4500, function () { cdOn(cdQ(root, 'row1')); }]);
        steps.push([4900, function () { cdOn(cdQ(root, 'row2')); }]);
        steps.push([5300, function () { cdOn(cdQ(root, 'row3')); }]);
        steps.push([5900, function () { cdOn(cdQ(root, 'approve')); }]);
        return {
          steps: steps,
          total: 8900,
          reset: function () {
            cdClear(root);
            typed.textContent = '';
            input.classList.remove('is-typing');
          }
        };
      },

      /* 2 · goal fans out to three agents; the clock runs into the night */
      agents: function (root) {
        var clock = cdQ(root, 'clock');
        var t1 = clock.getAttribute('data-t1');
        var t2 = clock.getAttribute('data-t2');
        var t3 = clock.getAttribute('data-t3');
        return {
          steps: [
            [0, function () { cdOn(cdQ(root, 'goal')); cdOn(clock); }],
            [800, function () { cdQ(root, 'fan').classList.add('is-drawn'); cdOn(cdQ(root, 'a1')); }],
            [1100, function () { cdOn(cdQ(root, 'a2')); }],
            [1400, function () { cdOn(cdQ(root, 'a3')); }],
            [2500, function () { clock.textContent = t2; root.classList.add('is-dusk'); }],
            [4000, function () { clock.textContent = t3; root.classList.remove('is-dusk'); root.classList.add('is-night'); }],
            [5200, function () { cdOn(cdQ(root, 'act')); }],
            [6200, function () { cdOn(cdQ(root, 'cap')); }]
          ],
          total: 9900,
          reset: function () {
            cdClear(root);
            root.classList.remove('is-dusk');
            root.classList.remove('is-night');
            clock.textContent = t1;
          }
        };
      },

      /* 3 · four sources feed one live picture that cites its sources */
      context: function (root) {
        var lines = cdQ(root, 'lines');
        return {
          steps: [
            [0, function () { cdOn(cdQ(root, 's1')); }],
            [200, function () { cdOn(cdQ(root, 's2')); }],
            [400, function () { cdOn(cdQ(root, 's3')); }],
            [600, function () { cdOn(cdQ(root, 's4')); }],
            [1200, function () { cdOn(cdQ(root, 'card')); lines.classList.add('is-drawn'); }],
            [2200, function () { cdOn(cdQ(root, 'f1')); cdPulse(cdQ(root, 's1')); cdPulse(cdQ(root, 'l1')); }],
            [2600, function () { cdOn(cdQ(root, 'f2')); cdPulse(cdQ(root, 's2')); cdPulse(cdQ(root, 'l2')); }],
            [3000, function () { cdOn(cdQ(root, 'f3')); cdPulse(cdQ(root, 's3')); cdPulse(cdQ(root, 'l3')); }],
            [5000, function () { cdOn(cdQ(root, 'f4')); cdPulse(cdQ(root, 's4')); cdPulse(cdQ(root, 'l4')); }],
            [6000, function () { cdOn(cdQ(root, 'suggest')); lines.classList.add('is-glow'); }]
          ],
          total: 10400,
          reset: function () { cdClear(root); }
        };
      },

      /* 4 · approved plan writes work into three tools + one human handoff */
      actions: function (root) {
        return {
          steps: [
            [0, function () { cdOn(cdQ(root, 'pill')); }],
            [800, function () { cdOn(cdQ(root, 'r1')); }],
            [1600, function () { cdOn(cdQ(root, 'r2')); }],
            [2400, function () { cdOn(cdQ(root, 'r3')); }],
            [3200, function () { cdOn(cdQ(root, 'r4')); }],
            [4400, function () { cdOn(cdQ(root, 'cap')); }]
          ],
          total: 8900,
          reset: function () { cdClear(root); }
        };
      },

      /* 5 · two actions run inside the rules; one stops at the gate */
      gov: function (root) {
        var btn = cdQ(root, 'btn');
        return {
          steps: [
            [0, function () { cdOn(cdQ(root, 'rule')); }],
            [800, function () { cdOn(cdQ(root, 'g1')); }],
            [1800, function () { cdOn(cdQ(root, 'g2')); }],
            [2800, function () { cdOn(cdQ(root, 'g3')); cdOn(cdQ(root, 'wait')); cdQ(root, 'govline').classList.add('is-drawn'); }],
            [4600, function () { cdOn(btn); }],
            [5400, function () { btn.classList.add('is-pressed'); }],
            [5800, function () { cdOff(cdQ(root, 'wait')); cdOn(cdQ(root, 'ok3')); cdOff(btn); }],
            [6600, function () { cdOn(cdQ(root, 'st1')); }],
            [6800, function () { cdOn(cdQ(root, 'st2')); }],
            [7000, function () { cdOn(cdQ(root, 'st3')); }]
          ],
          total: 10900,
          reset: function () {
            cdClear(root);
            btn.classList.remove('is-pressed');
          }
        };
      },

      /* 6 · two offers race; budget moves to the winner (count-up bars) */
      optimize: function (root) {
        var barA = cdQ(root, 'barA');
        var barB = cdQ(root, 'barB');
        var valA = cdQ(root, 'valA');
        var valB = cdQ(root, 'valB');
        return {
          steps: [
            [0, function () { cdOn(cdQ(root, 'head')); cdOn(barA); cdOn(barB); }],
            [800, function () {
              barA.classList.add('is-grow');
              barB.classList.add('is-grow');
              cdCount(valA, 14.9, '% won back', 1600);
              cdCount(valB, 6.4, '% won back', 1600);
            }],
            [3600, function () { cdOn(cdQ(root, 'r1')); barA.classList.add('is-scaled'); }],
            [5000, function () { cdOn(cdQ(root, 'r2')); barB.classList.add('is-dim'); }],
            [6400, function () { cdOn(cdQ(root, 'cap')); }]
          ],
          total: 10400,
          reset: function () {
            cdClear(root);
            barA.classList.remove('is-grow');
            barA.classList.remove('is-scaled');
            barB.classList.remove('is-grow');
            barB.classList.remove('is-dim');
            cdStopCount(valA);
            cdStopCount(valB);
            valA.textContent = '';
            valB.textContent = '';
          }
        };
      }
    };

    var cdRunners = [];
    capDemos.forEach(function (root) {
      var build = cdBuilders[root.getAttribute('data-cap-demo')];
      if (!build) return;
      var api = build(root);
      root.classList.add('is-armed');
      api.reset();
      var timers = [];
      var playing = false;
      var inView = false;
      function clearTimers() {
        timers.forEach(clearTimeout);
        timers = [];
      }
      function cycle() {
        api.steps.forEach(function (step) {
          timers.push(setTimeout(step[1], step[0]));
        });
        // hold done → 0.6s soft cross-fade back to beat 1
        timers.push(setTimeout(function () {
          root.classList.add('is-fading');
          timers.push(setTimeout(function () {
            api.reset();
            timers.push(setTimeout(function () {
              root.classList.remove('is-fading');
              cycle();
            }, 280));
          }, 320));
        }, api.total));
      }
      var runner = {
        root: root,
        sync: function () {
          var shouldPlay = inView && !document.hidden;
          if (shouldPlay && !playing) {
            playing = true;
            api.reset();
            cycle();
          } else if (!shouldPlay && playing) {
            playing = false;
            clearTimers();
            root.classList.remove('is-fading');
            api.reset();
          }
        },
        setInView: function (v) { inView = v; runner.sync(); }
      };
      cdRunners.push(runner);
    });

    if (cdRunners.length) {
      var cdIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          cdRunners.forEach(function (r) {
            if (r.root === entry.target) r.setInView(entry.isIntersecting);
          });
        });
      }, { threshold: 0.25 });
      cdRunners.forEach(function (r) { cdIO.observe(r.root); });
      document.addEventListener('visibilitychange', function () {
        cdRunners.forEach(function (r) { r.sync(); });
      });
    }
  }

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
