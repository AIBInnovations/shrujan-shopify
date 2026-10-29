/* Studio Collection pages (Heritage, Avinya): the hero's cloth and pots
   drift at their own depth as the page scrolls, and every WhatsApp link
   on the page carries what the visitor has already written in the form.
   Loaded by sections/page-studio-heritage.liquid and page-studio-avinya. */
(function () {
  var roots = document.querySelectorAll('.sp');
  if (!roots.length) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  [].forEach.call(roots, function (root) {
    // depth: the hero's layers move slower than the page
    var layers = [].slice.call(root.querySelectorAll('[data-sp-depth]'));
    var hero = root.querySelector('.sp-hero');
    if (layers.length && hero && !reduced) {
      var ticking = false;
      var draw = function () {
        ticking = false;
        var r = hero.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        var p = -r.top;
        layers.forEach(function (el) {
          el.style.transform = 'translate3d(0,' + (p * parseFloat(el.getAttribute('data-sp-depth'))).toFixed(1) + 'px,0)';
        });
      };
      window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(draw); } }, { passive: true });
      draw();
    }

    // WhatsApp: the opening line, then the name, city and interest if given
    var form = root.querySelector('.enquiry__form');
    [].forEach.call(root.querySelectorAll('[data-sp-wa]'), function (a) {
      a.addEventListener('click', function () {
        var base = a.getAttribute('data-sp-wa');
        var lines = [a.getAttribute('data-sp-wa-text') || ''];
        if (form) {
          [['name', 'Name'], ['city', 'City'], ['extra', 'Interested in'], ['looking', 'Looking for']].forEach(function (f) {
            var el = form.querySelector('[name="' + f[0] + '"]');
            if (el && el.value.trim()) lines.push(f[1] + ': ' + el.value.trim());
          });
        }
        a.href = 'https://api.whatsapp.com/send?phone=' + base + '&text=' + encodeURIComponent(lines.filter(Boolean).join('\n'));
      });
    });
  });
})();
