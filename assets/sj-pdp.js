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

    // The days on offer: from today (if a slot is still open) for nDays open days.
    const days = [];
    const d = istNow();
    d.setHours(12, 0, 0, 0);
    for (let guard = 0; days.length < nDays && guard < nDays * 3; guard++) {
      const ok = !closed.includes(d.getDay()) && slotsFor(d).some((s) => !s.shut);
      if (ok) days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    if (!days.length) return;

    const label = (day) => `${DAY[day.getDay()]}, ${day.getDate()} ${MON[day.getMonth()]} ${day.getFullYear()}`;
    let chosenDay = days[0];

    daysEl.innerHTML = days.map((day, i) => `
      <label class="pdpx-book__day">
        <input type="radio" name="pdpx_day_${uid}" value="${i}"${i === 0 ? ' checked' : ''}>
        <span>${DAY[day.getDay()]}<b>${day.getDate()}</b>${MON[day.getMonth()]}</span>
      </label>`).join('');

    const drawTimes = () => {
      const keep = timeIn.value;
      timesEl.innerHTML = slotsFor(chosenDay).map((s) => {
        const c = clock(s.t);
        const on = !s.shut && c === keep;
        return `<label class="pdpx-book__slot"><input type="radio" name="pdpx_slot_${uid}" value="${c}"${s.shut ? ' disabled' : ''}${on ? ' checked' : ''}><span>${c}</span></label>`;
      }).join('');
      if (!timesEl.querySelector('input:checked')) timeIn.value = '';
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
    drawTimes();
    const section = card.closest('.pdpx-book');
    if (section) section.setAttribute('data-ready', '');

    daysEl.addEventListener('change', (e) => {
      const i = parseInt(e.target.value, 10);
      if (!days[i]) return;
      chosenDay = days[i];
      dateIn.value = label(chosenDay);
      drawTimes();
      syncWa();
    });

    timesEl.addEventListener('change', (e) => {
      timeIn.value = e.target.value;
      timesEl.classList.remove('is-missing');
      syncWa();
    });

    form.addEventListener('input', syncWa);
    form.addEventListener('change', syncWa);

    form.addEventListener('submit', (e) => {
      if (timeIn.value) return;
      e.preventDefault();
      timesEl.classList.add('is-missing');
      timesEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
