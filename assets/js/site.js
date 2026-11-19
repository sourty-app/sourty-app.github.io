/* صورتي — tiny site script. No trackers, no network calls except the waitlist form submit. */
(function () {
  var root = document.documentElement;
  var isAr = root.lang === 'ar';

  /* Theme toggle. The choice is kept in this browser only (localStorage), never sent anywhere. */
  var btn = document.querySelector('.theme');
  function current() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function label() {
    if (!btn) return;
    var dark = current() === 'dark';
    btn.setAttribute('aria-label', isAr ? (dark ? 'الشكل الفاتح' : 'الشكل الغامق') : (dark ? 'Light mode' : 'Dark mode'));
  }
  if (btn) {
    label();
    btn.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      label();
    });
  }

  /* Header border once the page scrolls. */
  var top = document.querySelector('.top');
  if (top) {
    var onScroll = function () { top.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  /* Hero demo: types example searches and swaps the drawn result. */
  var demo = document.querySelector('[data-demo]');
  if (demo) {
    var typed = demo.querySelector('.typed span');
    var found = demo.querySelector('.found');
    var tile = demo.querySelector('.top-tile');
    var scenes = demo.querySelectorAll('.scene');
    var items = [];
    scenes.forEach(function (s) { items.push({ q: s.getAttribute('data-q'), id: s.id }); });
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var i = 0;
    // Long text slides inside the fixed search field (shows its end), like the real app.
    function fit() {
      var box = typed.parentElement;
      box.classList.toggle('over', typed.scrollWidth > box.clientWidth);
    }
    function show(n) {
      scenes.forEach(function (s, k) { s.classList.toggle('on', k === n); });
    }
    function cycle() {
      var item = items[i];
      var chars = Array.from(item.q);
      var k = 0;
      typed.textContent = ''; fit();
      var t = setInterval(function () {
        k++;
        typed.textContent = chars.slice(0, k).join('');
        fit();
        if (k >= chars.length) {
          clearInterval(t);
          setTimeout(function () {
            found.classList.add('dim'); tile.classList.add('dim');
            setTimeout(function () {
              show(i);
              found.classList.remove('dim'); tile.classList.remove('dim');
              i = (i + 1) % items.length;
              setTimeout(cycle, 3400);
            }, 350);
          }, 300);
        }
      }, 65);
    }
    if (reduce || !items.length) {
      typed.textContent = items[0] ? items[0].q : '';
      show(0);
    } else {
      typed.textContent = items[0].q; show(0); i = 1;
      setTimeout(cycle, 3000);
    }
  }

  /* Waitlist form → our Google Sheet (Apps Script web app). */
  var form = document.querySelector('[data-waitlist]');
  if (form) {
    var box = form.closest('.form-wrap');
    var status = form.querySelector('.form-status');
    var endpoint = form.getAttribute('data-endpoint');
    var phoneInput = form.querySelector('#phone');
    var iosNote = form.querySelector('#ios-note');
    function iosCheck() {
      if (!iosNote) return;
      iosNote.hidden = !/iphone|آيفون|ايفون|أيفون/i.test(phoneInput.value);
    }
    phoneInput.addEventListener('input', iosCheck);
    // "Try it now" (closed test on Google Play) vs "tell me when it's out".
    function mode() { var m = form.querySelector('input[name="mode"]:checked'); return m ? m.value : ''; }
    form.querySelectorAll('input[name="mode"]').forEach(function (r) {
      r.addEventListener('change', function () {
        box.setAttribute('data-mode', mode());
        form.elements['contact'].placeholder = mode() === 'test' ? 'name@gmail.com' : '';
        check('mode', true);
      });
    });
    form.querySelectorAll('[data-pick]').forEach(function (b) {
      b.addEventListener('click', function () {
        phoneInput.value = b.getAttribute('data-pick'); iosCheck(); phoneInput.focus();
      });
    });
    function check(id, ok) {
      if (id === 'mode') {
        var fs = form.querySelector('.choice');
        fs.classList.toggle('bad', !ok);
        form.querySelectorAll('input[name="mode"]').forEach(function (r) { r.setAttribute('aria-invalid', ok ? 'false' : 'true'); });
        return ok;
      }
      var el = form.querySelector('#' + id); var f = el.closest('.field');
      f.classList.toggle('bad', !ok); el.setAttribute('aria-invalid', ok ? 'false' : 'true');
      return ok;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var el = form.elements;
      var name = el['name'].value.trim(), contact = el['contact'].value.trim(), phone = el['phone'].value.trim(), wish = el['wish'].value.trim();
      var digits = contact.replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x660; }).replace(/[\s\-+()]/g, '');
      var m = mode();
      var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
      // Testers must give the Google account email used on Google Play; others may give WhatsApp or email.
      var okContact = m === 'test' ? isEmail : (isEmail || /^\d{8,15}$/.test(digits));
      var ok = [check('name', name.length > 0), check('mode', m !== ''), check('contact', okContact), check('phone', phone.length > 0)];
      if (ok.indexOf(false) !== -1) {
        var first = form.querySelector('[aria-invalid="true"]'); if (first) first.focus();
        return;
      }
      if (el['website'].value) return; // spam bot filled the hidden field
      if (!endpoint) {
        status.textContent = isAr ? 'الفورمة لسه مش متوصّلة بالجدول (نسخة تجريبية).' : 'The form is not connected yet (preview).';
        return;
      }
      var b = form.querySelector('button[type="submit"]');
      b.disabled = true; status.textContent = isAr ? 'بنبعت…' : 'Sending…';
      var data = new URLSearchParams({ name: name, mode: m, contact: contact, phone: phone, wish: wish, lang: root.lang });
      fetch(endpoint, { method: 'POST', mode: 'no-cors', body: data })
        .then(function () { box.classList.add('sent'); box.querySelector('.thanks h2').focus(); })
        .catch(function () {
          b.disabled = false;
          status.textContent = isAr ? 'معرفناش نبعت دلوقتي. اتأكد إن النت شغّال وجرّب تاني.' : "We couldn't send it. Check your connection and try again.";
        });
    });
  }

  /* Feedback form → the "Feedback" tab of the same Google Sheet. Text only: no photo upload. */
  var fb = document.querySelector('[data-feedback]');
  if (fb) {
    var fbBox = fb.closest('.form-wrap');
    var fbStatus = fb.querySelector('.form-status');
    var fbEndpoint = fb.getAttribute('data-endpoint');
    var fbPhone = fb.querySelector('#phone');
    function kind() { var k = fb.querySelector('input[name="kind"]:checked'); return k ? k.value : ''; }
    function mark(el, ok) {
      el.closest('.field').classList.toggle('bad', !ok);
      el.setAttribute('aria-invalid', ok ? 'false' : 'true');
      return ok;
    }
    function markKind(ok) {
      fb.querySelector('.choice').classList.toggle('bad', !ok);
      fb.querySelectorAll('input[name="kind"]').forEach(function (r) { r.setAttribute('aria-invalid', ok ? 'false' : 'true'); });
      return ok;
    }
    fb.querySelectorAll('input[name="kind"]').forEach(function (r) {
      r.addEventListener('change', function () { fbBox.setAttribute('data-kind', kind()); markKind(true); });
    });
    fb.querySelectorAll('[data-pick]').forEach(function (b) {
      b.addEventListener('click', function () { fbPhone.value = b.getAttribute('data-pick'); fbPhone.focus(); });
    });
    fb.addEventListener('submit', function (e) {
      e.preventDefault();
      var el = fb.elements, k = kind();
      var v = function (n) { return el[n].value.trim(); };
      var search = k === 'search';
      var ok = [
        markKind(k !== ''),
        search ? mark(el['query'], v('query').length > 0) : mark(el['query'], true),
        search ? mark(el['expected'], v('expected').length > 0) : mark(el['expected'], true),
        search ? mark(el['message'], true) : mark(el['message'], v('message').length > 0),
        mark(el['phone'], v('phone').length > 0),
        mark(el['email'], v('email') === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email')))
      ];
      if (ok.indexOf(false) !== -1) {
        var first = fb.querySelector('[aria-invalid="true"]'); if (first) first.focus();
        return;
      }
      if (el['website'].value) return; // spam bot filled the hidden field
      var b = fb.querySelector('button[type="submit"]');
      b.disabled = true; fbStatus.textContent = isAr ? 'بنبعت…' : 'Sending…';
      var data = new URLSearchParams({
        form: 'feedback', kind: k,
        query: search ? v('query') : '', expected: search ? v('expected') : '', message: search ? '' : v('message'),
        phone: v('phone'), version: v('version'), email: v('email'), lang: root.lang
      });
      fetch(fbEndpoint, { method: 'POST', mode: 'no-cors', body: data })
        .then(function () { fbBox.classList.add('sent'); fbBox.querySelector('.thanks h2').focus(); })
        .catch(function () {
          b.disabled = false;
          fbStatus.textContent = isAr ? 'معرفناش نبعت دلوقتي. اتأكد إن النت شغّال وجرّب تاني.' : "We couldn't send it. Check your connection and try again.";
        });
    });
  }
})();
