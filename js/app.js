/* ============================================================
   Lidiane Flores e Arvelos Advocacia — Scroll-Driven Engine
   Canvas: vídeos Google Flow em loop · cross-fade por seção
   Stack: Lenis + GSAP + ScrollTrigger + Canvas Video
============================================================ */
(function () {
  'use strict';

  /* =========================================================
     VÍDEOS DO CANVAS (7 — sobre → cta)
     Cada vídeo entra no breakpoint correspondente do scroll
  ========================================================= */
  const VIDEO_SRCS = [
    'videos/sobre.mp4',
    'videos/direitos.mp4',
    'videos/areas.mp4',
    'videos/rescisao.mp4',
    'videos/dicas.mp4',
    'videos/atendimento.mp4',
    'videos/cta.mp4',
  ];

  /* Progresso do scroll onde cada vídeo assume o canvas */
  const BREAKS = [0, 0.23, 0.37, 0.50, 0.74, 0.83, 0.92];

  /* =========================================================
     REFERÊNCIAS DOM
  ========================================================= */
  const loader      = document.getElementById('loader');
  const loaderBar   = document.getElementById('loader-bar');
  const loaderPct   = document.getElementById('loader-percent');
  const canvas      = document.getElementById('canvas');
  const canvasWrap  = document.getElementById('canvas-wrap');
  const darkOverlay = document.getElementById('dark-overlay');
  const marqueeWrap = document.getElementById('marquee-wrap');
  const marqueeText = marqueeWrap ? marqueeWrap.querySelector('.marquee-text') : null;
  const scrollCont  = document.getElementById('scroll-container');
  const heroSection = document.querySelector('.hero-standalone');
  const heroBg      = document.querySelector('.hero-bg');
  const siteHeader  = document.getElementById('site-header');
  const menuToggle  = document.getElementById('menu-toggle');
  const mainNav     = document.getElementById('main-nav');
  const ctx         = canvas ? canvas.getContext('2d') : null;

  /* =========================================================
     ESTADO DO CANVAS
  ========================================================= */
  let videoEls   = [];
  let currentIdx = 0;
  let prevIdx    = -1;
  let blendStart = null;
  const BLEND_MS = 700;

  /* =========================================================
     1. CANVAS — dimensionamento DPR
  ========================================================= */
  function resizeCanvas() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = window.innerWidth  * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);
  }

  /* =========================================================
     2. CANVAS — padded-cover (funciona para img e video)
  ========================================================= */
  const IMAGE_SCALE = 1.0;

  function drawPaddedCover(el) {
    if (!el) return;
    const cw = window.innerWidth;
    const ch = window.innerHeight;
    const iw = el.videoWidth  || el.naturalWidth  || 0;
    const ih = el.videoHeight || el.naturalHeight || 0;
    if (!iw || !ih) return;

    const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    ctx.fillStyle = '#07101E';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(el, dx, dy, dw, dh);
  }

  /* =========================================================
     3. CANVAS — rAF loop contínuo
     Desenha o vídeo atual (e cross-fade com o anterior)
  ========================================================= */
  function drawLoop(timestamp) {
    requestAnimationFrame(drawLoop);
    if (!ctx) return;

    const cv = videoEls[currentIdx];
    const pv = prevIdx >= 0 ? videoEls[prevIdx] : null;

    let blend = 1;
    if (blendStart !== null) {
      blend = Math.min(1, (timestamp - blendStart) / BLEND_MS);
      if (blend >= 1) {
        blendStart = null;
        if (pv && pv !== cv) { pv.pause(); pv.currentTime = 0; }
        prevIdx = -1;
      }
    }

    /* Vídeo anterior embaixo */
    if (pv && pv !== cv && blend < 1) {
      ctx.globalAlpha = 1;
      drawPaddedCover(pv);
    }

    /* Vídeo atual por cima com alpha de blend */
    if (cv) {
      ctx.globalAlpha = blend;
      drawPaddedCover(cv);
      ctx.globalAlpha = 1;
    }
  }

  /* =========================================================
     4. Mapear progresso do scroll → índice de vídeo
  ========================================================= */
  function getVideoIdx(p) {
    for (let i = BREAKS.length - 1; i >= 0; i--) {
      if (p >= BREAKS[i]) return i;
    }
    return 0;
  }

  /* =========================================================
     5. Trocar vídeo ativo (com cross-fade suave)
  ========================================================= */
  function setActiveVideo(idx) {
    if (idx === currentIdx) return;
    prevIdx    = currentIdx;
    currentIdx = idx;
    blendStart = performance.now();

    const nv = videoEls[idx];
    if (nv) { nv.currentTime = 0; nv.play().catch(() => {}); }
  }

  /* =========================================================
     6. PRELOAD — carregar todos os vídeos
  ========================================================= */
  function loadVideos(onComplete) {
    const total = VIDEO_SRCS.length;
    let done    = 0;

    function onReady() {
      done++;
      const pct = Math.round((done / total) * 100);
      if (loaderBar) loaderBar.style.width = pct + '%';
      if (loaderPct) loaderPct.textContent  = pct + '%';
      if (done >= total) onComplete();
    }

    VIDEO_SRCS.forEach((src, i) => {
      const v = document.createElement('video');
      v.src         = src;
      v.muted       = true;
      v.loop        = true;
      v.playsInline = true;
      v.preload     = 'auto';

      let fired = false;
      const timeout = setTimeout(() => {
        if (!fired) { fired = true; onReady(); }
      }, 5000);

      v.addEventListener('canplaythrough', () => {
        if (!fired) { fired = true; clearTimeout(timeout); onReady(); }
      }, { once: true });

      videoEls[i] = v;
    });
  }

  /* =========================================================
     7. SEÇÕES — posicionar no midpoint
  ========================================================= */
  function positionSections() {
    const totalH = scrollCont.offsetHeight;
    document.querySelectorAll('.scroll-section').forEach(sec => {
      const enter = parseFloat(sec.dataset.enter) / 100;
      const leave = parseFloat(sec.dataset.leave) / 100;
      sec.style.top       = `${((enter + leave) / 2) * totalH}px`;
      sec.style.transform = 'translateY(-50%)';
    });
  }

  /* =========================================================
     8. SEÇÕES — setup de animações GSAP (7 tipos)
  ========================================================= */
  const sectionCfgs = [];

  function setupSections() {
    document.querySelectorAll('.scroll-section').forEach(sec => {
      const type    = sec.dataset.animation || 'fade-up';
      const persist = sec.dataset.persist === 'true';
      const enter   = parseFloat(sec.dataset.enter) / 100;
      const leave   = parseFloat(sec.dataset.leave) / 100;

      const children = [...sec.querySelectorAll(
        '.sec-label, .section-heading, .section-body, .section-note, ' +
        '.areas-list li, .cta-button, .cta-deco, .btn, .stat, .stats-grid'
      )];

      gsap.set(sec, { opacity: 0 });

      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });

      switch (type) {
        case 'fade-up':
          gsap.set(children, { y: 50, opacity: 0 });
          tl.to(children, { y: 0, opacity: 1, stagger: 0.12, duration: 0.9 });
          break;
        case 'slide-left':
          gsap.set(children, { x: -80, opacity: 0 });
          tl.to(children, { x: 0, opacity: 1, stagger: 0.14, duration: 0.9 });
          break;
        case 'slide-right':
          gsap.set(children, { x: 80, opacity: 0 });
          tl.to(children, { x: 0, opacity: 1, stagger: 0.14, duration: 0.9 });
          break;
        case 'scale-up':
          gsap.set(children, { scale: 0.85, opacity: 0 });
          tl.to(children, { scale: 1, opacity: 1, stagger: 0.12, duration: 1.0, ease: 'power2.out' });
          break;
        case 'rotate-in':
          gsap.set(children, { y: 40, rotation: 3, opacity: 0 });
          tl.to(children, { y: 0, rotation: 0, opacity: 1, stagger: 0.1, duration: 0.9 });
          break;
        case 'stagger-up':
          gsap.set(children, { y: 60, opacity: 0 });
          tl.to(children, { y: 0, opacity: 1, stagger: 0.15, duration: 0.8 });
          break;
        case 'clip-reveal':
          gsap.set(children, { clipPath: 'inset(100% 0 0 0)', opacity: 0 });
          tl.to(children, {
            clipPath: 'inset(0% 0 0 0)',
            opacity:  1,
            stagger:  0.15,
            duration: 1.2,
            ease:     'power4.inOut',
          });
          break;
        default:
          gsap.set(children, { opacity: 0 });
          tl.to(children, { opacity: 1, stagger: 0.1, duration: 0.8 });
      }

      sectionCfgs.push({ sec, tl, enter, leave, persist, played: false });
    });
  }

  /* =========================================================
     9. SEÇÕES — visibilidade e play/reset de animação
  ========================================================= */
  function updateSections(p) {
    sectionCfgs.forEach(cfg => {
      const { sec, tl, enter, leave, persist } = cfg;
      const active = p >= enter && (persist || p <= leave);

      if (active) {
        if (!cfg.played) {
          cfg.played = true;
          gsap.to(sec, { opacity: 1, duration: 0.25, ease: 'power2.out' });
          sec.classList.add('is-active');
          tl.restart();
        }
      } else if (!persist && cfg.played) {
        cfg.played = false;
        gsap.to(sec, {
          opacity: 0, duration: 0.25, ease: 'power2.in',
          onComplete() { sec.classList.remove('is-active'); tl.pause(0); },
        });
      }
    });
  }

  /* =========================================================
     10. CONTADORES — stats section
  ========================================================= */
  function animateCounters() {
    document.querySelectorAll('.stat-number').forEach(el => {
      const target   = parseFloat(el.dataset.value);
      const decimals = parseInt(el.dataset.decimals || '0');
      gsap.fromTo(el,
        { textContent: 0 },
        {
          textContent: target,
          duration:    2.2,
          ease:        'power1.out',
          snap:        { textContent: decimals === 0 ? 1 : 0.01 },
          onUpdate() {
            el.textContent = decimals === 0
              ? Math.round(parseFloat(el.textContent))
              : parseFloat(el.textContent).toFixed(decimals);
          },
        }
      );
    });
  }

  /* =========================================================
     11. DARK OVERLAY — cobre stats section
  ========================================================= */
  const STATS_ENTER = 0.63;
  const STATS_LEAVE = 0.73;
  const FADE_RANGE  = 0.04;

  function updateOverlay(p) {
    if (!darkOverlay) return;
    let opacity = 0;
    if      (p >= STATS_ENTER - FADE_RANGE && p <= STATS_ENTER) opacity = (p - (STATS_ENTER - FADE_RANGE)) / FADE_RANGE;
    else if (p > STATS_ENTER && p < STATS_LEAVE)                opacity = 0.88;
    else if (p >= STATS_LEAVE && p <= STATS_LEAVE + FADE_RANGE) opacity = 0.88 * (1 - (p - STATS_LEAVE) / FADE_RANGE);
    darkOverlay.style.opacity = opacity;
  }

  /* =========================================================
     12. MARQUEE — desliza com scroll
  ========================================================= */
  const MQ_ENTER = 0.32;
  const MQ_LEAVE = 0.68;

  function updateMarquee(p) {
    if (!marqueeWrap || !marqueeText) return;
    const FADE = 0.04;
    let opacity = 0;
    if      (p >= MQ_ENTER - FADE && p <= MQ_ENTER) opacity = (p - (MQ_ENTER - FADE)) / FADE;
    else if (p > MQ_ENTER && p < MQ_LEAVE)          opacity = 1;
    else if (p >= MQ_LEAVE && p <= MQ_LEAVE + FADE) opacity = 1 - (p - MQ_LEAVE) / FADE;
    marqueeWrap.style.opacity   = opacity;
    marqueeText.style.transform = `translateX(${-(p - MQ_ENTER) / (MQ_LEAVE - MQ_ENTER) * 30}%)`;
  }

  /* =========================================================
     13. HERO — circle-wipe + parallax
  ========================================================= */
  function updateHero(p) {
    if (heroSection) heroSection.style.opacity = Math.max(0, 1 - p * 18);
    const wipe = Math.min(1, Math.max(0, (p - 0.005) / 0.07));
    if (canvasWrap) canvasWrap.style.clipPath = `circle(${wipe * 80}% at 50% 50%)`;
    if (heroBg)     heroBg.style.transform    = `scale(1.04) translateY(${p * 80}px)`;
  }

  /* =========================================================
     14. HEADER — efeito ao scrollar
  ========================================================= */
  function updateHeader() {
    siteHeader && siteHeader.classList.toggle('scrolled', window.scrollY > window.innerHeight * 0.5);
  }

  /* =========================================================
     15. MAIN SCROLL TRIGGER
  ========================================================= */
  function initScrollTrigger() {
    let statsDone = false;

    ScrollTrigger.create({
      trigger: scrollCont,
      start:   'top top',
      end:     'bottom bottom',
      scrub:   true,
      onUpdate(self) {
        const p = self.progress;

        setActiveVideo(getVideoIdx(p));
        updateSections(p);
        updateOverlay(p);
        updateMarquee(p);
        updateHero(p);

        if (p >= STATS_ENTER && p <= STATS_LEAVE && !statsDone) { statsDone = true; animateCounters(); }
        if (p < STATS_ENTER) statsDone = false;
      },
    });
  }

  /* =========================================================
     16. LENIS smooth scroll
  ========================================================= */
  function initLenis() {
    const lenis = new Lenis({
      duration:    1.2,
      easing:      t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* =========================================================
     17. HERO — palavras entram em stagger
  ========================================================= */
  function animateHeroIn() {
    const words   = document.querySelectorAll('.hero-heading .word');
    const tagline = document.querySelector('.hero-tagline');
    const ctas    = document.querySelector('.hero-ctas');
    const arrow   = document.querySelector('.scroll-arrow');

    gsap.timeline()
      .to(words,   { y: 0, opacity: 1, stagger: 0.06, duration: 0.8, ease: 'power3.out' })
      .to(tagline, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }, '-=0.3')
      .to(ctas,    { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }, '-=0.3')
      .to(arrow,   { opacity: 1, duration: 0.5 }, '-=0.1');
  }

  /* =========================================================
     18. MENU MOBILE
  ========================================================= */
  function initMenu() {
    if (!menuToggle || !mainNav) return;
    menuToggle.addEventListener('click', () => {
      const open = mainNav.classList.toggle('is-open');
      menuToggle.classList.toggle('active', open);
      menuToggle.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mainNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        mainNav.classList.remove('is-open');
        menuToggle.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
    document.addEventListener('click', e => {
      if (!mainNav.contains(e.target) && !menuToggle.contains(e.target)) {
        mainNav.classList.remove('is-open');
        menuToggle.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }

  /* =========================================================
     19. SMOOTH ANCHORS
  ========================================================= */
  function initSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const href = a.getAttribute('href');
        if (href === '#') return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        const hh = siteHeader ? siteHeader.offsetHeight : 0;
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - hh - 10, behavior: 'smooth' });
      });
    });
  }

  /* =========================================================
     20. INIT — sequência de inicialização
  ========================================================= */
  function init() {
    gsap.registerPlugin(ScrollTrigger);

    resizeCanvas();
    window.addEventListener('resize', () => { resizeCanvas(); positionSections(); });
    window.addEventListener('scroll', updateHeader, { passive: true });
    initMenu();
    initSmoothAnchors();

    /* Barra de progresso falsa 0→10% enquanto vídeos carregam */
    let fake = 0;
    const ticker = setInterval(() => {
      fake = Math.min(fake + 2, 10);
      if (loaderBar) loaderBar.style.width = fake + '%';
      if (loaderPct) loaderPct.textContent  = fake + '%';
      if (fake >= 10) clearInterval(ticker);
    }, 60);

    loadVideos(() => {
      clearInterval(ticker);
      if (loaderBar) loaderBar.style.width = '100%';
      if (loaderPct) loaderPct.textContent  = '100%';

      /* Inicia primeiro vídeo e loop de renderização */
      if (videoEls[0]) videoEls[0].play().catch(() => {});
      requestAnimationFrame(drawLoop);

      setTimeout(() => {
        if (loader) loader.classList.add('hidden');
        positionSections();
        setupSections();
        initLenis();
        initScrollTrigger();
        animateHeroIn();
      }, 420);
    });
  }

  /* =========================================================
     BOOT
  ========================================================= */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
