import { useEffect, useRef } from "react";

const SIM_COLS = 320;
const SIM_STEP = 1 / 60;
const WAVE_C2 = 0.18;
const DAMPING = 0.992;
const MAX_SUBSTEPS = 3;

type Grid = {
    cols: number;
    rows: number;
    prev: Float32Array;
    curr: Float32Array;
    next: Float32Array;
};

/**
 * A tiny 2D wave simulation behind the sign-in card.
 *
 * The pointer pushes water down; the wave equation carries the disturbance
 * outward and the renderer draws only the light caught on its crests. There
 * are no authored ripple sprites: the pattern is emergent, low-resolution,
 * upscaled and blurred so it reads as wet light rather than a grid.
 */
export default function LoginWaterField() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        const finePointer = window.matchMedia("(pointer: fine)");
        if (reducedMotion.matches || !finePointer.matches) return;

        const display = canvas.getContext("2d");
        if (!display) return;

        const fieldCanvas = document.createElement("canvas");
        const fieldContext = fieldCanvas.getContext("2d");
        if (!fieldContext) return;

        let width = 0;
        let height = 0;
        let dpr = 1;
        let grid: Grid | null = null;
        let fieldImage: ImageData | null = null;
        let frame = 0;
        let lastFrameTime = 0;
        let accumulator = 0;
        let lastPointerX = Number.NaN;
        let lastPointerY = Number.NaN;
        let lastImpulse = 0;
        let calmFrames = 0;
        let running = false;

        const resetGrid = () => {
            const rows = Math.max(
                64,
                Math.min(160, Math.round((SIM_COLS * height) / Math.max(1, width)))
            );
            grid = {
                cols: SIM_COLS,
                rows,
                prev: new Float32Array(SIM_COLS * rows),
                curr: new Float32Array(SIM_COLS * rows),
                next: new Float32Array(SIM_COLS * rows)
            };
            fieldCanvas.width = SIM_COLS;
            fieldCanvas.height = rows;
            fieldImage = fieldContext.createImageData(SIM_COLS, rows);
            fieldContext.clearRect(0, 0, SIM_COLS, rows);
            calmFrames = 0;
        };

        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            display.setTransform(dpr, 0, 0, dpr, 0, 0);
            resetGrid();
        };

        const addDisturbance = (clientX: number, clientY: number, strength: number) => {
            if (!grid) return;
            const { cols, rows, curr } = grid;
            const gx = (clientX / width) * (cols - 1);
            const gy = (clientY / height) * (rows - 1);
            const radius = 2.0;
            const reach = Math.ceil(radius * 2.5);
            const scale = 1 / (2 * radius * radius);

            for (let oy = -reach; oy <= reach; oy += 1) {
                const y = Math.round(gy) + oy;
                if (y < 1 || y >= rows - 1) continue;
                for (let ox = -reach; ox <= reach; ox += 1) {
                    const x = Math.round(gx) + ox;
                    if (x < 1 || x >= cols - 1) continue;
                    const distance = ox * ox + oy * oy;
                    const falloff = Math.exp(-distance * scale);
                    curr[y * cols + x] -= falloff * strength;
                }
            }
        };

        const stepSimulation = () => {
            if (!grid) return;
            const { cols, rows, prev, curr, next } = grid;

            for (let y = 1; y < rows - 1; y += 1) {
                const row = y * cols;
                for (let x = 1; x < cols - 1; x += 1) {
                    const index = row + x;
                    const neighbours =
                        curr[index - 1] +
                        curr[index + 1] +
                        curr[index - cols] +
                        curr[index + cols];
                    next[index] =
                        (2 * curr[index] -
                            prev[index] +
                            WAVE_C2 * (neighbours - 4 * curr[index])) *
                        DAMPING;
                }
            }

            // Let the edges absorb rather than reflect back into the scene.
            for (let x = 0; x < cols; x += 1) {
                next[x] = 0;
                next[(rows - 1) * cols + x] = 0;
            }
            for (let y = 0; y < rows; y += 1) {
                next[y * cols] = 0;
                next[y * cols + cols - 1] = 0;
            }

            grid.prev = curr;
            grid.curr = next;
            grid.next = prev;
        };

        const render = () => {
            if (!grid || !fieldImage) return;
            const { cols, rows, curr } = grid;
            const pixels = fieldImage.data;

            for (let index = 0; index < pixels.length; index += 4) {
                pixels[index] = 0;
                pixels[index + 1] = 0;
                pixels[index + 2] = 0;
                pixels[index + 3] = 0;
            }

            for (let y = 1; y < rows - 1; y += 1) {
                for (let x = 1; x < cols - 1; x += 1) {
                    const index = y * cols + x;
                    const height = curr[index];
                    const dx = curr[index + 1] - curr[index - 1];
                    const dy = curr[index + cols] - curr[index - cols];
                    const lightSlope = Math.max(0, dx * 0.9 + dy * 0.4);
                    const glow = Math.min(1, lightSlope * 34 + Math.max(0, height) * 0.5);

                    if (glow < 0.02) continue;

                    const highlight = Math.min(1, glow * 1.2);
                    const pixel = index * 4;
                    // A wet, mint-tinted reflection: pale crests on a cyan base.
                    pixels[pixel] = 178 + Math.round(42 * highlight);
                    pixels[pixel + 1] = 248 + Math.round(7 * highlight);
                    pixels[pixel + 2] = 236 + Math.round(14 * highlight);
                    pixels[pixel + 3] = Math.round(
                        255 * Math.min(0.26, Math.pow(glow, 1.7) * 0.27)
                    );
                }
            }

            fieldContext.putImageData(fieldImage, 0, 0);
            display.clearRect(0, 0, width, height);
            display.imageSmoothingEnabled = true;
            display.drawImage(
                fieldCanvas,
                0,
                0,
                cols,
                rows,
                0,
                0,
                width,
                height
            );
        };

        const isCalm = () => {
            if (!grid) return true;
            for (let index = 0; index < grid.curr.length; index += 1) {
                if (Math.abs(grid.curr[index]) > 0.0008) return false;
            }
            return true;
        };

        const stop = () => {
            window.cancelAnimationFrame(frame);
            frame = 0;
            running = false;
            accumulator = 0;
            display.clearRect(0, 0, width, height);
            if (grid) {
                grid.prev.fill(0);
                grid.curr.fill(0);
                grid.next.fill(0);
            }
            if (fieldContext && fieldCanvas.width > 0) {
                fieldContext.clearRect(0, 0, fieldCanvas.width, fieldCanvas.height);
            }
        };

        const loop = (now: number) => {
            if (!running) return;
            const delta = lastFrameTime ? Math.min(0.05, (now - lastFrameTime) / 1000) : 0;
            lastFrameTime = now;
            accumulator += delta;

            let steps = 0;
            while (accumulator >= SIM_STEP && steps < MAX_SUBSTEPS) {
                stepSimulation();
                accumulator -= SIM_STEP;
                steps += 1;
            }

            if (steps > 0) {
                render();
                calmFrames = isCalm() ? calmFrames + 1 : 0;
                if (calmFrames > 24) {
                    stop();
                    return;
                }
            }

            frame = window.requestAnimationFrame(loop);
        };

        const start = () => {
            if (running) return;
            running = true;
            lastFrameTime = 0;
            accumulator = 0;
            calmFrames = 0;
            frame = window.requestAnimationFrame(loop);
        };

        const onPointerMove = (event: PointerEvent) => {
            if (event.pointerType && event.pointerType !== "mouse") return;

            const now = performance.now();
            const dx = Number.isFinite(lastPointerX) ? event.clientX - lastPointerX : 0;
            const dy = Number.isFinite(lastPointerY) ? event.clientY - lastPointerY : 0;
            const distance = Math.hypot(dx, dy);
            if ((Number.isFinite(lastPointerX) && distance < 7) || now - lastImpulse < 34) {
                return;
            }

            lastPointerX = event.clientX;
            lastPointerY = event.clientY;
            lastImpulse = now;
            addDisturbance(
                event.clientX,
                event.clientY,
                Math.min(0.15, 0.05 + distance / 1000)
            );
            start();
        };

        const onVisibilityChange = () => {
            if (document.hidden && running) stop();
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

    return <canvas ref={canvasRef} className="fn-water-field" aria-hidden="true" />;
}
