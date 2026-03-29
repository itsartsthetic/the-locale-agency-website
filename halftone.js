(function () {
  const canvas = document.getElementById('hero-halftone');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const DOT_SPACING = isMobile ? 24 : 16;
  const MAX_RADIUS = DOT_SPACING * 0.42;
  const MIN_RADIUS = 1;
  const COLOR = '#013927';
  const MOUSE_RADIUS = 150;
  const WAVE_SPEED = 0.0008;
  const WAVE_AMPLITUDE = 0.3;

  let dots = [];
  let mouse = { x: -9999, y: -9999 };
  let scrollY = 0;
  let time = 0;
  let animating = false;
  let imgData = null;

  function resize() {
    const container = canvas.parentElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildGrid(w, h);
  }

  function buildGrid(w, h) {
    dots = [];
    const cols = Math.floor(w / DOT_SPACING);
    const rows = Math.floor(h / DOT_SPACING);
    const offsetX = (w - cols * DOT_SPACING) / 2 + DOT_SPACING / 2;
    const offsetY = (h - rows * DOT_SPACING) / 2 + DOT_SPACING / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * DOT_SPACING;
        const y = offsetY + r * DOT_SPACING;
        let brightness = 0.5;
        if (imgData) {
          const ix = Math.floor((x / w) * imgData.width);
          const iy = Math.floor((y / h) * imgData.height);
          const idx = (iy * imgData.width + ix) * 4;
          const rr = imgData.data[idx];
          const gg = imgData.data[idx + 1];
          const bb = imgData.data[idx + 2];
          brightness = (rr * 0.299 + gg * 0.587 + bb * 0.114) / 255;
        }
        const baseRadius = MIN_RADIUS + (1 - brightness) * (MAX_RADIUS - MIN_RADIUS);
        dots.push({
          x: x,
          y: y,
          baseRadius: baseRadius,
          radius: baseRadius,
          col: c,
          row: r
        });
      }
    }
  }

  function loadImage() {
    const heroVisual = document.querySelector('.hero-visual');
    if (!heroVisual) {
      resize();
      return;
    }
    const bgUrl = heroVisual.style.backgroundImage;
    const match = bgUrl.match(/url\(['"]?(.*?)['"]?\)/);
    if (!match) {
      resize();
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = img.naturalWidth;
      offCanvas.height = img.naturalHeight;
      const offCtx = offCanvas.getContext('2d');
      offCtx.drawImage(img, 0, 0);
      imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
      resize();
    };
    img.onerror = function () {
      resize();
    };
    img.src = match[1];
  }

  function draw() {
    const w = canvas.style.width ? parseInt(canvas.style.width) : canvas.parentElement.offsetWidth;
    const h = canvas.style.height ? parseInt(canvas.style.height) : canvas.parentElement.offsetHeight;
    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      let targetRadius = dot.baseRadius;

      // Wave animation
      if (!prefersReducedMotion) {
        const wave = Math.sin((dot.col + dot.row) * 0.3 + time * WAVE_SPEED + scrollY * 0.002);
        targetRadius += wave * WAVE_AMPLITUDE * dot.baseRadius;
      }

      // Mouse interaction (desktop only)
      if (!isMobile && !prefersReducedMotion) {
        const dx = dot.x - mouse.x;
        const dy = dot.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS) {
          const influence = 1 - dist / MOUSE_RADIUS;
          const ease = influence * influence;
          targetRadius += ease * MAX_RADIUS * 0.8;
        }
      }

      targetRadius = Math.max(MIN_RADIUS * 0.5, Math.min(targetRadius, MAX_RADIUS * 1.5));

      // Smooth lerp
      dot.radius += (targetRadius - dot.radius) * 0.12;

      const opacity = 0.15 + (dot.radius / (MAX_RADIUS * 1.5)) * 0.65;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
      ctx.fillStyle = COLOR;
      ctx.globalAlpha = opacity;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function animate(t) {
    if (!animating) return;
    time = t;
    draw();
    requestAnimationFrame(animate);
  }

  // Intersection observer to pause when off screen
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        if (!animating) {
          animating = true;
          if (!prefersReducedMotion) {
            requestAnimationFrame(animate);
          }
        }
      } else {
        animating = false;
      }
    });
  }, { threshold: 0 });

  io.observe(canvas.parentElement);

  // Mouse tracking
  if (!isMobile) {
    canvas.parentElement.addEventListener('mousemove', function (e) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });

    canvas.parentElement.addEventListener('mouseleave', function () {
      mouse.x = -9999;
      mouse.y = -9999;
    });
  }

  // Scroll tracking
  window.addEventListener('scroll', function () {
    scrollY = window.pageYOffset;
  }, { passive: true });

  // Resize handling
  let resizeTimeout;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
      resize();
      if (prefersReducedMotion) draw();
    }, 200);
  });

  // Init
  loadImage();

  // Static render for reduced motion
  if (prefersReducedMotion) {
    setTimeout(function () {
      draw();
    }, 100);
  }
})();
