/* ═══════════════════════════════════════════════════════════
   TAMANT – Main JavaScript
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const nav       = document.getElementById('nav');
  const navToggle = document.getElementById('nav-toggle');
  const navLinks  = document.getElementById('nav-links');

  // ─── Mobile menu ─────────────────────────────────────────
  navToggle?.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  navLinks?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  function closeMenu() {
    navLinks?.classList.remove('open');
    navToggle?.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks?.classList.contains('open')) {
      closeMenu();
    }
  });

  // ─── Active nav link highlighting ────────────────────────
  const sections   = document.querySelectorAll('section[id]');
  const navLinkEls = document.querySelectorAll('.nav-links a');

  function highlightActiveSection() {
    let current = '';
    const offset = 140;

    sections.forEach((section) => {
      if (window.scrollY >= section.offsetTop - offset) {
        current = section.id;
      }
    });

    navLinkEls.forEach((link) => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      if (href === `#${current}` || href === `index.html#${current}`) {
        link.classList.add('active');
      }
    });
  }

  window.addEventListener('scroll', highlightActiveSection, { passive: true });

  // ─── Intersection Observer: fade-up animations ───────────
  const fadeEls = document.querySelectorAll('.fade-up');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -48px 0px',
      }
    );
    fadeEls.forEach((el) => observer.observe(el));
  } else {
    fadeEls.forEach((el) => el.classList.add('visible'));
  }

  // ─── Smooth scroll for anchor links ──────────────────────
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href').slice(1);
      if (!targetId) return;

      const target = document.getElementById(targetId);
      if (!target) return;

      e.preventDefault();

      const navHeight = nav?.offsetHeight ?? 64;
      const targetY   = target.getBoundingClientRect().top + window.scrollY - navHeight;

      window.scrollTo({ top: targetY, behavior: 'smooth' });
    });
  });

  // Initial state
  highlightActiveSection();

})();
