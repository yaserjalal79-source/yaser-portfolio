// ---------- Helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
// Motion is on by default, even when the system asks for reduced motion.
// Visitors can switch it off with the Motion button in the nav.
const motionOff = (() => {
  try {
    return localStorage.getItem("motion") === "off";
  } catch {
    return false;
  }
})();
const reduceMotion = motionOff;
const mobileView = window.matchMedia("(max-width: 900px), (hover: none)").matches;
document.documentElement.classList.toggle("motion-off", motionOff);

// Always start at the top on refresh (the browser would otherwise restore the old position).
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);

$("#year").textContent = new Date().getFullYear();

// ---------- Custom cursor ----------
const cursor = $(".cursor");
if (finePointer && cursor) {
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let cx = x;
  let cy = y;

  window.addEventListener("pointermove", (e) => {
    x = e.clientX;
    y = e.clientY;
  });

  const tick = () => {
    cx += (x - cx) * 0.45;
    cy += (y - cy) * 0.45;
    cursor.style.left = `${cx}px`;
    cursor.style.top = `${cy}px`;
    requestAnimationFrame(tick);
  };
  tick();

  $$("a, button, .sticker, .card, .polaroid").forEach((el) => {
    el.addEventListener("pointerenter", () => cursor.classList.add("active"));
    el.addEventListener("pointerleave", () => cursor.classList.remove("active"));
  });
}

// ---------- Magnetic links & buttons ----------
if (finePointer && !reduceMotion) {
  $$("[data-magnetic]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * 0.25}px, ${dy * 0.35}px)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transform = "";
    });
  });
}

// ---------- 3D tilt on cards ----------
if (finePointer && !reduceMotion) {
  $$(".tilt").forEach((card) => {
    // Targets are where the pointer wants the card; the current values
    // ease toward them every frame so the lean moves smoothly both ways.
    let tiltX = 0;
    let tiltY = 0;
    let lift = 0;
    let targetX = 0;
    let targetY = 0;
    let targetLift = 0;
    let frame = 0;

    const animateTilt = () => {
      tiltX += (targetX - tiltX) * 0.12;
      tiltY += (targetY - tiltY) * 0.12;
      lift += (targetLift - lift) * 0.12;

      const settled =
        targetX === 0 && targetY === 0 && targetLift === 0 &&
        Math.abs(tiltX) < 0.01 && Math.abs(tiltY) < 0.01 && Math.abs(lift) < 0.05;
      if (settled) {
        card.style.transform = "";
        frame = 0;
        return;
      }

      card.style.transform = `perspective(900px) rotateY(${tiltX}deg) rotateX(${tiltY}deg) translateY(${lift}px)`;
      frame = requestAnimationFrame(animateTilt);
    };

    const startTilt = () => {
      if (!frame) frame = requestAnimationFrame(animateTilt);
    };

    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      targetX = px * 16;
      targetY = -py * 16;
      targetLift = -6;
      startTilt();
    });

    card.addEventListener("pointerleave", () => {
      targetX = 0;
      targetY = 0;
      targetLift = 0;
      startTilt();
    });
  });
}

// ---------- Draggable stickers ----------
$$(".sticker[data-drag]").forEach((sticker) => {
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;
  let dragging = false;

  sticker.addEventListener("pointerdown", (e) => {
    dragging = true;
    sticker.classList.add("dragging");
    sticker.setPointerCapture(e.pointerId);
    startX = e.clientX;
    startY = e.clientY;
    const r = sticker.getBoundingClientRect();
    const parent = sticker.offsetParent.getBoundingClientRect();
    originX = r.left - parent.left;
    originY = r.top - parent.top;
    // Pin to pixel coordinates so dragging is relative to where it sits now.
    sticker.style.left = `${originX}px`;
    sticker.style.top = `${originY}px`;
    sticker.style.right = "auto";
    sticker.style.bottom = "auto";
  });

  sticker.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    sticker.style.left = `${originX + dx}px`;
    sticker.style.top = `${originY + dy}px`;
    sticker.style.transform = `rotate(${dx * 0.05}deg)`;
  });

  const stop = () => {
    dragging = false;
    sticker.classList.remove("dragging");
    sticker.style.transform = "";
  };
  sticker.addEventListener("pointerup", stop);
  sticker.addEventListener("pointercancel", stop);
});

// ---------- Scroll reveal ----------
const revealTargets = $$(
  ".section-head, .card, .polaroid-wrap, .about-copy, .contact-title, .mail, .socials, .fine"
);
revealTargets.forEach((el) => el.classList.add("reveal"));

const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);
revealTargets.forEach((el, i) => {
  el.style.transitionDelay = `${(i % 3) * 90}ms`;
  io.observe(el);
});

