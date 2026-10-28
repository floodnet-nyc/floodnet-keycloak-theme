import { useEffect, useRef } from "react";

const SIM_COLS = 120;
const SIM_STEP = 1 / 60;
const BASE_C2 = 0.18;
const REFERENCE_WIDTH = 1440;
const MAX_C2 = 0.42;
const DAMPING = 0.994;
const TRAIL_RADIUS_PX = 18;
const HEAD_RADIUS_PX = 30;
const MAX_SUBSTEPS = 3;

type Grid = {
    cols: number;
    rows: number;
    prev: Float32Array;
    curr: Float32Array;
    next: Float32Array;
    c2: number;
    c: number;
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
        let lastStampX = Number.NaN;
        let lastStampY = Number.NaN;
        let calmFrames = 0;
        let running = false;

        const resetGrid = () => {
            const rows = Math.max(
                64,
                Math.min(160, Math.round((SIM_COLS * height) / Math.max(1, width)))
            );
            const speedScale = Math.max(
                0.55,
                Math.min(1.65, REFERENCE_WIDTH / Math.max(1, width))
            );
            const c2 = Math.min(MAX_C2, BASE_C2 * speedScale * speedScale);
            grid = {
                cols: SIM_COLS,
                rows,
                prev: new Float32Array(SIM_COLS * rows),
                curr: new Float32Array(SIM_COLS * rows),
                next: new Float32Array(SIM_COLS * rows),
                c2,
                c: Math.sqrt(c2)
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

        const addCapsule = (
            fromX: number,
            fromY: number,
            toX: number,
            toY: number,
            radius: number,
            strength: number
        ) => {
            if (!grid) return;
            const { cols, rows, curr } = grid;
            const gx0 = (fromX / width) * (cols - 1);
            const gy0 = (fromY / height) * (rows - 1);
            const gx1 = (toX / width) * (cols - 1);
            const gy1 = (toY / height) * (rows - 1);
            const dx = gx1 - gx0;
            const dy = gy1 - gy0;
            const lengthSquared = dx * dx + dy * dy;
            const reach = Math.ceil(radius * 2.2);
            const minX = Math.max(1, Math.floor(Math.min(gx0, gx1) - reach));
            const maxX = Math.min(cols - 2, Math.ceil(Math.max(gx0, gx1) + reach));
            const minY = Math.max(1, Math.floor(Math.min(gy0, gy1) - reach));
            const maxY = Math.min(rows - 2, Math.ceil(Math.max(gy0, gy1) + reach));
            const scale = 1 / (2 * radius * radius);

            for (let y = minY; y <= maxY; y += 1) {
                for (let x = minX; x <= maxX; x += 1) {
                    let t = 0;
                    if (lengthSquared > 0.0001) {
                        t = ((x - gx0) * dx + (y - gy0) * dy) / lengthSquared;
                        t = Math.max(0, Math.min(1, t));
                    }
                    const px = gx0 + dx * t;
                    const py = gy0 + dy * t;
                    const distanceSquared = (x - px) * (x - px) + (y - py) * (y - py);
                    if (distanceSquared > reach * reach) continue;
                    const falloff = Math.exp(-distanceSquared * scale);
                    curr[y * cols + x] -= falloff * strength;
                }
            }
        };

        const stepSimulation = () => {
            if (!grid) return;
            const { cols, rows, prev, curr, next, c2 } = grid;

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
                            c2 * (neighbours - 4 * curr[index])) *
                        DAMPING;
                }
            }

            // First-order Mur absorbing boundary: let outgoing waves cross the
            // frame instead of bouncing energy back into the scene. The wave
            // equation is solved on a unit grid, so the Courant number is
            // simply sqrt(c2).
            const mur = (grid.c - 1) / (grid.c + 1);
            for (let y = 1; y < rows - 1; y += 1) {
                const row = y * cols;
                const left = row;
                const right = row + cols - 1;
                next[left] =
                    (curr[left + 1] + mur * (next[left + 1] - curr[left])) * DAMPING;
                next[right] =
                    (curr[right - 1] + mur * (next[right - 1] - curr[right])) * DAMPING;
            }
            for (let x = 1; x < cols - 1; x += 1) {
                const top = x;
                const bottom = (rows - 1) * cols + x;
                next[top] =
                    (curr[top + cols] + mur * (next[top + cols] - curr[top])) * DAMPING;
                next[bottom] =
                    (curr[bottom - cols] + mur * (next[bottom - cols] - curr[bottom])) *
                    DAMPING;
            }

            // Mur corners are not uniquely defined; average the two adjacent
            // one-way updates so a corner does not become a point reflector.
            next[0] = (next[1] + next[cols]) * 0.5;
            next[cols - 1] = (next[cols - 2] + next[2 * cols - 1]) * 0.5;
            next[(rows - 1) * cols] = (next[(rows - 1) * cols + 1] + next[(rows - 2) * cols]) * 0.5;
            next[rows * cols - 1] =
                (next[rows * cols - 2] + next[(rows - 1) * cols - 1]) * 0.5;

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
                    const glow = Math.min(1, lightSlope * 46 + Math.max(0, height) * 0.7);

                    if (glow < 0.02) continue;

                    const highlight = Math.min(1, glow * 1.2);
                    const pixel = index * 4;
                    // Cool scene light rather than a white overlay: blue-cyan
                    // highlights that screen into the rainy photo.
                    pixels[pixel] = 18 + Math.round(28 * highlight);
                    pixels[pixel + 1] = 76 + Math.round(58 * highlight);
                    pixels[pixel + 2] = 220 + Math.round(35 * highlight);
                    pixels[pixel + 3] = Math.round(
                        255 * Math.min(0.6, Math.pow(glow, 1.4) * 0.5)
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

        const stampSegment = (toX: number, toY: number) => {
            if (!grid) return false;

            const cellSize = width / SIM_COLS;
            const trailRadius = Math.max(2.0, TRAIL_RADIUS_PX / cellSize);
            const headRadius = Math.max(3.0, HEAD_RADIUS_PX / cellSize);

            if (!Number.isFinite(lastStampX) || !Number.isFinite(lastStampY)) {
                addCapsule(toX, toY, toX, toY, headRadius, 0.022);
                lastStampX = toX;
                lastStampY = toY;
                return true;
            }

            const dx = toX - lastStampX;
            const dy = toY - lastStampY;
            const distance = Math.hypot(dx, dy);
            if (distance < 0.75) return false;

            // A pointer leaving and re-entering far away should not carve a
            // line across the whole scene.
            if (distance > 420) {
                lastStampX = toX;
                lastStampY = toY;
                addCapsule(toX, toY, toX, toY, headRadius, 0.022);
                return true;
            }

            const speed = Math.min(1, distance / 90);
            const trailStrength = Math.min(0.045, 0.014 + distance / 1500);
            const headStrength = Math.min(0.08, 0.025 + distance / 1000);
            const vx = dx / Math.max(1, distance);
            const vy = dy / Math.max(1, distance);
            const lead = Math.min(24, distance * 0.35);

            // A continuous capsule along the path plus a softer, larger head
            // just ahead of the pointer. The moving depression makes the wake;
            // the head gives the wavefront a leading crest.
            addCapsule(lastStampX, lastStampY, toX, toY, trailRadius, trailStrength);
            addCapsule(
                toX + vx * lead,
                toY + vy * lead,
                toX + vx * lead,
                toY + vy * lead,
                headRadius * (0.9 + speed * 0.28),
                headStrength
            );

            lastStampX = toX;
            lastStampY = toY;
            return true;
        };

        const onPointerMove = (event: PointerEvent) => {
            if (event.pointerType && event.pointerType !== "mouse") return;

            const coalesced =
                typeof event.getCoalescedEvents === "function"
                    ? event.getCoalescedEvents()
                    : [];
            const samples = coalesced.length > 0 ? coalesced : [event];
            let stamped = false;
            for (const sample of samples) {
                stamped = stampSegment(sample.clientX, sample.clientY) || stamped;
            }

            if (stamped) start();
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
