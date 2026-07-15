/* aiRA — lead form controller (book-a-demo). External file: the server CSP blocks inline scripts. */
(function () {
  'use strict';
  var form = document.getElementById('lead-form');
  if (!form) return;
  var EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
  function setInvalid(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    var field = el.closest('.field');
    field.classList.add('invalid');
    el.setAttribute('aria-invalid', 'true');
    if (msg) { var err = field.querySelector('.err'); if (err) err.textContent = msg; }
  }
  function clearInvalid() {
    Array.prototype.forEach.call(form.querySelectorAll('.field.invalid'), function (f) {
      f.classList.remove('invalid');
      var inp = f.querySelector('input,select,textarea');
      if (inp) inp.removeAttribute('aria-invalid');
    });
    var note = document.getElementById('lead-fail');
    if (note) note.style.display = 'none';
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearInvalid();
    var bad = false;
    if (!document.getElementById('lf-first').value.trim()) { setInvalid('lf-first'); bad = true; }
    if (!document.getElementById('lf-last').value.trim()) { setInvalid('lf-last'); bad = true; }
    if (!EMAIL.test(document.getElementById('lf-email').value)) { setInvalid('lf-email'); bad = true; }
    if (!document.getElementById('lf-company').value.trim()) { setInvalid('lf-company'); bad = true; }
    if (bad) return;
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Sending…';
    fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j }; });
      })
      .then(function (r) {
        if (r.status === 422 && r.body && r.body.errors) {
          var map = { first_name: 'lf-first', last_name: 'lf-last', email: 'lf-email', company: 'lf-company' };
          Object.keys(r.body.errors).forEach(function (k) { if (map[k]) setInvalid(map[k], r.body.errors[k]); });
          throw new Error('validation');
        }
        if (r.status !== 200 || (r.body && r.body.ok === false)) throw new Error('failed');
        form.style.display = 'none';
        document.getElementById('lead-success').style.display = 'block';
      })
      .catch(function (err) {
        btn.disabled = false; btn.textContent = 'Get a demo';
        if (String(err && err.message) !== 'validation') {
          var note = document.getElementById('lead-fail');
          if (note) note.style.display = 'block';
        }
      });
  });
})();
