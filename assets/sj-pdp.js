/* ============================================================
   Shrujan — the product page's additions
   ------------------------------------------------------------
   · "Care guide" in the quick links opens the care panel and brings it
     into view.
   · The making film plays only while it is on screen.
   · Book a call: draws the next days (closed days left out) and the
     time slots inside the studio's hours, in IST, with today's past
     slots shut; fills the form's Date and Time; keeps the WhatsApp link
     carrying the same choice. Without this script the form still sends,
     with a free-text time.
   Written by hand (not generated); loaded by sections/product-*.
   ============================================================ */
(() => {
  if (window.__sjPdp) return;
  window.__sjPdp = true;

  const IST_OFFSET = 330; // minutes ahead of UTC
  const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // A Date whose local fields read as the time in India now.
  const istNow = () => new Date(Date.now() + (IST_OFFSET + new Date().getTimezoneOffset()) * 60000);

  const clock = (mins) => {
    const h = Math.floor(mins / 60), m = mins % 60;
    const hh = ((h + 11) % 12) + 1;
    return `${hh}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  };

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  /* ---- care guide ---- */
  const openCare = (e) => {
    const care = document.querySelector('[data-pdp-care]');
    if (!care) return;
    e.preventDefault();
    if (!care.classList.contains('is-open')) {
      const btn = care.querySelector('.pdp__detail-summary');
      if (btn) btn.click();
    }
    care.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  /* ---- the making film ---- */
  const watchFilms = () => {
    const films = document.querySelectorAll('[data-pdpx-film]');
    if (!films.length) return;
    if (!('IntersectionObserver' in window)) {
      films.forEach((v) => { v.preload = 'auto'; v.play().catch(() => {}); });
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const v = en.target;
        if (en.isIntersecting) {
          if (v.preload === 'none') v.preload = 'auto';
          const p = v.play();
          if (p) p.catch(() => {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.2 });
    films.forEach((v) => io.observe(v));
  };

  /* ---- book a call ---- */
  const initBook = (card) => {
    const form = card.querySelector('form');
    const daysEl = card.querySelector('[data-pdpx-days]');
    const timesEl = card.querySelector('[data-pdpx-times]');
    const dateIn = card.querySelector('[data-pdpx-date]');
    const timeIn = card.querySelector('[data-pdpx-time]');
    if (!form || !daysEl || !timesEl || !dateIn || !timeIn) return; // sent, or no pickers

    const uid = Math.random().toString(36).slice(2, 7);
    const nDays = Math.max(1, parseInt(daysEl.dataset.days, 10) || 14);
    const closed = (daysEl.dataset.closed || '')
      .split(',').map((x) => parseInt(x, 10)).filter((x) => x >= 0 && x <= 6);
    const open = (parseInt(timesEl.dataset.open, 10) || 10) * 60;
    const close = (parseInt(timesEl.dataset.close, 10) || 19) * 60;
    const step = parseInt(timesEl.dataset.step, 10) || 30;
    const lead = 60; // the earliest slot today is an hour from now

    const slotsFor = (day) => {
      const now = istNow();
      const from = sameDay(day, now) ? now.getHours() * 60 + now.getMinutes() + lead : -1;
      const out = [];
      for (let t = open; t + step <= close; t += step) out.push({ t, shut: t < from });
      return out;
    };

    // The calendar: a month at a time; a day can be chosen when the studio is
    // open that day, it is not past, a slot is still free, and it is within
    // `horizon` days (the "how far ahead" setting).
    const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const horizon = Math.max(7, nDays);
    const today = istNow();
    today.setHours(12, 0, 0, 0);
    const last = new Date(today);
    last.setDate(last.getDate() + horizon);
    const isOpen = (day) => day >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) && day <= last
      && !closed.includes(day.getDay()) && slotsFor(day).some((x) => !x.shut);
    let chosenDay = null;
    for (let d = new Date(today), g = 0; g <= horizon; g++, d.setDate(d.getDate() + 1)) {
      if (isOpen(d)) { chosenDay = new Date(d); break; }
    }
    if (!chosenDay) return;
    let view = new Date(chosenDay.getFullYear(), chosenDay.getMonth(), 1, 12);
    const firstView = new Date(today.getFullYear(), today.getMonth(), 1, 12);
    const lastView = new Date(last.getFullYear(), last.getMonth(), 1, 12);

    const label = (day) => `${DAY[day.getDay()]}, ${day.getDate()} ${MON[day.getMonth()]} ${day.getFullYear()}`;
    const longLabel = (day) => `${WEEK[(day.getDay() + 6) % 7]}, ${day.getDate()} ${MONTH[day.getMonth()]}`;
    const chosenEl = card.querySelector('[data-pdpx-chosen]');
    const summary = card.querySelector('[data-pdpx-summary]');
    const icon = (n) => `<i class="sj-i sj-i--${n} ms" aria-hidden="true"></i>`;

    const drawCal = () => {
      const y = view.getFullYear(), m = view.getMonth();
      const lead = (new Date(y, m, 1).getDay() + 6) % 7; // Monday first
      const n = new Date(y, m + 1, 0).getDate();
      let cells = '';
      for (let i = 0; i < lead; i++) cells += '<span class="pdpx-cal__blank" aria-hidden="true"></span>';
      for (let dn = 1; dn <= n; dn++) {
        const day = new Date(y, m, dn, 12);
        const ok = isOpen(day);
        const on = sameDay(day, chosenDay);
        const now = sameDay(day, today);
        cells += `<button type="button" class="pdpx-cal__d${now ? ' is-today' : ''}${on ? ' is-on' : ''}" data-d="${dn}"${ok ? '' : ' disabled'} aria-pressed="${on}" aria-label="${longLabel(day)}${ok ? '' : ', not available'}">${dn}</button>`;
      }
      daysEl.innerHTML =
        `<div class="pdpx-cal__head"><button type="button" class="pdpx-cal__nav" data-step="-1" aria-label="Previous month"${view <= firstView ? ' disabled' : ''}>${icon('caret-left')}</button>` +
        `<p class="pdpx-cal__month" aria-live="polite">${MONTH[m]} <span>${y}</span></p>` +
        `<button type="button" class="pdpx-cal__nav" data-step="1" aria-label="Next month"${view >= lastView ? ' disabled' : ''}>${icon('caret-right')}</button></div>` +
        `<div class="pdpx-cal__week" aria-hidden="true">${['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((w) => `<span>${w}</span>`).join('')}</div>` +
        `<div class="pdpx-cal__grid">${cells}</div>`;
    };

    const drawTimes = () => {
      const keep = timeIn.value;
      const groups = [['Morning', 0, 12 * 60], ['Afternoon', 12 * 60, 17 * 60], ['Evening', 17 * 60, 24 * 60]];
      const slots = slotsFor(chosenDay);
      timesEl.innerHTML = groups.map(([name, a0, a1]) => {
        const here = slots.filter((x) => x.t >= a0 && x.t < a1);
        if (!here.length || here.every((x) => x.shut)) return '';
        return `<div class="pdpx-book__tgroup"><p>${name}</p><div class="pdpx-book__tgrid">` + here.map((x) => {
          const c = clock(x.t);
          const on = !x.shut && c === keep;
          return `<label class="pdpx-book__slot"><input type="radio" name="pdpx_slot_${uid}" value="${c}"${x.shut ? ' disabled' : ''}${on ? ' checked' : ''}><span>${c}</span></label>`;
        }).join('') + '</div></div>';
      }).join('');
      if (!timesEl.querySelector('input:checked')) timeIn.value = '';
      if (chosenEl) chosenEl.textContent = longLabel(chosenDay);
    };

    // the two buttons say what is chosen
    const shortLabel = (day) => `${DAY[day.getDay()]}, ${day.getDate()} ${MON[day.getMonth()]}`;
    const dateLab = card.querySelector('[data-pdpx-date-label]');
    const timeLab = card.querySelector('[data-pdpx-time-label]');
    const drawLabels = () => {
      if (dateLab) dateLab.textContent = shortLabel(chosenDay);
      if (timeLab) timeLab.textContent = timeIn.value ? `${timeIn.value}` : 'Choose a time';
      card.querySelectorAll('[data-pdpx-pick]').forEach((pk) => pk.classList.toggle('has-value', pk.dataset.pdpxPick === 'date' || !!timeIn.value));
    };

    // each picker opens in a pop-up under its button (a sheet from the foot
    // of the screen on a phone); one at a time; choosing a day moves on to the
    // time, choosing a time closes it
    const picks = [...card.querySelectorAll('[data-pdpx-pick]')];
    let scrim = null;
    const phone = () => window.matchMedia('(max-width: 720px)').matches;
    const openPick = (name) => {
      picks.forEach((pk) => {
        const on = pk.dataset.pdpxPick === name;
        const pop = pk.querySelector('.pdpx-pop');
        const btn = pk.querySelector('.pdpx-book__pbtn');
        if (pop) pop.hidden = !on;
        if (btn) btn.setAttribute('aria-expanded', on ? 'true' : 'false');
        pk.classList.toggle('is-open', on);
      });
      if (name && phone()) {
        if (!scrim) {
          scrim = document.createElement('div');
          scrim.className = 'pdpx-scrim';
          scrim.addEventListener('click', () => openPick(null));
          document.body.appendChild(scrim);
        }
        scrim.hidden = false;
        document.documentElement.classList.add('pdpx-sheet-open');
      } else {
        if (scrim) scrim.hidden = true;
        document.documentElement.classList.remove('pdpx-sheet-open');
      }
      if (name) {
        const first = card.querySelector(`[data-pdpx-pick="${name}"] .pdpx-cal__d.is-on, [data-pdpx-pick="${name}"] .pdpx-book__slot input:checked, [data-pdpx-pick="${name}"] .pdpx-book__slot input:not(:disabled)`);
        if (first) setTimeout(() => first.focus({ preventScroll: true }), 40);
      }
    };
    picks.forEach((pk) => {
      pk.querySelector('.pdpx-book__pbtn').addEventListener('click', () => openPick(pk.classList.contains('is-open') ? null : pk.dataset.pdpxPick));
      pk.querySelectorAll('[data-pdpx-close]').forEach((x) => x.addEventListener('click', () => openPick(null)));
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('[data-pdpx-pick]') && !e.target.closest('.pdpx-scrim') && picks.some((pk) => pk.classList.contains('is-open'))) openPick(null); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && picks.some((pk) => pk.classList.contains('is-open'))) openPick(null); });

    const drawSummary = () => {
      if (!summary) return;
      const mode = field('Call type');
      const show = !!timeIn.value;
      summary.hidden = !show;
      if (show) summary.querySelector('span').textContent = `${mode ? mode + ': ' : ''}${longLabel(chosenDay)} · ${timeIn.value} IST`;
    };

    const wa = card.querySelector('[data-pdpx-wa]');
    const number = card.dataset.whatsapp || '';
    const field = (n) => {
      const el = form.querySelector(`[name="contact[${n}]"]`);
      if (!el) return '';
      if (el.type === 'radio') {
        const c = form.querySelector(`[name="contact[${n}]"]:checked`);
        return c ? c.value : '';
      }
      return el.value.trim();
    };
    const syncWa = () => {
      if (!wa || !number) return;
      const mode = (field('Call type') || 'call').toLowerCase();
      const product = field('Product');
      const name = field('name');
      let msg = `Hello Shrujan, I would like to book a ${mode}`;
      if (product) msg += ` about ${product}`;
      if (dateIn.value) msg += ` on ${dateIn.value}`;
      if (timeIn.value) msg += ` at ${timeIn.value} IST`;
      msg += '.';
      if (name) msg += ` My name is ${name}.`;
      wa.href = `https://api.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(msg)}`;
    };

    dateIn.value = label(chosenDay);
    drawCal();
    drawTimes();
    drawLabels();
    const section = card.closest('.pdpx-book');
    if (section) section.setAttribute('data-ready', '');

    daysEl.addEventListener('click', (e) => {
      const nav = e.target.closest('.pdpx-cal__nav');
      if (nav && !nav.disabled) {
        view = new Date(view.getFullYear(), view.getMonth() + parseInt(nav.dataset.step, 10), 1, 12);
        drawCal();
        const again = daysEl.querySelector(`.pdpx-cal__nav[data-step="${nav.dataset.step}"]`);
        if (again && !again.disabled) again.focus();
        return;
      }
      const btn = e.target.closest('.pdpx-cal__d');
      if (!btn || btn.disabled) return;
      chosenDay = new Date(view.getFullYear(), view.getMonth(), parseInt(btn.dataset.d, 10), 12);
      dateIn.value = label(chosenDay);
      drawCal();
      drawTimes();
      drawLabels();
      drawSummary();
      syncWa();
      // on to the time
      openPick('time');
    });

    timesEl.addEventListener('change', (e) => {
      timeIn.value = e.target.value;
      timesEl.classList.remove('is-missing');
      card.querySelector('[data-pdpx-pick="time"]').classList.remove('is-missing');
      drawLabels();
      drawSummary();
      syncWa();
      setTimeout(() => openPick(null), 180);
    });

    form.addEventListener('input', syncWa);
    form.addEventListener('change', () => { syncWa(); drawSummary(); });

    form.addEventListener('submit', (e) => {
      if (timeIn.value) return;
      e.preventDefault();
      timesEl.classList.add('is-missing');
      const tp = card.querySelector('[data-pdpx-pick="time"]');
      tp.classList.add('is-missing');
      tp.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => openPick('time'), 350);
    });

    syncWa();
  };

  const start = () => {
    document.querySelectorAll('[data-pdp-open="care"]').forEach((a) => a.addEventListener('click', openCare));
    watchFilms();
    document.querySelectorAll('[data-pdpx-book]').forEach(initBook);
    // Back on the page after sending: bring the thank-you into view.
    if (/[?&]contact_posted=true/.test(location.search) || location.hash === '#pdpx-book-form') {
      const done = document.querySelector('.pdpx-book__done, .pdpx-book__error');
      if (done) done.scrollIntoView({ block: 'center' });
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
