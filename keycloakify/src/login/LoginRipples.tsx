import { useEffect, useRef } from "react";

type Ripple = {
    x: number;
    y: number;
    born: number;
    life: number;
    radius: number;
    strength: number;
};

/**
 * A restrained water-ripple layer for the initial sign-in page.
 *
 * This is intentionally not a fluid simulation: it is a few soft rings over
 * the flood photo, behind the glass card. It only runs for fine pointers, it
 * stops as soon as the last ring fades, and it is disabled for people who ask
 * for reduced motion.
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
            context.lineCap = "round";

            for (const ripple of ripples) {
                const progress = Math.min(1, (now - ripple.born) / ripple.life);
                const eased = 1 - (1 - progress) * (1 - progress);
                const radius = ripple.radius * eased;
                const fade = (1 - progress) * (1 - progress);
                const alpha = fade * 0.26 * ripple.strength;

                const ringOffsets = [0, 4, 9];
                const ringAlphas = [1, 0.5, 0.28];
                for (let ring = 0; ring < 3; ring += 1) {
                    const ringRadius = radius - ringOffsets[ring];
                    if (ringRadius <= 0) continue;
                    context.beginPath();
                    context.arc(ripple.x, ripple.y, ringRadius, 0, Math.PI * 2);
                    context.lineWidth = Math.max(0.6, 1.3 - ring * 0.35);
                    context.strokeStyle = `rgba(194, 245, 255, ${alpha * ringAlphas[ring]})`;
                    context.stroke();
                }

                if (progress < 0.45) {
                    const glow = context.createRadialGradient(
                        ripple.x,
                        ripple.y,
                        0,
                        ripple.x,
                        ripple.y,
                        Math.max(1, radius * 0.55)
                    );
                    glow.addColorStop(0, `rgba(224, 255, 255, ${alpha * 0.35})`);
                    glow.addColorStop(1, "rgba(224, 255, 255, 0)");
                    context.fillStyle = glow;
                    context.beginPath();
                    context.arc(ripple.x, ripple.y, Math.max(1, radius * 0.55), 0, Math.PI * 2);
                    context.fill();
                }
            }

            context.restore();
            frame = window.requestAnimationFrame(draw);
        };

        const start = () => {
            if (running) return;
            running = true;
            frame = window.requestAnimationFrame(draw);
        };

        const spawn = (x: number, y: number, strength: number) => {
            ripples.push({
                x,
                y,
                born: performance.now(),
                life: 1500 + Math.random() * 450,
                radius: 76 + Math.random() * 42,
                strength
            });
            if (ripples.length > 14) ripples.shift();
            start();
        };

        const onPointerMove = (event: PointerEvent) => {
            if (event.pointerType && event.pointerType !== "mouse") return;

            const now = performance.now();
            const dx = Number.isFinite(lastX) ? event.clientX - lastX : 0;
            const dy = Number.isFinite(lastY) ? event.clientY - lastY : 0;
            const distance = Math.hypot(dx, dy);
            const movedEnough = !Number.isFinite(lastX) || distance > 16;
            if (!movedEnough || now - lastSpawn < 55) return;

            lastSpawn = now;
            lastX = event.clientX;
            lastY = event.clientY;
            spawn(
                event.clientX,
                event.clientY,
                Math.min(1, 0.42 + Math.max(0, distance - 16) / 90)
            );
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
