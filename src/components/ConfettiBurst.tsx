import { useEffect, useRef } from 'react';

interface ConfettiBurstProps {
  burstKey: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vr: number;
  shape: 'rect' | 'circle' | 'star';
  alpha: number;
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  outerRadius: number,
  innerRadius: number
) {
  const spikes = 5;
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(0, -outerRadius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(Math.cos(rot) * outerRadius, Math.sin(rot) * outerRadius);
    rot += step;
    ctx.lineTo(Math.cos(rot) * innerRadius, Math.sin(rot) * innerRadius);
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
}

const COLORS = ['#F59E0B', '#0284C7', '#10B981', '#F43F5E', '#7C3AED', '#FACC15', '#38BDF8'];

export function ConfettiBurst({ burstKey }: ConfettiBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (burstKey <= 0) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const particles: Particle[] = [];
    const count = 120;
    for (let i = 0; i < count; i++) {
      const fromLeft = i % 2 === 0;
      const startX = fromLeft ? width * 0.2 : width * 0.8;
      const startY = height * 0.35;
      const angle = (fromLeft ? -Math.PI / 4 : (-3 * Math.PI) / 4) + (Math.random() - 0.5) * 1.1;
      const speed = 6 + Math.random() * 11;
      particles.push({
        x: startX + (Math.random() - 0.5) * 80,
        y: startY + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: 7 + Math.random() * 7,
        color: COLORS[i % COLORS.length],
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.24,
        shape: i % 3 === 0 ? 'star' : i % 3 === 1 ? 'circle' : 'rect',
        alpha: 1,
      });
    }

    let frame = 0;
    const maxFrames = 180;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.27; // gravity
        p.vx *= 0.99;
        p.rotation += p.vr;
        if (frame > maxFrames - 50) {
          p.alpha = Math.max(0, p.alpha - 0.024);
        }

        if (p.alpha > 0.02 && p.y < height + 30) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          if (p.shape === 'star') {
            drawStar(ctx, p.size * 0.65, p.size * 0.3);
          } else if (p.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 0.48, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(-p.size * 0.5, -p.size * 0.32, p.size, p.size * 0.64);
          }
          ctx.restore();
        }
      }

      if (alive && frame < maxFrames) {
        animId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      ctx.clearRect(0, 0, width, height);
    };
  }, [burstKey]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
}