// ---------- Motion toggle ----------
const motionBtn = $(".motion-toggle");
motionBtn.textContent = motionOff ? "Motion off" : "Motion on";
motionBtn.setAttribute("aria-pressed", String(!motionOff));
motionBtn.addEventListener("click", () => {
  try {
    localStorage.setItem("motion", motionOff ? "on" : "off");
  } catch {
    /* storage blocked: the choice lasts only until the next reload */
  }
  // Tell the next load to skip the intro, so switching motion does not replay it.
  try {
    sessionStorage.setItem("skipIntro", "1");
  } catch {
    /* ignored: the intro simply replays */
  }
  location.reload();
});

// ---------- Theme toggle ----------
const root = document.documentElement;
const themeBtn = $(".theme-toggle");
const savedTheme = (() => {
  try {
    return localStorage.getItem("theme");
  } catch {
    return null;
  }
})();
if (savedTheme) root.dataset.theme = savedTheme;

themeBtn.addEventListener("click", () => {
  const isDark =
    root.dataset.theme === "dark" ||
    (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = isDark ? "light" : "dark";
  try {
    localStorage.setItem("theme", root.dataset.theme);
  } catch {
    /* storage may be blocked; the toggle still works for this visit */
  }
});

// ---------- Lab: interactive gradient wave ----------
const canvas = $("#labCanvas");
const ctx = canvas.getContext("2d");
const pointer = { x: -999, y: -999, active: false };
const ripples = [];
const palette = ["#ff8ad8", "#6b5cff", "#f5e663", "#9ad0ff"];
let w = 0;
let h = 0;
let t = 0;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  w = r.width;
  h = r.height;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resize();
window.addEventListener("resize", resize);

canvas.addEventListener("pointermove", (e) => {
  const r = canvas.getBoundingClientRect();
  pointer.x = e.clientX - r.left;
  pointer.y = e.clientY - r.top;
  pointer.active = true;
});
canvas.addEventListener("pointerleave", () => {
  pointer.active = false;
});
canvas.addEventListener("pointerdown", (e) => {
  const r = canvas.getBoundingClientRect();
  ripples.push({
    x: e.clientX - r.left,
    y: e.clientY - r.top,
    r: 0,
    life: 1,
    color: palette[ripples.length % palette.length],
  });
});

function drawLab() {
  if (!labVisible) {
    labRunning = false;
    return;
  }
  t += reduceMotion ? 0 : 0.012;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  // Layered sine bands that bend toward the cursor.
  for (let band = 0; band < 6; band++) {
    ctx.beginPath();
    const yBase = (h / 7) * (band + 1);
    for (let x = 0; x <= w; x += 8) {
      const d = pointer.active ? Math.hypot(x - pointer.x, yBase - pointer.y) : 9999;
      const pull = pointer.active ? Math.max(0, 1 - d / 260) * 60 : 0;
      const y =
        yBase +
        Math.sin(x * 0.008 + t * (1 + band * 0.2) + band) * (28 + band * 4) +
        Math.sin(x * 0.02 - t * 2) * 8 -
        (pointer.active ? (pointer.y - yBase) * pull * 0.01 : 0);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, palette[band % palette.length]);
    grad.addColorStop(1, palette[(band + 2) % palette.length]);
    ctx.strokeStyle = grad;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // Click ripples.
  ripples.forEach((rp) => {
    rp.r += 6;
    rp.life -= 0.012;
    ctx.globalAlpha = Math.max(rp.life, 0);
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
    ctx.strokeStyle = rp.color;
    ctx.lineWidth = 3;
    ctx.stroke();
  });
  for (let i = ripples.length - 1; i >= 0; i--) {
    if (ripples[i].life <= 0) ripples.splice(i, 1);
  }

  // Cursor glow.
  if (pointer.active) {
    const g = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 120);
    g.addColorStop(0, "rgba(255,138,216,0.45)");
    g.addColorStop(1, "rgba(255,138,216,0)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(pointer.x - 120, pointer.y - 120, 240, 240);
  }

  ctx.globalAlpha = 1;
  requestAnimationFrame(drawLab);
}

// Only animate the lab while it is on screen.
let labVisible = false;
let labRunning = false;
new IntersectionObserver(([entry]) => {
  labVisible = entry.isIntersecting;
  if (labVisible && !labRunning) {
    labRunning = true;
    requestAnimationFrame(drawLab);
  }
}).observe(canvas);

// ---------- Intro: block field with a title ----------
function runIntro() {
  const intro = $("#intro");
  const introCanvas = $("#introCanvas");
  const titleEl = $(".intro-title");
  if (!intro || !introCanvas || !titleEl) return;

  // The intro plays on every load, unless motion is off or the page was
  // reloaded by the Motion button.
  let skipIntro = false;
  try {
    skipIntro = sessionStorage.getItem("skipIntro") === "1";
    sessionStorage.removeItem("skipIntro");
  } catch {
    /* storage blocked: the intro plays */
  }
  if (reduceMotion || skipIntro) {
    document.body.classList.remove("intro-on");
    intro.remove();
    return;
  }

  // Timeline in seconds: blocks fly in (0–3.8), the title appears (3.2–4.2),
  // the camera pushes through (4.6–6.4), a flash (5.6–6.4), then fade out.
  // The timeline is stretched so the intro lasts as long as the intro sound (11.2s).
  const AUDIO_LENGTH = 11.2;
  const DURATION = 7.2;
  const SLOW = AUDIO_LENGTH / DURATION;
  const ctx = introCanvas.getContext("2d");
  const bloomCanvas = document.createElement("canvas");
  const bctx = bloomCanvas.getContext("2d");
  let iw = 0;
  let ih = 0;
  let start = 0;
  let done = false;

  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    iw = window.innerWidth;
    ih = window.innerHeight;
    introCanvas.width = iw * dpr;
    introCanvas.height = ih * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // The glow is drawn from a small copy, which keeps the blur cheap.
    bloomCanvas.width = Math.max(1, Math.round(iw / 4));
    bloomCanvas.height = Math.max(1, Math.round(ih / 4));
  }
  size();
  window.addEventListener("resize", size);

  const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
  const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
  const easeInOut = (x) => {
    const k = clamp01(x);
    return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  };
  const bell = (t, a, b) => Math.sin(Math.PI * clamp01((t - a) / (b - a)));

  // Seeded random so the block layout is the same on every visit.
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  // Blocks start scattered in front of the camera and fly into a grid.
  const blocks = [];
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 7; j++) {
      for (let k = 0; k < 6; k++) {
        if (rnd() < 0.12) continue;
        const tx = (i - 4) * 130 + (rnd() - 0.5) * 30;
        const ty = (j - 3) * 130 + (rnd() - 0.5) * 30;
        const tz = 500 + k * 190 + (rnd() - 0.5) * 40;
        blocks.push({
          tx,
          ty,
          tz,
          sx: tx + (rnd() - 0.5) * 1800,
          sy: ty + (rnd() - 0.5) * 1300,
          sz: tz + 700 + rnd() * 900,
          size: 80 + rnd() * 40,
          delay: rnd() * 1.4,
          spin: (rnd() - 0.5) * 2,
          tone: rnd(),
        });
      }
    }
  }

  // Unit cube corners and the six faces (as corner indices).
  const CORNERS = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
  const FACES = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4]];

  function normalize(v) {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const LIGHT = normalize([-0.4, -0.7, -0.6]);

  function drawScene(t) {
    // Dark base with a faint blue haze in the middle.
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#03050c";
    ctx.fillRect(0, 0, iw, ih);
    const haze = ctx.createRadialGradient(iw / 2, ih / 2, 0, iw / 2, ih / 2, Math.max(iw, ih) * 0.7);
    haze.addColorStop(0, `rgba(40, 80, 220, ${0.16 + 0.05 * Math.sin(t * 1.3)})`);
    haze.addColorStop(1, "rgba(3, 5, 12, 0)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, iw, ih);

    // The camera drifts gently, then pushes forward during 4.6s – 6.4s.
    const camZ = Math.sin(t * 0.3) * 25 + easeInOut((t - 4.6) / 1.8) * 1300;
    const focal = 680;
    const faces = [];

    for (const b of blocks) {
      const p = easeInOut((t - b.delay) / 2.4);
      const cx = b.sx + (b.tx - b.sx) * p;
      const cy = b.sy + (b.ty - b.sy) * p;
      const cz = b.sz + (b.tz - b.sz) * p;
      // Blocks turn while they fly in and keep a slow turn after that.
      const turn = (1 - p) * b.spin * 4 + t * 0.15 * (0.5 + b.tone);
      const tilt = Math.sin(t * 0.2 + b.tone * 6) * 0.3;
      const cosY = Math.cos(turn);
      const sinY = Math.sin(turn);
      const cosX = Math.cos(tilt);
      const sinX = Math.sin(tilt);
      const h = b.size / 2;
      const v = CORNERS.map(([x, y, z]) => {
        const px = x * h;
        const py = y * h;
        const pz = z * h;
        // Tilt around X, then turn around Y.
        const ry = py * cosX - pz * sinX;
        const rz = py * sinX + pz * cosX;
        const rx = px * cosY + rz * sinY;
        const rz2 = -px * sinY + rz * cosY;
        return [rx + cx, ry + cy, rz2 + cz - camZ];
      });
      if (v.some((pt) => pt[2] < 10)) continue;

      const flash = b.tone > 0.8 ? 0.5 + 0.5 * Math.sin(t * 2.2 + b.tone * 30) : 0;
      for (const f of FACES) {
        const a = v[f[0]];
        const bb = v[f[1]];
        const c = v[f[2]];
        const n = normalize(cross(sub(bb, a), sub(c, a)));
        // Only faces that point at the camera are drawn.
        if (n[0] * a[0] + n[1] * a[1] + n[2] * a[2] >= 0) continue;
        const shade = clamp01(-(n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]));
        const depth = (a[2] + bb[2] + c[2] + v[f[3]][2]) / 4;
        const pts = f.map((i) => [iw / 2 + (v[i][0] * focal) / v[i][2], ih / 2 + (v[i][1] * focal) / v[i][2]]);
        faces.push({ pts, depth, shade: clamp01(shade + flash * 0.4) });
      }
    }

    faces.sort((p, q) => q.depth - p.depth);

    for (const f of faces) {
      const fog = clamp01(1 - f.depth / 3200);
      const s = f.shade;
      // Dark blue on the shadow side, pale ice blue on the lit side.
      const r = 14 + s * 150;
      const g = 28 + s * 170;
      const bl = 70 + s * 185;
      ctx.beginPath();
      ctx.moveTo(f.pts[0][0], f.pts[0][1]);
      for (let i = 1; i < 4; i++) ctx.lineTo(f.pts[i][0], f.pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = `rgba(${r}, ${g}, ${bl}, ${fog * (0.6 + 0.4 * s)})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(190, 220, 255, ${fog * 0.45})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Soft glow: shrink the frame into the small buffer, blur it, add it back.
    bctx.clearRect(0, 0, bloomCanvas.width, bloomCanvas.height);
    bctx.drawImage(introCanvas, 0, 0, bloomCanvas.width, bloomCanvas.height);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.8;
    ctx.filter = "blur(10px)";
    ctx.drawImage(bloomCanvas, 0, 0, iw, ih);
    ctx.restore();

    // A soft light flash as the camera passes through.
    const flashAmt = bell(t, 5.6, 6.4) * 0.85;
    if (flashAmt > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(150, 190, 255, ${flashAmt})`;
      ctx.fillRect(0, 0, iw, ih);
      ctx.globalCompositeOperation = "source-over";
    }

    // Fade to black at the end.
    const black = easeInOut((t - 6.4) / 0.8);
    if (black > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${black})`;
      ctx.fillRect(0, 0, iw, ih);
    }

    // Blur while the camera rushes through the blocks.
    const blur = 7 * easeInOut((t - 4.8) / 1.6) * (1 - easeInOut((t - 6.0) / 0.8));
    introCanvas.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";

    // Title in, then out as the camera passes.
    const titleOpacity = easeOut((t - 3.2) / 1) * (1 - easeOut((t - 4.6) / 0.8));
    titleEl.style.opacity = clamp01(titleOpacity).toFixed(3);
  }

  // Sound stays on. Browsers only allow audio after a visitor interacts with
  // the page, so it starts now if allowed, or on the first click, tap, or key.
  // It always starts at the matching point in the intro.
  const introAudio = $("#introAudio");
  let soundOn = false;
  let userMuted = false;
  function startIntroSound() {
    if (!introAudio || userMuted) return;
    const elapsed = start ? (performance.now() - start) / 1000 : 0;
    introAudio.currentTime = Math.min(elapsed, AUDIO_LENGTH);
    introAudio.play().then(() => {
      soundOn = true;
    }).catch(() => {});
  }

  // A Sound button lets the visitor turn the intro sound off and back on.
  const soundBtn = intro.querySelector(".intro-sound");
  if (soundBtn && introAudio) {
    soundBtn.addEventListener("click", (e) => {
      // Keep this click from skipping the intro.
      e.stopPropagation();
      if (soundOn) {
        userMuted = true;
        introAudio.pause();
        soundOn = false;
        soundBtn.textContent = "Sound off";
        soundBtn.setAttribute("aria-pressed", "false");
      } else {
        userMuted = false;
        startIntroSound();
        soundBtn.textContent = "Sound on";
        soundBtn.setAttribute("aria-pressed", "true");
      }
    });
  }

  function finishIntro() {
    if (done) return;
    done = true;
    if (introAudio) introAudio.pause();
    document.body.classList.remove("intro-on");
    intro.classList.add("done");
    setTimeout(() => intro.remove(), 1000);
  }

  function frame(now) {
    if (done) return;
    if (!start) start = now;
    const t = (now - start) / 1000 / SLOW;
    if (t >= DURATION) {
      finishIntro();
      return;
    }
    drawScene(t);
    // Fade the sound out over the last 1.4s, so it never stops mid-note.
    if (introAudio && soundOn) {
      const realSec = t * SLOW;
      introAudio.volume = clamp01(1 - (realSec - (AUDIO_LENGTH - 1.4)) / 1.4);
    }
    requestAnimationFrame(frame);
  }

  intro.addEventListener("click", finishIntro);
  // Safety net: if the animation ever stalls, never leave the page covered.
  setTimeout(finishIntro, (DURATION * SLOW + 1.5) * 1000);
  startIntroSound();
  const unlockSound = () => {
    if (!soundOn && !done) startIntroSound();
  };
  ["pointerdown", "keydown", "touchstart"].forEach((ev) => window.addEventListener(ev, unlockSound));
  requestAnimationFrame(frame);
}

runIntro();

// ---------- Smooth scrolling (Lenis) ----------
// Lenis smooths mouse-wheel and link scrolling. Touch keeps the phone's own scrolling.
if (window.Lenis && !reduceMotion) {
  const lenis = new Lenis({ duration: 0.8, smoothWheel: true, smoothTouch: false, anchors: true });
  const raf = (time) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}

// ---------- Scroll animations: progress, nav, parallax ----------
const progressBar = $(".progress");
const siteNav = $(".nav");
const heroStickers = $(".stickers");
const cardVisuals = $$(".card").map((card) => ({
  card,
  img: $("img", card),
}));
let lastScrollY = window.scrollY;
let scrollTicking = false;

function onScrollFrame() {
  const y = window.scrollY;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

  // Thin progress bar across the top.
  progressBar.style.transform = `scaleX(${maxScroll > 0 ? y / maxScroll : 0})`;

  // Nav slides away while scrolling down and returns on the way up.
  siteNav.classList.toggle("hidden", y > lastScrollY && y > 300);
  lastScrollY = y;

  if (!reduceMotion) {
    // Hero stickers drift slower than the page for depth.
    heroStickers.style.transform = `translate3d(0, ${y * 0.12}px, 0)`;

    // Card images drift opposite to their card's position on screen.
    cardVisuals.forEach(({ card, img }) => {
      if (!img) return;
      const r = card.getBoundingClientRect();
      const offset = r.top + r.height / 2 - window.innerHeight / 2;
      // On phones and touch screens the image stays still, so scrolling is smooth.
      const drift = mobileView ? 0 : Math.max(-18, Math.min(18, -offset * 0.06));
      img.style.setProperty("--drift", `${drift.toFixed(1)}px`);
    });
  }

  scrollTicking = false;
}

window.addEventListener(
  "scroll",
  () => {
    if (!scrollTicking) {
      requestAnimationFrame(onScrollFrame);
      scrollTicking = true;
    }
  },
  { passive: true }
);
onScrollFrame();

// ---------- Mobile hamburger menu ----------
const menuBtn = $(".menu-toggle");
menuBtn.addEventListener("click", () => {
  const open = siteNav.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
});
// Choosing a section closes the menu.
$$(".nav nav a").forEach((link) =>
  link.addEventListener("click", () => {
    siteNav.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-label", "Open menu");
  })
);

// ---------- Project details panel ----------
// Edit the text here. Add more fields (role, tools, process) to any project
// and show them in openProject() when you have the details.
const projects = {
  sapped: {
    title: "Sapped",
    tag: "Web · Live site",
    image: "images/sapped.jpg",
    background: "#151628",
    text: "Sapped is a collective wellbeing experience that turns anonymous emotional check-ins into a shared visualisation of group wellbeing.",
    link: "https://sapped33.web.app/",
    linkLabel: "Visit Sapped",
    role: "UX research, visual design, ideation and testing",
    tools: "Figma, Claude, Canva",
    year: "August 30, 2026",
    challenge:
      "Iteration was the hardest part. I changed the design at least 100 times. In the end, the clients and professors loved it.",
    outcome:
      "The product was solid, but users were a bit confused at first. Once we explained how to use it, they were satisfied with it.",
  },
  flowspace: {
    title: "FLOWSPACE",
    tag: "Figma · Prototype",
    image: "images/flowspace.jpg",
    background: "#000",
    text: "Flowspace is a mobile app that helps students, freelancers, and remote workers find quiet, productive spaces to work or study in real time.",
    link: "https://www.figma.com/proto/BQLgw5bVy1Cn2xZRd826wp/FlowSpace.-Board?node-id=304-890&p=f&t=Rde42rI31rwvQWvv-0&scaling=scale-down&content-scaling=fixed&page-id=304%3A599&starting-point-node-id=304%3A600",
    linkLabel: "Open the prototype",
    role: "User research, graphic design, marketing and ideation",
    tools: "Figma, ChatGPT, Claude, Canva",
    year: "June 25, 2025",
    challenge:
      "The biggest challenge was the marketing. Consumers asked why students, freelancers and remote workers need an app for this when Google Maps exists. I showed that our app is different: it runs live, so people can see which locations are best right now.",
    outcome:
      "The execution was spot on. I was nervous presenting in front of everyone, but overall people loved the idea.",
  },
  oneschool: {
    title: "Oneschool",
    tag: "Figma · Prototype",
    image: "images/oneschool.jpg",
    background: "#ff7a1a",
    text: "A simplified LMS concept designed to help students navigate online learning without unnecessary complexity or distractions.",
    link: "https://iris-drill-75044280.figma.site/",
    linkLabel: "Open the prototype",
    role: "Everything (own work)",
    tools: "Figma, Canva, more to come",
    year: "Not completed yet",
    challenge:
      "The project is still unfinished. I showed it as a project for my upcoming thesis, and there is still a lot to update and more iteration to go.",
    outcome:
      "The professor loved the idea, but there is a lot of competition, since every school and university has an LMS. How different mine can be is still unknown.",
  },
};

const projectDialog = $("#projectDialog");

// Shows only the facts that have content for this project.
function facts(p) {
  const rows = [
    ["Role", p.role],
    ["Tools", p.tools],
    ["Year", p.year],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
    .join("");
  return rows ? `<dl class="pd-facts">${rows}</dl>` : "";
}

function openProject(key) {
  const p = projects[key];
  if (!p) return;
  projectDialog.innerHTML = `
    <div class="pd-inner">
      <button class="pd-close" type="button" aria-label="Close">×</button>
      <div class="pd-image${p.blur ? " blur-visual" : ""}" style="${p.blur ? `--src: url('${p.image}')` : `background: ${p.background}`}">
        <img src="${p.image}" alt="${p.title} picture" />
      </div>
      <p class="kicker">${p.tag}</p>
      <h3>${p.title}</h3>
      <p class="pd-text">${p.text}</p>
      ${facts(p)}
      ${p.challenge ? `<h4 class="pd-label">Challenge</h4><p class="pd-text">${p.challenge}</p>` : ""}
      ${p.outcome ? `<h4 class="pd-label">Outcome</h4><p class="pd-text">${p.outcome}</p>` : ""}
      <a class="pd-visit" href="${p.link}" target="_blank" rel="noopener">${p.linkLabel} ↗</a>
    </div>`;
  projectDialog.querySelector(".pd-close").addEventListener("click", () => projectDialog.close());
  projectDialog.showModal();
}

// Clicking outside the panel's content closes it.
projectDialog.addEventListener("click", (e) => {
  if (e.target === projectDialog) projectDialog.close();
});

$$(".card[data-project]").forEach((card) => {
  card.addEventListener("click", (e) => {
    e.preventDefault();
    playPolaroidSound();
    openProject(card.dataset.project);
  });
});

// ---------- My journey panel (opens from the polaroid) ----------
const journeyDialog = $("#journeyDialog");
// A soft two-note chime (made with Web Audio) when the polaroid is opened.
let polaroidCtx = null;
function playPolaroidSound() {
  if (!polaroidCtx) polaroidCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (polaroidCtx.state === "suspended") polaroidCtx.resume();
  const ac = polaroidCtx;
  [[523, 0], [784, 0.14]].forEach(([freq, delay]) => {
    const t = ac.currentTime + delay;
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(g).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.55);
  });
}

// Paper crackle when the polaroid is hovered: short random bursts of filtered noise.
let crackleBuffer = null;
let lastCrackle = 0;
function playPaperCrackle() {
  const now = performance.now();
  if (now - lastCrackle < 400) return;
  lastCrackle = now;
  if (!polaroidCtx) polaroidCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (polaroidCtx.state === "suspended") polaroidCtx.resume();
  const ac = polaroidCtx;
  if (!crackleBuffer) {
    crackleBuffer = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const data = crackleBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  for (let i = 0; i < 12; i++) {
    const t = ac.currentTime + Math.random() * 0.35;
    const src = ac.createBufferSource();
    src.buffer = crackleBuffer;
    const band = ac.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 2000 + Math.random() * 3000;
    band.Q.value = 2;
    const g = ac.createGain();
    const peak = 0.05 + Math.random() * 0.1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02 + Math.random() * 0.03);
    src.connect(band).connect(g).connect(ac.destination);
    src.start(t, Math.random() * 0.4, 0.06);
  }
}

$(".polaroid").addEventListener("pointerenter", playPaperCrackle);
$(".polaroid").addEventListener("click", () => {
  playPolaroidSound();
  journeyDialog.showModal();
});
journeyDialog.querySelector(".pd-close").addEventListener("click", () => journeyDialog.close());
journeyDialog.addEventListener("click", (e) => {
  if (e.target === journeyDialog) journeyDialog.close();
});

// ---------- Ocean sound for the whole page (made with Web Audio) ----------
// Filtered noise with two slow swells that rise and fall like waves.
const oceanBtn = $(".ocean-toggle");
let oceanCtx = null;

// The ocean sound is on by default. Browsers may block it until the visitor
// interacts with the page, so it resumes on the first click, tap, or key press.
function startOcean() {
  if (oceanCtx) return;
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  oceanCtx = ac;

  // Four seconds of random samples, looped, make the hiss of water.
  const buffer = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const soften = ac.createBiquadFilter();
  soften.type = "lowpass";
  soften.frequency.value = 900;
  soften.Q.value = 0.7;

  // The volume is the base level plus two slow swells (about 11 s and 7 s).
  const waveGain = ac.createGain();
  waveGain.gain.value = 0.03;
  [
    { rate: 0.09, depth: 0.0175 },
    { rate: 0.14, depth: 0.01 },
  ].forEach(({ rate, depth }) => {
    const swell = ac.createOscillator();
    swell.frequency.value = rate;
    const swellDepth = ac.createGain();
    swellDepth.gain.value = depth;
    swell.connect(swellDepth).connect(waveGain.gain);
    swell.start();
  });

  noise.connect(soften).connect(waveGain).connect(ac.destination);
  noise.start();
}

function setOceanButton(on) {
  oceanBtn.textContent = on ? "Ocean sound: on" : "Ocean sound: off";
  oceanBtn.setAttribute("aria-pressed", String(on));
}

// The visitor can turn it off and back on; it stays on otherwise.
let oceanUserOff = false;
oceanBtn.addEventListener("click", () => {
  if (oceanUserOff) {
    oceanUserOff = false;
    startOcean();
    setOceanButton(true);
  } else {
    oceanUserOff = true;
    if (oceanCtx) {
      oceanCtx.close();
      oceanCtx = null;
    }
    setOceanButton(false);
  }
});

startOcean();
["pointerdown", "keydown", "touchstart"].forEach((ev) =>
  window.addEventListener(
    ev,
    () => {
      if (!oceanUserOff && oceanCtx && oceanCtx.state === "suspended") oceanCtx.resume();
    },
    { passive: true }
  )
);

// ---------- Background wave lines (behind the page) ----------
// Gentle idle swells: sixteen lines that rise and fall at different speeds.
const waveBg = $("#waveBg");
if (waveBg && !motionOff) {
  const wc = waveBg.getContext("2d");
  const LINES = 16;
  let ww = 0;
  let wh = 0;
  let wt = 0;

  function sizeWave() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ww = window.innerWidth;
    wh = window.innerHeight;
    waveBg.width = ww * dpr;
    waveBg.height = wh * dpr;
    wc.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  sizeWave();
  window.addEventListener("resize", sizeWave);

  function drawWave() {
    wt += 0.016;
    wc.clearRect(0, 0, ww, wh);
    wc.globalCompositeOperation = "lighter";
    for (let i = 0; i < LINES; i++) {
      const k = i / (LINES - 1);
      const level = 0.12 + 0.1 * Math.abs(Math.sin(wt * (1.2 + i * 0.1) + i));
      const baseY = wh * (0.12 + 0.76 * k);
      const amp = Math.min(ww, wh) * (0.04 + 0.45 * level) * (1 - Math.abs(k - 0.5) * 0.5);
      const grad = wc.createLinearGradient(0, 0, ww, 0);
      grad.addColorStop(0, "rgba(107, 60, 255, 0)");
      grad.addColorStop(0.5, "rgba(90, 140, 255, 0.55)");
      grad.addColorStop(1, "rgba(139, 92, 246, 0)");
      wc.strokeStyle = grad;
      wc.lineWidth = 1.2 + level * 2.5;
      wc.beginPath();
      for (let x = 0; x <= ww; x += 8) {
        const u = x / ww;
        const y =
          baseY +
          Math.sin(u * 9 + wt * 1.4 + i * 0.5) * amp * 0.6 +
          Math.sin(u * 23 - wt * 2.1 + i) * amp * 0.25;
        if (x === 0) wc.moveTo(x, y);
        else wc.lineTo(x, y);
      }
      wc.stroke();
    }
    wc.globalCompositeOperation = "source-over";
    requestAnimationFrame(drawWave);
  }
  requestAnimationFrame(drawWave);
}

// ---------- Hover sound for the project cards (made with Web Audio) ----------
// A short rising blip. Browsers only allow sound after a click or key press,
// so the first hover before any interaction may stay silent.
let hoverCtx = null;
let lastBlip = 0;

function playHoverBlip() {
  const now = performance.now();
  if (now - lastBlip < 120) return;
  lastBlip = now;
  if (!hoverCtx) hoverCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (hoverCtx.state === "suspended") hoverCtx.resume();
  const ac = hoverCtx;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(660, t);
  osc.frequency.exponentialRampToValueAtTime(990, t + 0.12);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.2);
}

$$(".card").forEach((card) => card.addEventListener("pointerenter", playHoverBlip));

// The worked-with logos: a soft blip on hover, the chime on click.
$$(".client").forEach((client) => {
  client.addEventListener("pointerenter", playHoverBlip);
  client.addEventListener("click", playPolaroidSound);
});

// ---------- Lab: water splash on click (made with Web Audio) ----------
let waterCtx = null;
function playWaterSound() {
  if (!waterCtx) waterCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (waterCtx.state === "suspended") waterCtx.resume();
  const ac = waterCtx;
  const t = ac.currentTime;

  // A bubble: a short sine that rises quickly, like a drop hitting water.
  const bubble = ac.createOscillator();
  bubble.type = "sine";
  const start = 350 + Math.random() * 250;
  bubble.frequency.setValueAtTime(start, t);
  bubble.frequency.exponentialRampToValueAtTime(start * 2.4, t + 0.12);
  const bubbleGain = ac.createGain();
  bubbleGain.gain.setValueAtTime(0.0001, t);
  bubbleGain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
  bubbleGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  bubble.connect(bubbleGain).connect(ac.destination);
  bubble.start(t);
  bubble.stop(t + 0.28);

  // A splash: a short burst of filtered noise.
  const length = Math.floor(ac.sampleRate * 0.3);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) samples[i] = Math.random() * 2 - 1;
  const splash = ac.createBufferSource();
  splash.buffer = buffer;
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1200;
  band.Q.value = 0.8;
  const splashGain = ac.createGain();
  splashGain.gain.setValueAtTime(0.0001, t);
  splashGain.gain.exponentialRampToValueAtTime(0.15, t + 0.01);
  splashGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  splash.connect(band).connect(splashGain).connect(ac.destination);
  splash.start(t);
  splash.stop(t + 0.31);
}

$("#labCanvas").addEventListener("pointerdown", playWaterSound);

// ---------- First-visit tour card ----------
// Shows once the intro is over, on the first visit only. Each step scrolls
// to its part of the page.
const onboard = $("#onboard");
const onboardStep = $("#onboardStep");
const onboardTitle = $("#onboardTitle");
const onboardText = $("#onboardText");
const onboardNext = $("#onboardNext");
const onboardSkip = $("#onboardSkip");
const tourSteps = [
  { id: "top", title: "Welcome", text: "Hi, I'm Yaser. This is my portfolio. Let me show you around." },
  { id: "work", title: "My work", text: "Click any project card to open its details." },
  { id: "lab", title: "The lab", text: "Click the waves to hear them splash. Hidden surprises live here too." },
  { id: "about", title: "About me", text: "Click the polaroid for my story. Hover it for a little sound." },
  { id: "contact", title: "Say hello", text: "My email and links are at the bottom of the page." },
];
let tourIndex = 0;
let tourSeen = false;
try {
  tourSeen = localStorage.getItem("tourSeen") === "1";
} catch {
  tourSeen = false;
}

function showTourStep(i, scroll) {
  const step = tourSteps[i];
  onboardStep.textContent = `Step ${i + 1} of ${tourSteps.length}`;
  onboardTitle.textContent = step.title;
  onboardText.textContent = step.text;
  onboardNext.textContent = i === tourSteps.length - 1 ? "Done" : "Next";
  if (scroll) document.getElementById(step.id).scrollIntoView({ behavior: "smooth", block: "start" });
}

function endTour() {
  onboard.hidden = true;
  try {
    localStorage.setItem("tourSeen", "1");
  } catch {
    /* storage blocked: the tour may show again on the next visit */
  }
}

onboardNext.addEventListener("click", () => {
  if (tourIndex >= tourSteps.length - 1) {
    endTour();
    return;
  }
  tourIndex += 1;
  showTourStep(tourIndex, true);
});
onboardSkip.addEventListener("click", endTour);

if (!tourSeen) {
  const waitForIntro = setInterval(() => {
    if (document.getElementById("intro")) return;
    clearInterval(waitForIntro);
    onboard.hidden = false;
    showTourStep(0, false);
  }, 300);
}

// ---------- Easter egg in the lab ----------
// Clicking the hidden figure darkens the whole site and plays the thank-you video.
const egg = $(".egg");
// Put the egg somewhere new on every visit, away from the edges.
egg.style.left = `${10 + Math.random() * 75}%`;
egg.style.top = `${10 + Math.random() * 75}%`;
const eggDialog = $("#eggDialog");
const eggVideo = $("#eggVideo");

function openEgg() {
  document.documentElement.classList.add("egg-dark");
  eggDialog.showModal();
  // Playing from the click keeps the sound allowed by the browser.
  eggVideo.currentTime = 0;
  eggVideo.play().catch(() => {});
}

egg.addEventListener("click", openEgg);
egg.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    openEgg();
  }
});

// Closing stops the video and restores the normal colors.
eggDialog.addEventListener("close", () => {
  eggVideo.pause();
  document.documentElement.classList.remove("egg-dark");
});
eggDialog.querySelector(".pd-close").addEventListener("click", () => eggDialog.close());
eggDialog.addEventListener("click", (e) => {
  if (e.target === eggDialog) eggDialog.close();
});

