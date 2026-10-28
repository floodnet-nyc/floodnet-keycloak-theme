import { useEffect, useRef } from "react";

type Ripple = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    born: number;
    life: number;
    radius: number;
    strength: number;
    angle: number;
    speed: number;
};

const MAX_RIPPLES = 6;

/**
 * A quiet water-surface layer for the initial sign-in page.
 *
 * The rings are drawn from a soft pre-rendered sprite, not crisp strokes, so
 * they dissolve into the photo instead of reading as discrete particles.
 * It only runs for fine pointers, stops when the last ring fades, and is
 * disabled for reduced-motion users.
 */
export default function LoginRipples() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        const finePointer = window.matchMedia("(pointer: fine)");
        if (reducedMotion.matches || !finePointer.matches) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        // A very soft two-ring sprite, blurred at draw time by the CSS layer.
        const sprite = document.createElement("canvas");
        sprite.width = 256;
        sprite.height = 256;
        const spriteContext = sprite.getContext("2d");
        if (!spriteContext) return;

        const glow = spriteContext.createRadialGradient(128, 128, 0, 128, 128, 128);
        const stops: Array<[number, string]> = [
            [0, "rgba(176, 255, 235, 0)"],
            [0.48, "rgba(176, 255, 235, 0)"],
            [0.57, "rgba(184, 255, 240, 0.05)"],
            [0.63, "rgba(196, 255, 243, 0.3)"],
            [0.68, "rgba(220, 255, 248, 0.82)"],
            [0.73, "rgba(188, 255, 240, 0.24)"],
            [0.77, "rgba(176, 255, 235, 0)"],
            [0.81, "rgba(176, 255, 235, 0)"],
            [0.84, "rgba(190, 255, 238, 0.14)"],
            [0.88, "rgba(176, 255, 235, 0.03)"],
            [1, "rgba(176, 255, 235, 0)"]
        ];
        for (const [offset, color] of stops) glow.addColorStop(offset, color);
        spriteContext.fillStyle = glow;
        spriteContext.fillRect(0, 0, 256, 256);


        let width = 0;
        let height = 0;
        let dpr = 1;
        let frame = 0;
        let ripples: Ripple[] = [];
        let lastX = Number.NaN;
        let lastY = Number.NaN;
        let lastSpawn = 0;
        let running = false;

        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            context.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const draw = (now: number) => {
            context.clearRect(0, 0, width, height);

            const visible = ripples.filter(ripple => now - ripple.born < ripple.life);

            if (visible.length === 0) {
                ripples = [];
                running = false;
                frame = 0;
                return;
            }

            ripples = visible;
            context.save();
            context.globalCompositeOperation = "screen";

            for (const ripple of ripples) {
                const progress = Math.min(1, (now - ripple.born) / ripple.life);
                // Smoothstep: starts and ends slowly, so it never feels launched.
                const eased = progress * progress * (3 - 2 * progress);
                const size = Math.max(2, ripple.radius * eased * 2);
                const fade = Math.pow(1 - progress, 1.7);
                const drift = progress * 20;
                const stretch = 1 + Math.min(0.32, ripple.speed * 0.24) * eased;

                context.save();
                context.translate(
                    ripple.x + ripple.vx * drift,
                    ripple.y + ripple.vy * drift
                );
                context.rotate(ripple.angle);
                context.scale(stretch, 1);
                context.globalAlpha = fade * ripple.strength * 0.95;
                context.drawImage(sprite, -size / 2, -size / 2, size, size);
                context.restore();
            }

            context.restore();
            frame = window.requestAnimationFrame(draw);
        };

        const start = () => {
            if (running) return;
            running = true;
            frame = window.requestAnimationFrame(draw);
        };

        const spawn = (
            x: number,
            y: number,
            distance: number,
            vx: number,
            vy: number
        ) => {
            ripples.push({
                x,
                y,
                vx,
                vy,
                born: performance.now(),
                life: 3600 + Math.random() * 900,
                radius: 150 + Math.random() * 90,
                strength: Math.min(1, 0.42 + Math.max(0, distance - 30) / 150),
                angle: Math.atan2(vy, vx),
                speed: Math.min(1, distance / 90)
            });
            if (ripples.length > MAX_RIPPLES) ripples.shift();
            start();
        };

        const onPointerMove = (event: PointerEvent) => {
            if (event.pointerType && event.pointerType !== "mouse") return;

            const now = performance.now();
            const dx = Number.isFinite(lastX) ? event.clientX - lastX : 0;
            const dy = Number.isFinite(lastY) ? event.clientY - lastY : 0;
            const distance = Math.hypot(dx, dy);
            const movedEnough = !Number.isFinite(lastX) || distance > 38;
            if (!movedEnough || now - lastSpawn < 145) return;

            const vx = Number.isFinite(lastX) ? dx / Math.max(1, distance) : 0;
            const vy = Number.isFinite(lastY) ? dy / Math.max(1, distance) : 0;
            lastSpawn = now;
            lastX = event.clientX;
            lastY = event.clientY;
            spawn(event.clientX, event.clientY, distance, vx, vy);
        };

        const onVisibilityChange = () => {
            if (document.hidden) {
                window.cancelAnimationFrame(frame);
                running = false;
                frame = 0;
                ripples = [];
                context.clearRect(0, 0, width, height);
            }
        };

        resize();
        window.addEventListener("resize", resize);
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener("resize", resize);
            window.removeEventListener("pointermove", onPointerMove);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, []);

    return <canvas ref={canvasRef} className="fn-ripples" aria-hidden="true" />;
}
