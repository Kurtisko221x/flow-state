// Emoji confetti burst on a full-screen canvas.
const EMOJI = ["🎉", "✨", "🔥", "💜", "🚀", "⭐", "🌈", "🥳", "💫", "🎊"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  emoji: string;
}

export function celebrate(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);

  const particles: Particle[] = [];
  // two cannons from the bottom corners + a burst from the center
  const sources = [
    { x: 0, y: innerHeight, angle: -Math.PI / 3.2 },
    { x: innerWidth, y: innerHeight, angle: -Math.PI + Math.PI / 3.2 },
  ];
  for (const s of sources) {
    for (let i = 0; i < 45; i++) {
      const a = s.angle + (Math.random() - 0.5) * 0.7;
      const speed = 14 + Math.random() * 12;
      particles.push(make(s.x, s.y, Math.cos(a) * speed, Math.sin(a) * speed));
    }
  }
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 9;
    particles.push(make(innerWidth / 2, innerHeight / 2, Math.cos(a) * speed, Math.sin(a) * speed - 4));
  }

  const start = performance.now();
  function frame(now: number) {
    const t = now - start;
    ctx!.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of particles) {
      p.vy += 0.38; // gravity
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx!.save();
      ctx!.globalAlpha = Math.max(0, 1 - t / 3200);
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      ctx!.font = `${p.size}px serif`;
      ctx!.fillText(p.emoji, -p.size / 2, p.size / 2);
      ctx!.restore();
    }
    if (t < 3200) requestAnimationFrame(frame);
    else ctx!.clearRect(0, 0, innerWidth, innerHeight);
  }
  requestAnimationFrame(frame);
}

function make(x: number, y: number, vx: number, vy: number): Particle {
  return {
    x,
    y,
    vx,
    vy,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    size: 18 + Math.random() * 22,
    emoji: EMOJI[Math.floor(Math.random() * EMOJI.length)],
  };
}
