/* Shrujan core — vanilla ports of src/hooks/useSmoothScroll.js, the App.jsx
   global scroll-reveal system, Header.jsx behavior and the footer letters
   form. Loaded synchronously in <head> after gsap/ScrollTrigger/lenis, so
   window.Shrujan exists before any snippet's inline script runs. */
(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

  /* Theme settings → Motion, published by layout/theme.liquid. Defaults keep
     the packaged behaviour when the layout has not set them. */
  var MOTION = window.SHRUJAN_MOTION || {};
  var ANIMATE = MOTION.animate !== false;
  var SMOOTH = MOTION.smooth !== false;
  var SPEED = typeof MOTION.speed === 'number' && MOTION.speed > 0 ? MOTION.speed : 1;
  /* a higher "speed" percentage means quicker, so it divides the duration */
  var dur = function (seconds) { return seconds / SPEED; };

  /* ------------------------------------------------------------------ *
   *  Smooth scroll (port of hooks/useSmoothScroll.js)
   * ------------------------------------------------------------------ */

  /* The live instance, so overlays and anchor jumps can go through Lenis
     rather than around it — Lenis holds its own scroll position and would
     reassert it a frame later. */
  var lenisInstance = null;

  function scrollToTop() {
    if (lenisInstance) {
      lenisInstance.scrollTo(0, { immediate: true, force: true });
      return;
    }
    window.scrollTo(0, 0); // reduced-motion visitors never get a Lenis instance
  }

  /* Overlays (the press/journal lightbox) must freeze the page behind them.
     `overflow: hidden` is not enough — the wheel still drives Lenis. */
  function stopScroll() {
    if (lenisInstance) {
      lenisInstance.stop();
      return;
    }
    document.body.style.overflow = 'hidden';
  }

  function startScroll() {
    if (lenisInstance) {
      lenisInstance.start();
      return;
    }
    document.body.style.overflow = '';
  }

  /* Lenis caches the document height as its scroll limit; re-measure before
     every programmatic scroll so the target is reachable. */
  function remeasure() {
    if (lenisInstance) lenisInstance.resize();
  }

  function scrollToY(y, opts) {
    opts = opts || {};
    if (lenisInstance) {
      remeasure();
      lenisInstance.scrollTo(y, opts);
      return;
    }
    window.scrollTo({ top: y, behavior: opts.immediate ? 'auto' : 'smooth' });
  }

  /* The offset every anchor lands on: enough to clear the fixed header. */
  var HASH_OFFSET = 96;

  /* Scroll to an element and keep correcting until it stops moving — lazy
     images below the fold have no height until they decode, so the target
     moves while we travel towards it. Returns a cancel function. */
  function scrollToAnchor(hash, options) {
    options = options || {};
    var offset = options.offset == null ? HASH_OFFSET : options.offset;
    var onMissing = options.onMissing;
    var last = -1;
    var stable = 0;
    var tries = 0;
    var timer = 0;
    var raf = 0;

    var aim = function () {
      var target = typeof hash === 'string' ? document.querySelector(hash) : hash;
      if (!target) {
        if (onMissing) onMissing();
        return;
      }

      var y = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
      if (Math.abs(y - last) < 4) {
        stable += 1;
      } else {
        stable = 0;
        last = y;
        scrollToY(y);
      }

      tries += 1;
      if (stable < 3 && tries < 24) timer = setTimeout(aim, 130);
    };

    raf = requestAnimationFrame(aim);
    return function () {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }

  window.Shrujan = {
    scrollToTop: scrollToTop,
    scrollToY: scrollToY,
    scrollToAnchor: scrollToAnchor,
    stopScroll: stopScroll,
    startScroll: startScroll,
    HASH_OFFSET: HASH_OFFSET,
  };

  function initSmoothScroll() {
    // stop the browser restoring a previous position on top of ours
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    // Honour the OS setting: no hijacked scrolling for people who opt out.
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;
    // Theme settings → Motion → Smooth scrolling
    if (!SMOOTH) return;

    var lenis = new Lenis({
      duration: dur(1.05),
      // gentle exponential ease-out; no overshoot, matching the site's motion
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      // leave touch devices on native scrolling — it already feels right there
      syncTouch: false,
    });

    lenisInstance = lenis;
    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add(function (time) { lenis.raf(time * 1000); }); // GSAP passes seconds, Lenis wants ms
    gsap.ticker.lagSmoothing(0);

    // In-page anchors should glide rather than jump.
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;
      var hash = link.getAttribute('href');
      if (!hash || hash.length < 2) return;
      var target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      // Same settling loop used for cross-page anchors — an in-page jump to
      // the footer has exactly the same moving-target problem.
      scrollToAnchor(target);
    });
  }

  /* ------------------------------------------------------------------ *
   *  Global scroll reveals (port of the App.jsx useGSAP block)
   * ------------------------------------------------------------------ */

  function initReveals() {
    // Theme settings → Motion → Animate on scroll: show everything in place.
    if (!ANIMATE) {
      gsap.set('[data-reveal], [data-reveal-child] > *', { clearProps: 'all', opacity: 1 });
      return;
    }

    var mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', function () {
      // Quiet Premium scroll reveals, signature ease, no overshoot.
      // opacity rather than autoAlpha: autoAlpha sets visibility:hidden, and
      // Chrome will not fetch loading="lazy" images inside a hidden subtree.
      gsap.utils.toArray('[data-reveal]').forEach(function (el) {
        gsap.fromTo(
          el,
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: dur(0.85),
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          }
        );
      });

      // Grids reveal as a micro-cascade.
      gsap.utils.toArray('[data-reveal-child]').forEach(function (group) {
        gsap.fromTo(
          group.children,
          { opacity: 0, y: 32 },
          {
            opacity: 1,
            y: 0,
            duration: dur(0.8),
            ease: 'power3.out',
            stagger: 0.09,
            scrollTrigger: { trigger: group, start: 'top 86%', once: true },
          }
        );
      });

      // Gentle image drift inside fixed frames.
      gsap.utils.toArray('[data-parallax] img').forEach(function (img) {
        gsap.fromTo(
          img,
          { yPercent: 0 },
          {
            yPercent: -7,
            ease: 'none',
            scrollTrigger: {
              trigger: img.parentElement,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.6,
            },
          }
        );
      });
    });

    mm.add('(prefers-reduced-motion: reduce)', function () {
      gsap.set('[data-reveal], [data-reveal-child] > *', { clearProps: 'all', opacity: 1 });
    });
  }

  /* On a full page load with a #hash, land on that section with the same
     settling loop the SPA router used (the native jump ignores the fixed
     header offset and lazy-image drift). */
  function initHashLanding() {
    // The SPA's route effect also re-ran when only the hash changed (e.g. the
    // Story menu linking five sections of one page) — hashchange covers that.
    window.addEventListener('hashchange', function () {
      if (!location.hash) return;
      ScrollTrigger.refresh();
      scrollToAnchor(location.hash, { onMissing: scrollToTop });
    });
    if (!location.hash) return;
    ScrollTrigger.refresh();
    scrollToAnchor(location.hash, { onMissing: scrollToTop });
  }

  /* ------------------------------------------------------------------ *
   *  Header (port of components/Header.jsx behavior)
   * ------------------------------------------------------------------ */

  var MENU_SVG =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7.5h16M4 12h16M4 16.5h16"></path></svg>';
  var CLOSE_SVG =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 6 12 12M18 6 6 18"></path></svg>';

  function initHeader() {
    var bar = document.querySelector('.site-header');
    if (!bar) return;
    // The theme editor re-renders the whole section on every setting change, so
    // this runs again against a fresh element. Wiring the same one twice would
    // double every listener; the window-level ones below self-retire instead,
    // by bailing once their bar has left the document.
    if (bar.__shrujanHeader) return;
    bar.__shrujanHeader = true;

    // Behaviour flags from sections/shrujan-header.liquid. The section only
    // emits an attribute once the merchant moves the control off its default,
    // so these fallbacks are the packaged behaviour.
    var STICKY = bar.getAttribute('data-sticky') || 'scroll-up';
    var DROPDOWN = bar.getAttribute('data-dropdown') || 'hover';

    var toggle = bar.querySelector('.menu-toggle');
    var mobileNav = bar.querySelector('.mobile-nav');
    var height = 0;
    var fixed = false;
    var shown = false;
    var lastY = 0;
    var ticking = false;
    var unfix = 0;
    var menuOpen = false;

    // holds the header's place in the document once it lifts out of flow
    var spacer = document.createElement('div');
    spacer.setAttribute('aria-hidden', 'true');

    // Keep the header's height so the spacer can hold its place the moment it
    // goes fixed — otherwise the page jumps up by that height. Published as
    // --header-h so sticky sub-navs and :target offsets can clear the bar.
    function measure() {
      if (!bar.isConnected) return;
      height = bar.offsetHeight || 0;
      spacer.style.height = height + 'px';
      document.documentElement.style.setProperty('--header-h', height + 'px');
    }
    measure();
    window.addEventListener('resize', measure);

    function setMenuOpen(v) {
      if (menuOpen === v) return;
      menuOpen = v;
      if (mobileNav) mobileNav.classList.toggle('open', v);
      if (toggle) {
        toggle.setAttribute('aria-label', v ? 'Close menu' : 'Open menu');
        toggle.setAttribute('aria-expanded', v ? 'true' : 'false');
        toggle.innerHTML = v ? CLOSE_SVG : MENU_SVG;
      }
    }

    function setFixed(v) {
      if (fixed === v) return;
      fixed = v;
      bar.classList.toggle('is-fixed', v);
      if (v) {
        bar.parentNode.insertBefore(spacer, bar);
      } else if (spacer.parentNode) {
        spacer.parentNode.removeChild(spacer);
      }
      // Enable the slide only after it is already fixed and off-screen, so
      // going fixed does not animate a visible upward flick.
      if (!v) {
        bar.classList.remove('is-anim');
      } else {
        requestAnimationFrame(function () {
          if (fixed) bar.classList.add('is-anim');
        });
      }
    }

    function setShown(v) {
      if (shown === v) return;
      shown = v;
      bar.classList.toggle('is-shown', v);
      if (!v) setMenuOpen(false); // a bar sliding away takes its menu with it
    }

    // In flow over the hero, so the hero does not slide underneath it. Past
    // the hero it becomes a floating bar: away while reading down, back on
    // scroll up.
    function heroEnd() {
      var hero = document.querySelector('.hero');
      return hero ? hero.offsetTop + hero.offsetHeight : 620;
    }

    function read() {
      if (!bar.isConnected) {
        ticking = false;
        return;
      }
      var y = window.scrollY;

      // Sticky "never": the bar stays in flow and scrolls away with the page.
      if (STICKY === 'never') {
        clearTimeout(unfix);
        setFixed(false);
        setShown(false);
        lastY = y;
        ticking = false;
        return;
      }

      var past = y > heroEnd();
      var delta = y - lastY;
      var h = bar.offsetHeight || 120;

      if (past) {
        // in the floating zone: away while reading down, back on scroll up
        clearTimeout(unfix);
        setFixed(true);
        if (STICKY === 'always') {
          // once it is floating it stays put, whichever way the page moves
          setShown(true);
          lastY = y;
        } else if (Math.abs(delta) > 4) {
          setShown(delta < 0);
          lastY = y;
        }
      } else if (y <= h) {
        // at the top the fixed and in-flow positions coincide, so hand over
        // instantly — animating here would show the bar leave and come back
        clearTimeout(unfix);
        setFixed(false);
        setShown(false);
        lastY = y;
      } else {
        // scrolling up out of the floating zone: let it slide away first, then
        // drop back into flow once it is off-screen, so nothing snaps
        setShown(false);
        clearTimeout(unfix);
        unfix = setTimeout(function () { setFixed(false); }, 520);
        lastY = y;
      }
      ticking = false;
    }

    window.addEventListener(
      'scroll',
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(read);
      },
      { passive: true }
    );
    read();

    if (toggle) {
      toggle.addEventListener('click', function () { setMenuOpen(!menuOpen); });
    }
    if (mobileNav) {
      mobileNav.addEventListener('click', function (e) {
        if (e.target.closest('a')) setMenuOpen(false);
      });
    }

    // Dropdown panels: one open at a time, Escape closes. By default hover and
    // focus both open; the header section can switch the trigger to click.
    // (The SPA's ignore-hover-after-navigation guard is moot here — every
    // navigation is a full page load.)
    var items = bar.querySelectorAll('.nav-item.has-menu');

    function closeAll(except) {
      items.forEach(function (item) {
        if (item !== except) item.classList.remove('is-open');
      });
    }

    if (DROPDOWN === 'click') {
      // Click mode: the top-level link toggles its own panel rather than
      // navigating — the panel's lead card carries the same destination. No
      // focusin opener here, or tabbing to the link would open the panel and
      // the Enter that follows would immediately shut it again.
      items.forEach(function (item) {
        var link = item.querySelector('.nav-item__link');
        if (link) {
          link.addEventListener('click', function (e) {
            e.preventDefault();
            var open = item.classList.contains('is-open');
            closeAll(null);
            if (!open) item.classList.add('is-open');
          });
        }
        item.addEventListener('focusout', function (e) {
          if (!item.contains(e.relatedTarget)) item.classList.remove('is-open');
        });
      });

      // Outside click closes. This runs after the link's own handler, and a
      // click on the link (or inside its panel) is inside the nav item, so
      // opening a panel never closes it on the same click.
      document.addEventListener('click', function (e) {
        if (!bar.isConnected) return;
        var el = e.target;
        if (el && el.closest && el.closest('.nav-item.has-menu')) return;
        closeAll(null);
      });
    } else {
      items.forEach(function (item) {
        item.addEventListener('mouseenter', function () {
          closeAll(item);
          item.classList.add('is-open');
        });
        item.addEventListener('mouseleave', function () {
          item.classList.remove('is-open');
        });
        item.addEventListener('focusin', function () {
          closeAll(item);
          item.classList.add('is-open');
        });
        item.addEventListener('focusout', function (e) {
          if (!item.contains(e.relatedTarget)) item.classList.remove('is-open');
        });
      });
    }

    window.addEventListener('keydown', function (e) {
      if (!bar.isConnected) return;
      if (e.key === 'Escape') closeAll(null);
    });
  }

  /* ------------------------------------------------------------------ *
   *  Footer letters form (port of the Footer.jsx `sent` state)
   * ------------------------------------------------------------------ */

  function initFooter() {
    var form = document.querySelector('.fletters__form');
    if (!form || form.__shrujanInit) return;
    form.__shrujanInit = true;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var sent = document.createElement('p');
      sent.className = 'fletters__sent';
      sent.setAttribute('role', 'status');
      // the message is a customizer setting on the footer section
      sent.textContent =
        form.getAttribute('data-success-text') || 'Shukriya. Your first letter is on its way.';
      form.parentNode.replaceChild(sent, form);
    });
  }

  /* ------------------------------------------------------------------ */

  function init() {
    initSmoothScroll();
    initHeader();
    initFooter();
    initReveals();
    initHashLanding();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Shopify theme editor re-renders a section's HTML on every setting change,
  // and scripts inside re-injected markup do not execute on their own. Every
  // section script is an idempotent IIFE guarded on its root element, so
  // re-running it against the fresh DOM is safe.
  document.addEventListener('shopify:section:load', function (e) {
    var scripts = (e.target || document).querySelectorAll('script');
    scripts.forEach(function (s) {
      if (s.src) return;
      try {
        new Function(s.textContent)();
      } catch (err) {
        /* a section script that throws must not break the editor */
      }
    });
    initFooter(); // the footer form is wired here, not in a section script
    initHeader(); // re-wires a re-rendered header (and its behaviour flags)
    ScrollTrigger.refresh();
  });
})();
