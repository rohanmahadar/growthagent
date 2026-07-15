/* aiRA — site behaviors + interactive demo engine (branch: aira-design-inspired)
   Built from research/redo/build-spec.md. From scratch; shares nothing with the old site. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Nav ---------------- */
  var burger = document.querySelector('.nav__burger');
  if (burger) {
    burger.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', String(open));
    });
    document.querySelectorAll('.nav__sheet a').forEach(function (a) {
      a.addEventListener('click', function () {
        document.body.classList.remove('nav-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------------- Hero entrance spring ---------------- */
  var hero = document.querySelector('.hero');
  if (hero) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { hero.classList.add('is-loaded'); });
    });
  }

  /* ---------------- Scroll reveals (+ count-ups) ---------------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));

  function runCountUps(scope) {
    var els = (scope || document).querySelectorAll('[data-count]');
    Array.prototype.forEach.call(els, function (el) {
      if (el.dataset.counted) return;
      el.dataset.counted = '1';
      var target = parseFloat(el.getAttribute('data-count'));
      var prefix = el.getAttribute('data-prefix') || '';
      var suffix = el.getAttribute('data-suffix') || '';
      var decimals = (String(el.getAttribute('data-count')).split('.')[1] || '').length;
      if (reduceMotion || target === 0) {
        el.textContent = prefix + target.toFixed(decimals) + suffix;
        return;
      }
      var start = null, dur = 800;
      function tick(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  function revealIn(el) {
    if (el.classList.contains('is-in')) return;
    el.classList.add('is-in');
    runCountUps(el);
  }

  if ('IntersectionObserver' in window && !reduceMotion) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { revealIn(entry.target); ro.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -15% 0px' });
    revealEls.forEach(function (el) { ro.observe(el); });
  } else {
    revealEls.forEach(revealIn);
  }
  /* Safety net — content must NEVER stay hidden */
  setTimeout(function () {
    revealEls.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) revealIn(el);
    });
  }, 1800);
  setTimeout(function () { revealEls.forEach(revealIn); }, 6000);

  /* ---------------- Systems marquee (seamless wrap) ---------------- */
  var track = document.querySelector('[data-marquee]');
  if (track) {
    var clone = track.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.parentNode.appendChild(clone);
  }

  /* ---------------- FAQ accordion ---------------- */
  var faqItems = Array.prototype.slice.call(document.querySelectorAll('.faq__item'));
  faqItems.forEach(function (item) {
    var q = item.querySelector('.faq__q');
    var a = item.querySelector('.faq__a');
    q.addEventListener('click', function () {
      var isOpen = item.classList.contains('is-open');
      faqItems.forEach(function (other) {
        if (other !== item && other.classList.contains('is-open')) {
          other.classList.remove('is-open');
          other.querySelector('.faq__q').setAttribute('aria-expanded', 'false');
          other.querySelector('.faq__a').style.height = '0px';
        }
      });
      if (isOpen) {
        a.style.height = a.scrollHeight + 'px'; // fix height before collapsing
        requestAnimationFrame(function () { a.style.height = '0px'; });
        item.classList.remove('is-open');
        q.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('is-open');
        q.setAttribute('aria-expanded', 'true');
        a.style.height = a.scrollHeight + 'px';
        a.addEventListener('transitionend', function fin(e) {
          if (e.propertyName === 'height' && item.classList.contains('is-open')) a.style.height = 'auto';
          a.removeEventListener('transitionend', fin);
        });
      }
    });
  });

  /* ================= Interactive demo ================= */
  var app = document.getElementById('demo-app');
  if (!app) return;

  var STEPS = ['Signal', 'Plan', 'Approve', 'Outcome'];
  var state = { data: null, vertical: null, step: 1, maxStep: 1, started: false, gatedChoice: null };
  var renderGen = 0; // bumped on every render; orphaned timers check it and die

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function v() {
    var id = state.vertical;
    return state.data.verticals.filter(function (x) { return x.id === id; })[0];
  }

  /* ---- Skeleton ---- */
  function renderSkeleton() {
    var chips = state.data.verticals.map(function (x) {
      return '<button class="demo-picker__chip" role="tab" aria-selected="' +
        (x.id === state.vertical) + '" data-vertical="' + x.id + '">' + esc(x.label) + '</button>';
    }).join('');
    var steps = STEPS.map(function (label, i) {
      return '<button class="demo-step" data-step="' + (i + 1) + '" role="tab" aria-selected="false">' +
        '<span class="demo-step__dot"></span>' +
        '<span class="demo-step__num">0' + (i + 1) + '</span> ' + label.toUpperCase() + '</button>';
    }).join('');
    var opts = state.data.verticals.map(function (x) {
      return '<option value="' + x.id + '"' + (x.id === state.vertical ? ' selected' : '') + '>' + esc(x.label) + '</option>';
    }).join('');
    app.innerHTML =
      '<div class="demo-picker" role="tablist" aria-label="Choose an industry">' +
        '<select class="demo-picker__select" aria-label="Choose an industry">' + opts + '</select>' + chips + '</div>' +
      '<div class="demo-main">' +
        '<div class="demo-steps" role="tablist" aria-label="Workflow steps" aria-orientation="vertical">' +
          '<span class="demo-steps__indicator" aria-hidden="true"></span>' + steps +
        '</div>' +
        '<div class="demo-stage" aria-live="polite"></div>' +
      '</div>';

    function switchVertical(id) {
      if (id === state.vertical) return;
      state.vertical = id;
      state.step = 1; state.maxStep = 1; state.gatedChoice = null;
      app.querySelectorAll('.demo-picker__chip').forEach(function (c) {
        c.setAttribute('aria-selected', String(c.dataset.vertical === state.vertical));
      });
      var sel = app.querySelector('.demo-picker__select');
      if (sel && sel.value !== id) sel.value = id;
      renderStep(1, true);
    }
    app.querySelectorAll('.demo-picker__chip').forEach(function (chip) {
      chip.addEventListener('click', function () { switchVertical(chip.dataset.vertical); });
    });
    app.querySelector('.demo-picker__select').addEventListener('change', function (e) {
      switchVertical(e.target.value);
    });
    app.querySelectorAll('.demo-step').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var n = parseInt(btn.dataset.step, 10);
        if (n <= state.maxStep && n !== state.step) renderStep(n, false);
      });
    });
  }

  function syncStepper() {
    var stepsEl = app.querySelector('.demo-steps');
    var indicator = app.querySelector('.demo-steps__indicator');
    app.querySelectorAll('.demo-step').forEach(function (btn) {
      var n = parseInt(btn.dataset.step, 10);
      btn.classList.toggle('is-active', n === state.step);
      btn.classList.toggle('is-done', n < state.maxStep || (n <= state.maxStep && n !== state.step));
      btn.setAttribute('aria-selected', String(n === state.step));
    });
    var active = app.querySelector('.demo-step.is-active');
    if (active && indicator && stepsEl) {
      var st = stepsEl.getBoundingClientRect();
      var at = active.getBoundingClientRect();
      indicator.style.top = (at.top - st.top) + 'px';
      indicator.style.height = at.height + 'px';
    }
  }

  function stage() { return app.querySelector('.demo-stage'); }

  function brandline(d) {
    return '<div class="demo-brandline">' +
      '<span><span class="demo-brandline__name">' + esc(d.brand.name) + '</span> ' +
      '<span class="demo-brandline__desc">— ' + esc(d.brand.descriptor) + '</span></span>' +
      '<span class="demo-brandline__desc">' + esc(d.fictionalLabel) + '</span></div>';
  }

  /* ---- Step renderers ---- */
  function renderStep(n, isFresh) {
    renderGen++;
    state.step = n;
    if (n > state.maxStep) state.maxStep = n;
    syncStepper();
    var d = v();
    if (n === 1) renderSignal(d);
    else if (n === 2) renderPlan(d, !isFresh && state.maxStep > 2);
    else if (n === 3) renderApprove(d);
    else renderOutcome(d);
  }

  function renderSignal(d) {
    stage().innerHTML =
      '<div class="demo-panel">' + brandline(d) +
      '<div class="signal-card">' +
        '<div class="signal-card__ts">' + esc(d.signal.timestamp) + ' · SIGNAL DETECTED</div>' +
        '<div class="signal-card__headline">' + esc(d.signal.headline) + '</div>' +
        '<div class="signal-card__metric"><b>' + esc(d.signal.metric) + '</b>' +
        '<span class="signal-card__delta">' + esc(d.signal.delta) + '</span></div>' +
        '<p class="signal-card__detail">' + esc(d.signal.detail) + '</p>' +
        '<div class="signal-card__sources">' + d.systems.map(function (s) {
          return '<span class="chip chip-agent">' + esc(s) + '</span>';
        }).join('') + '</div>' +
        '<button class="btn btn-primary btn--compact" data-next="2">Ask <span class="brand-case">aiRA</span> for a plan</button>' +
      '</div></div>';
    bindNext();
  }

  function renderPlan(d, instant) {
    var gen = renderGen;
    var rows = d.plan.steps.map(function (s) {
      return '<div class="plan-row' + (instant || reduceMotion ? ' is-in' : '') + '">' +
        '<span class="plan-row__who">' + esc(s.who) + '</span>' +
        '<span class="plan-row__what">' + esc(s.what) + '</span>' +
        '<span class="plan-row__expect">' + esc(s.expect) + '</span></div>';
    }).join('');
    var campaigns = d.plan.campaigns.map(function (c) {
      return '<div class="plan-campaign"><b>' + esc(c.name) + '</b>' +
        '<span>' + esc(c.channel) + ' · ' + esc(c.offer) + '</span></div>';
    }).join('');

    var seq = instant || reduceMotion ? ' is-in' : '';
    stage().innerHTML =
      '<div class="demo-panel">' + brandline(d) +
      '<div class="chat-row chat-row--user"><div class="chat-bubble" id="demo-goal"></div></div>' +
      '<div id="demo-agent-reply" style="display:none">' +
        '<div class="chat-thought" id="demo-thought">Thinking…</div>' +
        '<div class="plan-card demo-seq' + seq + '">' + rows + '</div>' +
        '<div class="plan-campaigns demo-seq' + seq + '">' + campaigns + '</div>' +
        '<div class="plan-governance demo-seq' + seq + '">' + esc(d.plan.governanceRule) + '</div>' +
        '<button class="btn btn-primary btn--compact demo-seq' + seq + '" data-next="3">Review and approve</button>' +
      '</div></div>';

    var goalEl = document.getElementById('demo-goal');
    var reply = document.getElementById('demo-agent-reply');
    var thought = document.getElementById('demo-thought');

    function showReply() {
      if (gen !== renderGen) return;
      reply.style.display = '';
      bindNext();
      if (instant || reduceMotion) {
        thought.classList.add('is-done');
        thought.textContent = 'Thought for ' + d.plan.thoughtSeconds + 's';
        stage().querySelectorAll('.plan-row').forEach(function (r) { r.classList.add('is-in'); });
        return;
      }
      // 1) only the thinking spinner is visible; 2) plan card materializes and its
      // rows stagger; 3) campaigns, governance, CTA follow one by one.
      setTimeout(function () {
        if (gen !== renderGen) return;
        thought.classList.add('is-done');
        thought.textContent = 'Thought for ' + d.plan.thoughtSeconds + 's';
        var seqEls = stage().querySelectorAll('.demo-seq');
        var planRows = stage().querySelectorAll('.plan-row');
        seqEls[0].classList.add('is-in');
        planRows.forEach(function (r, i) {
          setTimeout(function () { r.classList.add('is-in'); }, 150 + i * 220);
        });
        var afterRows = 150 + planRows.length * 220 + 250;
        for (var k = 1; k < seqEls.length; k++) {
          (function (el, at) {
            setTimeout(function () { el.classList.add('is-in'); }, at);
          })(seqEls[k], afterRows + (k - 1) * 320);
        }
      }, 1200);
    }

    if (instant || reduceMotion) {
      goalEl.textContent = d.plan.goal;
      thought.classList.add('is-done');
      thought.textContent = 'Thought for ' + d.plan.thoughtSeconds + 's';
      showReply();
    } else {
      var goal = d.plan.goal;
      var t0 = (window.performance || Date).now();
      goalEl.innerHTML = '<span class="chat-caret"></span>';
      (function type() {
        if (gen !== renderGen) return;
        // elapsed-time based so browser timer throttling can't stretch the animation
        var n = Math.min(goal.length, Math.floor(((window.performance || Date).now() - t0) / 24));
        goalEl.innerHTML = esc(goal.slice(0, n)) + '<span class="chat-caret"></span>';
        if (n < goal.length) { setTimeout(type, 24); }
        else { goalEl.textContent = goal; showReply(); }
      })();
    }
  }

  function renderApprove(d) {
    var gen = renderGen;
    var autoRows = d.approval.auto.map(function (r) {
      return '<div class="ledger__row"><span class="ledger__action">' + esc(r.action) +
        '</span><span class="pill-status pill-status--ok">' + esc(r.status) + '</span></div>';
    }).join('');
    stage().innerHTML =
      '<div class="demo-panel">' + brandline(d) +
      '<div class="demo-approve">' +
        '<div class="ledger">' + autoRows +
          '<div class="ledger__row ledger__row--gated" id="demo-gated">' +
            '<span class="ledger__action">' + esc(d.approval.gated.action) +
              '<span class="ledger__reason">' + esc(d.approval.gated.reason) + '</span></span>' +
            '<span class="ledger__controls">' +
              '<button class="btn btn-primary btn--compact" data-decide="approve">Approve</button>' +
              '<button class="btn btn-ghost btn--compact" data-decide="hold">Hold</button>' +
            '</span>' +
          '</div>' +
        '</div>' +
        '<div class="demo-approve__mascot"><img src="/assets/aira-mascot.png?v=1" alt="" width="120" height="194" loading="lazy"></div>' +
      '</div></div>';

    stage().querySelectorAll('[data-decide]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var gated = document.getElementById('demo-gated');
        var controls = gated.querySelector('.ledger__controls');
        state.gatedChoice = btn.dataset.decide;
        if (btn.dataset.decide === 'approve') {
          controls.innerHTML = '<span class="pill-status pill-status--ok">Approved · just now</span>';
          setTimeout(function () { if (gen === renderGen) renderStep(4, false); }, reduceMotion ? 0 : 600);
        } else {
          controls.innerHTML =
            '<span class="pill-status pill-status--held">Held — <span class="brand-case">aiRA</span>&nbsp;won\'t act</span>' +
            '<button class="btn btn-primary btn--compact" data-decide="approve">Approve</button>';
          var again = controls.querySelector('[data-decide="approve"]');
          again.addEventListener('click', function () {
            controls.innerHTML = '<span class="pill-status pill-status--ok">Approved · just now</span>';
            setTimeout(function () { if (gen === renderGen) renderStep(4, false); }, reduceMotion ? 0 : 600);
          });
        }
      });
    });
  }

  function renderOutcome(d) {
    stage().innerHTML =
      '<div class="demo-panel">' + brandline(d) +
      '<div class="outcome-period">' + esc(d.outcome.period) + '</div>' +
      '<div class="outcome-bars">' +
        '<div class="outcome-bar"><div class="outcome-bar__label"><span>' + esc(d.outcome.winner.label) +
          '</span><b>' + esc(d.outcome.winner.value) + '</b></div>' +
          '<div class="outcome-bar__track"><div class="outcome-bar__fill" data-pct="' + d.outcome.winner.pct + '"></div></div></div>' +
        '<div class="outcome-bar outcome-bar--runner"><div class="outcome-bar__label"><span>' + esc(d.outcome.runnerUp.label) +
          '</span><b>' + esc(d.outcome.runnerUp.value) + '</b></div>' +
          '<div class="outcome-bar__track"><div class="outcome-bar__fill" data-pct="' + d.outcome.runnerUp.pct + '"></div></div></div>' +
      '</div>' +
      '<ul class="outcome-actions">' + d.outcome.actions.map(function (a) {
        return '<li>' + esc(a) + '</li>';
      }).join('') + '</ul>' +
      '<p class="outcome-lift">' + esc(d.outcome.lift) + '</p>' +
      '<div class="demo-footer-row">' +
        '<button class="btn btn-secondary btn--compact" id="demo-again">Run another industry</button>' +
        '<a class="link-more" href="/book-a-demo?source=v3-demo">Get a demo with your data →</a>' +
      '</div></div>';

    requestAnimationFrame(function () {
      stage().querySelectorAll('.outcome-bar__fill').forEach(function (bar) {
        requestAnimationFrame(function () { bar.style.width = bar.dataset.pct + '%'; });
      });
    });
    var again = document.getElementById('demo-again');
    again.addEventListener('click', function () {
      app.querySelector('.demo-picker').scrollTo({ left: 0, behavior: 'smooth' });
      var sel = app.querySelector('.demo-picker__select');
      if (sel && getComputedStyle(sel).display !== 'none') { sel.focus(); return; }
      var picker = app.querySelector('.demo-picker__chip:not([aria-selected="true"])');
      if (picker) picker.focus();
    });
  }

  function bindNext() {
    stage().querySelectorAll('[data-next]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        renderStep(parseInt(btn.dataset.next, 10), false);
      });
    });
  }

  /* ---- Boot ---- */
  fetch('/assets/demo-data.json?v=redo1', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      if (!data || !Array.isArray(data.verticals) || !data.verticals.length) throw new Error('bad shape');
      state.data = data;
      state.vertical = data.defaultVertical;
      renderSkeleton();

      function start() {
        if (state.started) return;
        state.started = true;
        setTimeout(function () { renderStep(1, true); }, 100);
      }
      if ('IntersectionObserver' in window && !reduceMotion) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { if (e.isIntersecting) { start(); io.disconnect(); } });
        }, { threshold: 0.3 });
        io.observe(app);
        setTimeout(start, 4000); // safety net: demo never stays dormant
      } else {
        start();
      }
      window.addEventListener('resize', syncStepper);
    })
    .catch(function () {
      app.innerHTML = '<div style="padding:32px"><p><strong>The demo data didn\'t load.</strong> ' +
        'Refresh the page, or <a href="/book-a-demo?source=v3-demo-error">get a live demo instead</a>.</p></div>';
    });
})();
