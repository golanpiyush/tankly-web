/* ════════════════════════════════════════
   TANKLY — main.js
   Three.js particle water sim + all UI logic
════════════════════════════════════════ */

(function () {
  'use strict';

  /* ──────────────────────────────────────
     1. OCEAN CANVAS — Three.js particle sim
     Graceful fallback to CSS canvas if
     Three.js doesn't load in time.
  ────────────────────────────────────── */

  function initThreeScene() {
    if (typeof THREE === 'undefined') {
      initFallbackCanvas();
      return;
    }

    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(0, 0, 5);

    /* ── PARTICLES ── */
    const PARTICLE_COUNT = window.innerWidth < 768 ? 1200 : 2800;
    const positions  = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const phases     = new Float32Array(PARTICLE_COUNT);
    const sizes      = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      velocities[i * 3]     = (Math.random() - 0.5) * 0.004;
      velocities[i * 3 + 1] = Math.random() * 0.006 + 0.001;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
      phases[i]  = Math.random() * Math.PI * 2;
      sizes[i]   = Math.random() * 2.2 + 0.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    /* Circle texture */
    const texCanvas = document.createElement('canvas');
    texCanvas.width = texCanvas.height = 32;
    const tc = texCanvas.getContext('2d');
    const grd = tc.createRadialGradient(16, 16, 0, 16, 16, 16);
    grd.addColorStop(0,   'rgba(110,220,208,1)');
    grd.addColorStop(0.4, 'rgba(0,196,168,0.8)');
    grd.addColorStop(1,   'rgba(0,196,168,0)');
    tc.fillStyle = grd;
    tc.beginPath();
    tc.arc(16, 16, 16, 0, Math.PI * 2);
    tc.fill();
    const tex = new THREE.CanvasTexture(texCanvas);

    const mat = new THREE.PointsMaterial({
      map: tex,
      size: 0.12,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0x00c4a8,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    /* ── LIGHT RAYS ── */
    const rayGeo = new THREE.PlaneGeometry(0.06, 14);
    const rayMat = new THREE.MeshBasicMaterial({
      color: 0x00c4a8,
      transparent: true,
      opacity: 0.025,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const RAY_COUNT = window.innerWidth < 768 ? 4 : 8;
    const rays = [];
    for (let r = 0; r < RAY_COUNT; r++) {
      const ray = new THREE.Mesh(rayGeo, rayMat.clone());
      ray.position.set(
        (Math.random() - 0.5) * 18,
        2 + Math.random() * 3,
        (Math.random() - 0.5) * 4
      );
      ray.rotation.z = (Math.random() - 0.5) * 0.35;
      scene.add(ray);
      rays.push({ mesh: ray, speed: Math.random() * 0.3 + 0.15, phase: Math.random() * Math.PI * 2 });
    }

    /* ── MOUSE ── */
    const mouse = { x: 0, y: 0 };
    window.addEventListener('mousemove', (e) => {
      mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    /* ── RESIZE ── */
    function onResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    onResize();
    window.addEventListener('resize', onResize, { passive: true });

    /* ── ANIMATE ── */
    let t = 0;
    let raf;

    function tick() {
      raf = requestAnimationFrame(tick);
      t += 0.008;

      const pos = geo.attributes.position.array;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        pos[i3]     += velocities[i3]     + Math.sin(t * 0.6 + phases[i]) * 0.0015;
        pos[i3 + 1] += velocities[i3 + 1];
        pos[i3 + 2] += velocities[i3 + 2];

        // Wrap vertically
        if (pos[i3 + 1] > 7) {
          pos[i3 + 1] = -7;
          pos[i3]     = (Math.random() - 0.5) * 20;
        }
        // Wrap horizontally
        if (pos[i3] >  11) pos[i3] = -11;
        if (pos[i3] < -11) pos[i3] =  11;
      }
      geo.attributes.position.needsUpdate = true;

      // Light ray flicker
      rays.forEach((r, idx) => {
        r.mesh.material.opacity = 0.015 + 0.018 * Math.sin(t * r.speed + r.phase);
        r.mesh.rotation.z += Math.sin(t * 0.12 + idx) * 0.0008;
      });

      // Subtle camera drift
      camera.position.x += (mouse.x * 0.3 - camera.position.x) * 0.02;
      camera.position.y += (mouse.y * 0.15 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }

    tick();

    // Pause when tab hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else tick();
    });
  }

  /* Fallback: minimal 2D canvas */
  function initFallbackCanvas() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, t = 0, raf;

    const dots = [];
    function init() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
      dots.length = 0;
      const n = Math.floor(W * H / 8000);
      for (let i = 0; i < n; i++) {
        dots.push({ x: Math.random()*W, y: Math.random()*H, r: 0.6+Math.random()*1.8, sp: 0.3+Math.random()*0.7, ph: Math.random()*Math.PI*2 });
      }
    }
    init();
    window.addEventListener('resize', init, { passive: true });

    function draw() {
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);
      t += 0.015;
      dots.forEach(d => {
        d.y -= d.sp * 0.35;
        if (d.y < -10) { d.y = H + 10; d.x = Math.random()*W; }
        const a = 0.06 + 0.08 * (0.5 + 0.5*Math.sin(t*d.sp+d.ph));
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(0,196,168,${a})`;
        ctx.fill();
      });
    }
    draw();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else draw();
    });
  }

  /* Wait for Three.js CDN or fallback after short delay */
  function startCanvas() {
    if (typeof THREE !== 'undefined') {
      initThreeScene();
    } else {
      // Give CDN 600ms to load, else fall back
      const timer = setTimeout(initFallbackCanvas, 600);
      window.addEventListener('load', () => {
        if (typeof THREE !== 'undefined') {
          clearTimeout(timer);
          initThreeScene();
        }
      });
    }
  }
  startCanvas();


  /* ──────────────────────────────────────
     2. NAV — scroll state
  ────────────────────────────────────── */
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 50);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }


  /* ──────────────────────────────────────
     3. HAMBURGER MENU
  ────────────────────────────────────── */
  const hamburger   = document.getElementById('hamburgerBtn');
  const mobileMenu  = document.getElementById('mobileMenu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', String(open));
      mobileMenu.setAttribute('aria-hidden',  String(!open));
    });
    // Close on link click
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
      });
    });
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
      }
    });
  }


  /* ──────────────────────────────────────
     4. HERO — staggered fade-in on load
  ────────────────────────────────────── */
  window.addEventListener('load', () => {
    document.querySelectorAll('.js-fade').forEach(el => {
      const delay = parseInt(el.dataset.delay || 0, 10);
      setTimeout(() => el.classList.add('in'), delay);
    });
  });


  /* ──────────────────────────────────────
     5. SCROLL REVEAL
  ────────────────────────────────────── */
  const revealObs = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          revealObs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -28px 0px' }
  );
  document.querySelectorAll('.js-reveal').forEach(el => revealObs.observe(el));


  /* ──────────────────────────────────────
     6. FAQ ACCORDION
  ────────────────────────────────────── */
  document.querySelectorAll('.faq-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const body   = btn.nextElementSibling;
      const isOpen = body.classList.contains('open');

      // Close all
      document.querySelectorAll('.faq-body').forEach(b => b.classList.remove('open'));
      document.querySelectorAll('.faq-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));

      // Open clicked if was closed
      if (!isOpen) {
        body.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });


  /* ──────────────────────────────────────
     7. CARD TILT on hover (desktop only)
  ────────────────────────────────────── */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.f-card, .plan-card, .sync-card, .cta-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r  = card.getBoundingClientRect();
        const rx = ((e.clientY - r.top)  / r.height - 0.5) * -5;
        const ry = ((e.clientX - r.left) / r.width  - 0.5) *  5;
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-3px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }


  /* ──────────────────────────────────────
     8. HERO PHONES — mouse parallax
  ────────────────────────────────────── */
  const heroPhones = document.getElementById('heroPhones');
  if (heroPhones && window.matchMedia('(hover: hover)').matches) {
    document.addEventListener('mousemove', e => {
      const dx = (e.clientX / window.innerWidth  - 0.5) * 12;
      const dy = (e.clientY / window.innerHeight - 0.5) *  7;
      heroPhones.style.transform = `translate(${dx}px, ${dy}px)`;
    }, { passive: true });
  }


  /* ──────────────────────────────────────
     9. SMOOTH SCROLL for anchor links
  ────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id  = a.getAttribute('href').slice(1);
      const el  = id ? document.getElementById(id) : null;
      if (!el) return;
      e.preventDefault();
      const top = el.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });


  /* ──────────────────────────────────────
     10. REDUCED MOTION — kill particle anim
  ────────────────────────────────────── */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const c = document.getElementById('hero-canvas');
    if (c) c.style.display = 'none';
    document.querySelectorAll('.bbl').forEach(b => b.style.animation = 'none');
  }

})();