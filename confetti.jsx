/* confetti.jsx — celebratory particle system in <canvas>. Multiple styles. */

function Confetti({ style = "classic", running, palette }) {
  const ref = React.useRef(null);
  const rafRef = React.useRef(null);
  const particlesRef = React.useRef([]);
  const startedRef = React.useRef(0);

  React.useEffect(() => {
    if (!running) return;
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
    };
    resize();
    window.addEventListener("resize", resize);
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const colors = palette || ["#7a1626", "#b08436", "#f6efe3", "#c97a76", "#2a1418"];
    const W = () => window.innerWidth;
    const H = () => window.innerHeight;
    const burst = (n) => {
      for (let i = 0; i < n; i++) {
        const fromLeft = Math.random() < 0.5;
        particlesRef.current.push({
          x: fromLeft ? -20 : W() + 20,
          y: H() * (0.5 + Math.random() * 0.3),
          vx: (fromLeft ? 1 : -1) * (8 + Math.random() * 9),
          vy: -(10 + Math.random() * 8),
          gravity: 0.32 + Math.random() * 0.12,
          drag: 0.992,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.4,
          size: 6 + Math.random() * 8,
          color: colors[Math.floor(Math.random() * colors.length)],
          shape: style,
          life: 0,
          maxLife: 280 + Math.random() * 200,
        });
      }
    };
    // Two-stage burst: big initial, then trickle.
    burst(160);
    setTimeout(() => burst(140), 220);
    setTimeout(() => burst(120), 520);
    startedRef.current = performance.now();

    const draw = () => {
      ctx.clearRect(0, 0, W(), H());
      const arr = particlesRef.current;
      for (let i = arr.length - 1; i >= 0; i--) {
        const p = arr[i];
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life++;
        if (p.y > H() + 80 || p.life > p.maxLife) {
          arr.splice(i, 1);
          continue;
        }
        drawParticle(ctx, p);
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      particlesRef.current = [];
      ctx.clearRect(0, 0, W(), H());
    };
  }, [running, style, palette]);

  if (!running) return null;
  return (
    <canvas
      ref={ref}
      style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1500,
      }}
    />
  );
}

function drawParticle(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.fillStyle = p.color;
  ctx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
  switch (p.shape) {
    case "wine": {
      // Wine drop shape
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.bezierCurveTo(p.size * 0.8, -p.size * 0.3, p.size * 0.5, p.size, 0, p.size);
      ctx.bezierCurveTo(-p.size * 0.5, p.size, -p.size * 0.8, -p.size * 0.3, 0, -p.size);
      ctx.fill();
      break;
    }
    case "petals": {
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 0.6, p.size, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "gold": {
      // Gold stars
      const spikes = 5, outerR = p.size, innerR = p.size * 0.45;
      let rot = -Math.PI / 2;
      ctx.beginPath();
      for (let i = 0; i < spikes; i++) {
        ctx.lineTo(Math.cos(rot) * outerR, Math.sin(rot) * outerR);
        rot += Math.PI / spikes;
        ctx.lineTo(Math.cos(rot) * innerR, Math.sin(rot) * innerR);
        rot += Math.PI / spikes;
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "classic":
    default: {
      // Classic confetti rectangle
      ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size / 1.6);
      break;
    }
  }
  ctx.restore();
}

window.Confetti = Confetti;
