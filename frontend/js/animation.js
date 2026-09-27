(function () {
  const CANVAS_ID = 'bg-canvas';
  const PARTICLE_DENSITY = 14000;
  const MAX_PARTICLES = 90;
  const LINK_DISTANCE = 120;
  const MOUSE_LINK_DISTANCE = 160;
  const REPEL_RADIUS = 90;
  const REPEL_STRENGTH = 0.03;
  const MAX_SPEED = 0.6;
  const SPEED = 0.15;

  let canvas, ctx;
  let particles = [];
  let rafId = null;
  let particleColor = 'rgba(102, 115, 107, 0.5)';
  const mouse = { x: null, y: null };
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function hexToRgba(hex, alpha) {
    const h = hex.replace('#', '').trim();
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }

  function readParticleColor() {
    const muted = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#66736B';
    particleColor = hexToRgba(muted, 0.5);
  }

  function createCanvas() {
    canvas = document.createElement('canvas');
    canvas.id = CANVAS_ID;
    document.body.prepend(canvas);
    ctx = canvas.getContext('2d');
  }

  function createParticles() {
    const area = window.innerWidth * window.innerHeight;
    const count = Math.min(MAX_PARTICLES, Math.floor(area / PARTICLE_DENSITY));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * SPEED,
      vy: (Math.random() - 0.5) * SPEED,
      r: Math.random() * 1.5 + 1,
    }));
  }

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createParticles();
  }

  function updateParticles() {
    particles.forEach((p) => {
      if (mouse.x !== null) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < REPEL_RADIUS && dist > 0) {
          const force = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      }

      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > MAX_SPEED) {
        p.vx = (p.vx / speed) * MAX_SPEED;
        p.vy = (p.vy / speed) * MAX_SPEED;
      }

      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1;
      if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1;
    });
  }

  function drawFrame() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    particles.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = particleColor;
      ctx.fill();
    });

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DISTANCE) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = particleColor.replace(/, [\d.]+\)/, `, ${(0.15 * (1 - dist / LINK_DISTANCE)).toFixed(2)})`);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    if (mouse.x !== null) {
      particles.forEach((p) => {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_LINK_DISTANCE) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = particleColor.replace(/, [\d.]+\)/, `, ${(0.25 * (1 - dist / MOUSE_LINK_DISTANCE)).toFixed(2)})`);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    }
  }

  function animateParticles() {
    updateParticles();
    drawFrame();
    rafId = requestAnimationFrame(animateParticles);
  }

  function onMouseMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }

  function onMouseLeave() {
    mouse.x = null;
    mouse.y = null;
  }

  function startAnimation() {
    if (rafId) return;
    if (reducedMotionQuery.matches) {
      drawFrame();
      return;
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);
    animateParticles();
  }

  function stopAnimation() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseleave', onMouseLeave);
  }

  const themeObserver = new MutationObserver(() => {
    readParticleColor();
    if (reducedMotionQuery.matches) drawFrame();
  });

  function destroyAnimation() {
    stopAnimation();
    window.removeEventListener('resize', resizeCanvas);
    reducedMotionQuery.removeEventListener('change', onMotionPreferenceChange);
    themeObserver.disconnect();
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }

  function onMotionPreferenceChange() {
    stopAnimation();
    startAnimation();
  }

  function init() {
    createCanvas();
    readParticleColor();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    reducedMotionQuery.addEventListener('change', onMotionPreferenceChange);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    startAnimation();
  }

  document.addEventListener('DOMContentLoaded', init);

  window.BackgroundAnimation = { startAnimation, stopAnimation, destroyAnimation };
})();