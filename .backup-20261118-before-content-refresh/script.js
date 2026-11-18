/* =========================================================
   THE BLOOM OF ZAHRAA — script.js
   Vanilla JS orchestration for the whole cinematic experience.
   ========================================================= */
(() => {
  'use strict';

  const svgNS = 'http://www.w3.org/2000/svg';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmall = () => window.innerWidth < 720;

  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

  /* ---------------------------------------------------------
     0. AMBIENT MUSIC (configured in config.js)
     --------------------------------------------------------- */
  class AmbientMusic {
    constructor() {
      this.audio = new Audio(CONFIG.backgroundMusic);
      this.audio.loop = CONFIG.backgroundMusicLoop;
      this.audio.preload = CONFIG.backgroundMusicPreload;
      this.audio.volume = CONFIG.backgroundMusicInitialVolume;
      this.playing = false;
      this.muted = false;
      this.fadeTimer = null;
    }
    start() {
      if (this.playing) return;
      this.playing = true;
      this.audio.play().catch(() => { this.playing = false; });
      this._fadeTo(this.muted ? 0 : CONFIG.backgroundMusicVolume, CONFIG.backgroundMusicFadeIn);
    }
    toggleMute() {
      this.muted = !this.muted;
      this._fadeTo(this.muted ? 0 : CONFIG.backgroundMusicVolume, CONFIG.backgroundMusicFadeOut);
      return this.muted;
    }
    swell() {
      if (!this.muted) this._fadeTo(CONFIG.backgroundMusicClimaxVolume, CONFIG.backgroundMusicFadeIn);
    }
    _fadeTo(targetVolume, duration) {
      clearInterval(this.fadeTimer);
      const from = this.audio.volume;
      const startedAt = performance.now();
      this.fadeTimer = window.setInterval(() => {
        const progress = Math.min(1, (performance.now() - startedAt) / duration);
        this.audio.volume = from + (targetVolume - from) * (1 - Math.pow(1 - progress, 3));
        if (progress === 1) clearInterval(this.fadeTimer);
      }, CONFIG.backgroundMusicFadeStep);
    }
  }
  const music = new AmbientMusic();

  /* ---------------------------------------------------------
     1. AMBIENT CANVAS — stars, dust, fireflies, petals, cursor glow
     --------------------------------------------------------- */
  const canvas = document.getElementById('ambient-canvas');
  const ctx2d = canvas.getContext('2d');
  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resizeCanvas() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx2d.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const rand = (a, b) => a + Math.random() * (b - a);
  const particles = { stars: [], dust: [], fireflies: [], petals: [], trail: [] };

  function seedStars() {
    const n = isSmall() ? 60 : 130;
    particles.stars = Array.from({ length: n }, () => ({
      x: rand(0, W), y: rand(0, H * 0.75),
      r: rand(0.4, 1.5),
      base: rand(0.15, 0.8),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.4, 1.1),
    }));
  }
  function seedDust() {
    const n = isSmall() ? 20 : 45;
    particles.dust = Array.from({ length: n }, () => ({
      x: rand(0, W), y: rand(0, H),
      r: rand(0.6, 1.8),
      vy: rand(-0.06, -0.02),
      vx: rand(-0.05, 0.05),
      alpha: rand(0.1, 0.5),
    }));
  }
  function seedFireflies() {
    const n = isSmall() ? 6 : 12;
    particles.fireflies = Array.from({ length: n }, () => ({
      x: rand(0, W), y: rand(H * 0.35, H * 0.85),
      r: rand(1.2, 2.4),
      vx: rand(-0.15, 0.15), vy: rand(-0.12, 0.12),
      phase: rand(0, Math.PI * 2),
    }));
  }
  seedStars(); seedDust(); seedFireflies();
  window.addEventListener('resize', () => { seedStars(); seedDust(); seedFireflies(); });

  function spawnPetal(opts = {}) {
    particles.petals.push({
      x: opts.x ?? rand(0, W),
      y: opts.y ?? -20,
      vx: opts.vx ?? rand(-0.3, 0.3),
      vy: opts.vy ?? rand(0.3, 0.9),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.02, 0.02),
      size: opts.size ?? rand(6, 13),
      sway: rand(0.4, 1.2),
      phase: rand(0, Math.PI * 2),
      life: 0,
      maxLife: opts.maxLife ?? 999999,
      burst: !!opts.burst,
    });
  }

  function drawPetalShape(p) {
    ctx2d.save();
    ctx2d.translate(p.x, p.y);
    ctx2d.rotate(p.rot);
    ctx2d.beginPath();
    ctx2d.moveTo(0, -p.size);
    ctx2d.bezierCurveTo(p.size * 0.7, -p.size * 0.4, p.size * 0.6, p.size * 0.5, 0, p.size);
    ctx2d.bezierCurveTo(-p.size * 0.6, p.size * 0.5, -p.size * 0.7, -p.size * 0.4, 0, -p.size);
    const grad = ctx2d.createLinearGradient(0, -p.size, 0, p.size);
    grad.addColorStop(0, 'rgba(194,51,73,0.9)');
    grad.addColorStop(1, 'rgba(140,16,35,0.75)');
    ctx2d.fillStyle = grad;
    ctx2d.fill();
    ctx2d.restore();
  }

  let ambientLevel = 0; // 0 none, 1 environment, 2 heavy (final petal fall)
  let lastPetalSpawn = 0;

  function updateAndDrawParticles(t) {
    ctx2d.clearRect(0, 0, W, H);

    // stars
    ctx2d.save();
    particles.stars.forEach((s) => {
      const tw = s.base + Math.sin(t * 0.001 * s.speed + s.phase) * 0.25;
      ctx2d.globalAlpha = Math.max(0, tw);
      ctx2d.fillStyle = '#f5ece3';
      ctx2d.beginPath();
      ctx2d.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx2d.fill();
    });
    ctx2d.restore();

    // dust
    ctx2d.save();
    particles.dust.forEach((d) => {
      d.x += d.vx; d.y += d.vy;
      if (d.y < -10) d.y = H + 10;
      if (d.x < -10) d.x = W + 10;
      if (d.x > W + 10) d.x = -10;
      ctx2d.globalAlpha = d.alpha;
      ctx2d.fillStyle = '#d4af6a';
      ctx2d.beginPath();
      ctx2d.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx2d.fill();
    });
    ctx2d.restore();

    // fireflies
    if (ambientLevel > 0) {
      ctx2d.save();
      particles.fireflies.forEach((f) => {
        f.x += f.vx; f.y += f.vy;
        if (f.x < 0 || f.x > W) f.vx *= -1;
        if (f.y < H * 0.3 || f.y > H * 0.9) f.vy *= -1;
        const glow = 0.4 + Math.sin(t * 0.002 + f.phase) * 0.4;
        ctx2d.globalAlpha = Math.max(0, glow);
        const grad = ctx2d.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 6);
        grad.addColorStop(0, 'rgba(244,217,154,0.9)');
        grad.addColorStop(1, 'rgba(244,217,154,0)');
        ctx2d.fillStyle = grad;
        ctx2d.beginPath();
        ctx2d.arc(f.x, f.y, f.r * 6, 0, Math.PI * 2);
        ctx2d.fill();
      });
      ctx2d.restore();
    }

    // ambient petal spawning
    if (ambientLevel > 0 && t - lastPetalSpawn > (ambientLevel === 2 ? 140 : 900)) {
      lastPetalSpawn = t;
      spawnPetal({ x: rand(0, W), y: -20, maxLife: 12000 });
    }

    // petals
    for (let i = particles.petals.length - 1; i >= 0; i--) {
      const p = particles.petals[i];
      p.life += 16;
      p.x += p.vx + Math.sin(t * 0.001 * p.sway + p.phase) * 0.4;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.burst) { p.vy += 0.01; p.vx *= 0.99; }
      drawPetalShape(p);
      if (p.y > H + 30 || p.life > p.maxLife) particles.petals.splice(i, 1);
    }

    // cursor trail
    ctx2d.save();
    for (let i = particles.trail.length - 1; i >= 0; i--) {
      const tr = particles.trail[i];
      tr.life += 16;
      tr.alpha *= 0.94;
      const grad = ctx2d.createRadialGradient(tr.x, tr.y, 0, tr.x, tr.y, tr.r);
      grad.addColorStop(0, `rgba(244,217,154,${tr.alpha})`);
      grad.addColorStop(1, 'rgba(244,217,154,0)');
      ctx2d.fillStyle = grad;
      ctx2d.beginPath();
      ctx2d.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2);
      ctx2d.fill();
      if (tr.alpha < 0.02) particles.trail.splice(i, 1);
    }
    ctx2d.restore();
  }

  function loop(t) {
    updateAndDrawParticles(t);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // cursor glow trail + parallax
  let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
  let targetTiltX = 0, targetTiltY = 0;
  window.addEventListener('pointermove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
    if (ambientLevel > 0 && !reducedMotion) {
      particles.trail.push({ x: mouseX, y: mouseY, r: rand(6, 12), alpha: 0.5, life: 0 });
      if (particles.trail.length > 40) particles.trail.shift();
    }
    const nx = (mouseX / window.innerWidth) * 2 - 1; // -1..1
    const ny = (mouseY / window.innerHeight) * 2 - 1;
    targetTiltY = nx * 6;
    targetTiltX = -ny * 5;
  });

  const skyLayer = document.getElementById('sky-layer');
  const fog1 = document.getElementById('fog-layer-1');
  const fog2 = document.getElementById('fog-layer-2');
  const flowerWrap = document.getElementById('flower-wrap');

  function parallaxLoop() {
    if (!reducedMotion) {
      const curX = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tilt-x')) || 0;
      const curY = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tilt-y')) || 0;
      const nx = curX + (targetTiltX - curX) * 0.04;
      const ny = curY + (targetTiltY - curY) * 0.04;
      document.documentElement.style.setProperty('--tilt-x', nx.toFixed(2) + 'deg');
      document.documentElement.style.setProperty('--tilt-y', ny.toFixed(2) + 'deg');
      const px = (mouseX / window.innerWidth - 0.5);
      const py = (mouseY / window.innerHeight - 0.5);
      skyLayer.style.transform = `translate(${px * -12}px, ${py * -8}px)`;
    }
    requestAnimationFrame(parallaxLoop);
  }
  requestAnimationFrame(parallaxLoop);

  /* breathing animation for the flower (soft alive feeling) */
  function breatheLoop(t) {
    const b = 1 + Math.sin(t * 0.0009) * 0.018;
    document.documentElement.style.setProperty('--breathe', b.toFixed(4));
    requestAnimationFrame(breatheLoop);
  }
  requestAnimationFrame(breatheLoop);

  /* ---------------------------------------------------------
     2. LOADING SCREEN
     --------------------------------------------------------- */
  const loadingScreen = document.getElementById('loading-screen');
  const loadingMsgEl = document.getElementById('loading-message');
  const loadingBarFill = document.getElementById('loading-bar-fill');
  const loadingPercent = document.getElementById('loading-percent');
  const loadingParticlesWrap = document.getElementById('loading-particles');

  const loadingMessages = [
    'Initializing…', 'Loading memories…', 'Growing emotions…', 'Compiling love…', 'Almost ready…',
  ];

  function spawnLoadingParticles() {
    const n = isSmall() ? 18 : 34;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.style.left = rand(0, 100) + '%';
      s.style.top = rand(0, 100) + '%';
      s.style.animationDelay = rand(0, 2.6) + 's';
      loadingParticlesWrap.appendChild(s);
    }
  }
  spawnLoadingParticles();

  async function runLoading() {
    let pct = 0;
    for (let i = 0; i < loadingMessages.length; i++) {
      loadingMsgEl.style.opacity = 0;
      await wait(140);
      loadingMsgEl.textContent = loadingMessages[i];
      loadingMsgEl.style.opacity = 1;
      const target = Math.round(((i + 1) / loadingMessages.length) * 100);
      await animateProgress(pct, target, 620 + rand(-80, 160));
      pct = target;
    }
    await wait(400);
    loadingScreen.classList.add('fade-out');
    await wait(1450);
    loadingScreen.remove();
    document.getElementById('welcome-screen').classList.remove('hidden');
  }
  function animateProgress(from, to, dur) {
    return new Promise((resolve) => {
      const start = performance.now();
      function step(now) {
        const p = Math.min(1, (now - start) / dur);
        const val = from + (to - from) * (1 - Math.pow(1 - p, 3));
        loadingBarFill.style.width = val + '%';
        loadingPercent.textContent = Math.round(val) + '%';
        if (p < 1) requestAnimationFrame(step); else resolve();
      }
      requestAnimationFrame(step);
    });
  }
  runLoading();

  /* ---------------------------------------------------------
     3. WELCOME → BEGIN
     --------------------------------------------------------- */
  const welcomeScreen = document.getElementById('welcome-screen');
  const beginBtn = document.getElementById('begin-btn');
  const scene = document.getElementById('scene');
  const soundToggle = document.getElementById('sound-toggle');
  const interactHint = document.getElementById('interact-hint');;

  beginBtn.addEventListener('click', async () => {
    music.start();
    welcomeScreen.classList.add('zooming');
    scene.classList.remove('hidden');
    ambientLevel = 1;
    await wait(1650);
    welcomeScreen.remove();
    soundToggle.classList.add('show');
    startGrowthSequence();
  }, { once: true });

  soundToggle.addEventListener('click', () => {
    const muted = music.toggleMute();
    soundToggle.setAttribute('data-on', (!muted).toString());
  });

  /* ---------------------------------------------------------
     4. FLOWER CONSTRUCTION (petals generated in JS)
     --------------------------------------------------------- */
  const outerLayer = document.querySelector('.petal-outer-layer');
  const midLayer = document.querySelector('.petal-mid-layer');
  const innerLayer = document.querySelector('.petal-inner-layer');

  function petalPath(length, width) {
    // Deliberately asymmetric botanical curves: every petal gets its own shoulder and tip.
    const left = width * rand(0.43, 0.58), right = width * rand(0.42, 0.61);
    const tipX = 150 + rand(-width * 0.16, width * 0.16);
    const tipY = 175 - length;
    const shoulderY = 175 - length * rand(0.26, 0.38);
    const crownY = 175 - length * rand(0.72, 0.85);
    return `M150,175 C${150 - left},${shoulderY.toFixed(1)} ${(tipX - left * .42).toFixed(1)},${crownY.toFixed(1)} ${tipX.toFixed(1)},${tipY.toFixed(1)} ` +
      `C${(tipX + right * .34).toFixed(1)},${(crownY + rand(-5, 5)).toFixed(1)} ${150 + right},${(shoulderY + rand(-6, 6)).toFixed(1)} 150,175 Z`;
  }

  function buildPetalRing(layerEl, count, length, width, fillId, startAngle, delayBase, delayStep) {
    const petals = [];
    for (let i = 0; i < count; i++) {
      const angle = startAngle + (360 / count) * i;
      const g = document.createElementNS(svgNS, 'g');
      g.setAttribute('transform', `rotate(${angle.toFixed(1)} 150 175)`);
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', petalPath(length + rand(-4, 4), width + rand(-3, 3)));
      path.setAttribute('fill', `url(#${fillId})`);
      path.classList.add('petal');
      path.style.animationDelay = (delayBase + i * delayStep + rand(0, 0.18)).toFixed(2) + 's';
      path.style.animationDuration = (1.5 + rand(-0.15, 0.3)).toFixed(2) + 's';
      g.appendChild(path);
      layerEl.appendChild(g);
      petals.push(path);
    }
    return petals;
  }

  const outerPetals = buildPetalRing(outerLayer, 11, 94, 48, 'petalOuterGrad', 8, 0.0, 0.11);
  const midPetals = buildPetalRing(midLayer, 9, 70, 38, 'petalMidGrad', 28, 0.8, 0.1);
  const innerPetals = buildPetalRing(innerLayer, 7, 48, 28, 'petalInnerGrad', 2, 1.55, 0.1);
  const allPetals = [...outerPetals, ...midPetals, ...innerPetals];

  function bloomPetals() {
    allPetals.forEach((p) => p.classList.add('bloom'));
  }
  function rebloomPetals() {
    allPetals.forEach((p, i) => {
      p.classList.remove('bloom');
      // force reflow so animation restarts
      void p.offsetWidth;
      p.style.animationDelay = (i * 0.045).toFixed(2) + 's';
      p.style.animationDuration = '1.1s';
      p.classList.add('bloom');
    });
  }

  /* sparkles around the flower */
  const sparkleGroup = document.getElementById('flower-sparkles');
  function seedFlowerSparkles() {
    const n = 16;
    for (let i = 0; i < n; i++) {
      const c = document.createElementNS(svgNS, 'circle');
      const ang = rand(0, Math.PI * 2);
      const dist = rand(50, 120);
      c.setAttribute('cx', (150 + Math.cos(ang) * dist).toFixed(1));
      c.setAttribute('cy', (175 + Math.sin(ang) * dist * 0.8).toFixed(1));
      c.setAttribute('r', rand(0.8, 2).toFixed(1));
      c.classList.add('spark', 'twinkle');
      c.style.animationDelay = rand(0, 3).toFixed(2) + 's';
      c.style.animationDuration = (2 + rand(0, 2)).toFixed(2) + 's';
      sparkleGroup.appendChild(c);
    }
  }
  seedFlowerSparkles();

  /* ---------------------------------------------------------
     5. GROWTH SEQUENCE
     --------------------------------------------------------- */
  const seedEl = document.getElementById('seed');
  const groundGlow = document.getElementById('ground-glow');
  const rootsEl = document.getElementById('roots');
  const stemEl = document.getElementById('stem');
  const stemRimEl = document.getElementById('stem-rim');
  const leavesEl = document.getElementById('leaves');
  const flowerCore = document.getElementById('flower-core');

  async function startGrowthSequence() {
    // seed falls
    seedEl.classList.add('falling');
    await wait(2000);
    groundGlow.classList.add('lit');
    await wait(500);
    groundGlow.classList.add('pulse');

    // roots grow underground
    rootsEl.classList.add('grow');
    await wait(600);

    // stem grows upward
    stemEl.classList.add('grow');
    stemRimEl.classList.add('grow');
    await wait(1100);

    // leaves unfurl
    leavesEl.classList.add('show');
    await wait(1400);

    // bloom: the rose opens one petal at a time before it reveals its heart.
    flowerCore.classList.add('bloomed');
    bloomPetals();
    await wait(2900);
    flowerCore.classList.add('heart-ready');
    crystalHeart.classList.add('reveal');
    music.swell();
    await wait(1900);

    // Let the fully opened rose breathe in silence before the story turns its page.
    await wait(4000);
    openBook();
  }
  /* ---------------------------------------------------------
     7. INTERACTIVE FLOWER STAGE
     --------------------------------------------------------- */
  let interactiveActive = false;
  let idleTimer = null;

  function enterInteractiveStage() {
    interactiveActive = true;
    interactHint.classList.add('show');
    resetIdleTimer();
  }
  function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (interactiveActive) openBook(); }, 14000);
  }

  flowerWrap.addEventListener('pointerenter', () => {
    if (!interactiveActive) return;
    flowerWrap.classList.add('hovered');
  });
  flowerWrap.addEventListener('pointerleave', () => flowerWrap.classList.remove('hovered'));

  flowerWrap.addEventListener('click', (e) => {
    if (!interactiveActive) return;
    resetIdleTimer();
    burstHearts(e);
    burstSparkles();
    flyPetalsFromFlower();
    if (navigator.vibrate) navigator.vibrate(18);
    interactHint.classList.remove('show');
    setTimeout(() => { if (interactiveActive) openBook(); }, 1400);
  });

  function heartSVG() {
    return `<svg viewBox="0 0 32 29" xmlns="${svgNS}"><path fill="currentColor" d="M16 29C16 29 1 18.6 1 9.6 1 4.3 5 1 9.6 1c2.9 0 5.3 1.5 6.4 3.8C17.1 2.5 19.5 1 22.4 1 27 1 31 4.3 31 9.6 31 18.6 16 29 16 29Z"/></svg>`;
  }

  function burstHearts(e) {
    const rect = flowerWrap.getBoundingClientRect();
    const n = 10;
    for (let i = 0; i < n; i++) {
      const h = document.createElement('div');
      h.className = 'burst-heart';
      h.innerHTML = heartSVG();
      const ang = rand(-Math.PI * 0.85, -Math.PI * 0.15);
      const dist = rand(60, 150);
      h.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
      h.style.setProperty('--dy', `${Math.sin(ang) * dist}px`);
      h.style.setProperty('--dr', `${rand(-40, 40)}deg`);
      h.style.left = `${((e.clientX ?? rect.left + rect.width / 2) - rect.left) / rect.width * 100}%`;
      h.style.top = `${((e.clientY ?? rect.top + rect.height / 2) - rect.top) / rect.height * 100}%`;
      flowerWrap.appendChild(h);
      setTimeout(() => h.remove(), 1500);
    }
  }
  function burstSparkles() {
    const rect = flowerWrap.getBoundingClientRect();
    for (let i = 0; i < 14; i++) {
      particles.trail.push({
        x: rect.left + rect.width / 2 + rand(-60, 60),
        y: rect.top + rect.height * 0.4 + rand(-60, 40),
        r: rand(4, 9), alpha: 0.8, life: 0,
      });
    }
  }
  function flyPetalsFromFlower() {
    const rect = flowerWrap.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      spawnPetal({
        x: rect.left + rect.width / 2 + rand(-40, 40),
        y: rect.top + rect.height * 0.35,
        vx: rand(-1.6, 1.6), vy: rand(-1.4, -0.4),
        size: rand(7, 12), burst: true, maxLife: 3200,
      });
    }
  }

  /* mouse rotates flower slightly (independent of global parallax tilt) */
  flowerWrap.addEventListener('pointermove', (e) => {
    if (!interactiveActive) return;
    const rect = flowerWrap.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    targetTiltY = nx * 16;
  });

  /* ---------------------------------------------------------
     8. THE POETRY BOOK + HANDWRITTEN LETTER
     --------------------------------------------------------- */
  const crystalHeart = document.getElementById('crystal-heart');
  const storybook = document.getElementById('storybook');
  const letterPaper = document.getElementById('letter-paper');
  const letterBody = document.getElementById('letter-body');
  const finishJourney = document.getElementById('finish-journey');
  let bookOpen = false;

  function openBook() {
    if (bookOpen) return;
    bookOpen = true;
    interactiveActive = false;
    clearTimeout(idleTimer);
    interactHint.classList.remove('show');
    document.body.classList.add('story-active');
    storybook.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => document.body.scrollTo({ top: window.innerHeight, behavior: reducedMotion ? 'auto' : 'smooth' }), 260);
  }

  function writeLetter() {
    if (letterBody.dataset.written) return;
    letterBody.dataset.written = 'true';
    const lines = letterBody.dataset.text.split('|');
    letterBody.classList.add('writing');
    let lineIndex = 0;
    const writeNextLine = () => {
      if (lineIndex >= lines.length) {
        letterBody.classList.remove('writing');
        finishJourney.classList.add('ready');
        return;
      }
      const line = document.createElement('span');
      line.className = 'written-line';
      letterBody.appendChild(line);
      const words = Array.from(lines[lineIndex++]);
      let index = 0;
      const timer = window.setInterval(() => {
        line.textContent += words[index++];
        if (index >= words.length) { window.clearInterval(timer); window.setTimeout(writeNextLine, 550); }
      }, reducedMotion ? 1 : 58);
    };
    writeNextLine();
  }

  const scrollReveal = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      if (entry.target === letterPaper) window.setTimeout(writeLetter, reducedMotion ? 0 : 850);
      scrollReveal.unobserve(entry.target);
    });
  }, { threshold: .2 });
  document.querySelectorAll('[data-scroll-reveal]').forEach((el) => scrollReveal.observe(el));

  finishJourney.addEventListener('click', () => {
    ambientLevel = 2;
    music.swell();
    for (let i = 0; i < 48; i++) {
      window.setTimeout(() => spawnPetal({ x: rand(0, W), y: -20, vy: rand(.65, 1.45), maxLife: 9000 }), i * 78);
    }
    document.getElementById('ending-section').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  });

  /* ---------------------------------------------------------
     9. REPLAY THE ENTIRE JOURNEY
     --------------------------------------------------------- */
  document.getElementById('replay-journey').addEventListener('click', async () => {
    document.body.scrollTo({ top: 0, behavior: 'auto' });
    document.body.classList.remove('story-active');
    bookOpen = false;
    storybook.setAttribute('aria-hidden', 'true');
    letterBody.replaceChildren();
    delete letterBody.dataset.written;
    finishJourney.classList.remove('ready');
    document.querySelectorAll('[data-scroll-reveal]').forEach((el) => {
      el.classList.remove('is-visible');
      scrollReveal.observe(el);
    });
    seedEl.classList.remove('falling');
    groundGlow.classList.remove('lit', 'pulse');
    rootsEl.classList.remove('grow');
    stemEl.classList.remove('grow');
    stemRimEl.classList.remove('grow');
    leavesEl.classList.remove('show');
    flowerCore.classList.remove('bloomed');
    flowerCore.classList.remove('heart-ready');
    allPetals.forEach((p) => p.classList.remove('bloom'));
    crystalHeart.classList.remove('reveal');
    lineEls.forEach((el) => { el.classList.remove('show', 'riseaway'); el.textContent = ''; });
    ambientLevel = 1;
    particles.petals = [];

    void seedEl.offsetWidth; // reflow to allow re-trigger
    await wait(300);
    startGrowthSequence();
  });

})();
