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
    form.querySelectorAll('[data-pick]').forEach(function (b) {
      b.addEventListener('click', function () {
        phoneInput.value = b.getAttribute('data-pick'); iosCheck(); phoneInput.focus();
      });
    });
    function check(id, ok) {
      var el = form.querySelector('#' + id); var f = el.closest('.field');
      f.classList.toggle('bad', !ok); el.setAttribute('aria-invalid', ok ? 'false' : 'true');
      return ok;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var el = form.elements;
      var name = el['name'].value.trim(), contact = el['contact'].value.trim(), phone = el['phone'].value.trim(), wish = el['wish'].value.trim();
      var digits = contact.replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x660; }).replace(/[\s\-+()]/g, '');
      var okContact = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) || /^\d{8,15}$/.test(digits);
      var ok = [check('name', name.length > 0), check('contact', okContact), check('phone', phone.length > 0)];
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
      var data = new URLSearchParams({ name: name, contact: contact, phone: phone, wish: wish, lang: root.lang });
      fetch(endpoint, { method: 'POST', mode: 'no-cors', body: data })
        .then(function () { box.classList.add('sent'); box.querySelector('.thanks h2').focus(); })
        .catch(function () {
          b.disabled = false;
          status.textContent = isAr ? 'معرفناش نبعت دلوقتي. اتأكد إن النت شغّال وجرّب تاني.' : "We couldn't send it. Check your connection and try again.";
        });
    });
  }
})();
