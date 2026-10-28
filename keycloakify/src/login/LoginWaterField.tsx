import { useEffect, useRef } from "react";

const SIM_COLS = 120;
const SIM_STEP = 1 / 60;
const BASE_C2 = 0.08;
const REFERENCE_WIDTH = 1440;
const MAX_C2 = 0.42;
const DAMPING = 0.985;
const TRAIL_RADIUS_PX = 18;

// Two-light palettes for the caustics. The key comes from the upper left,
// the fill from the lower right. Add or tune entries here.
const hex2rgb = (hex: string): [number, number, number] => {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
};
const PALETTES = {
    ultraviolet: {
        key: [255, 122, 217] as const,
        fill: [73, 200, 255] as const
    },
    afterglow: {
        key: [255, 184, 138] as const,
        fill: [96, 86, 255] as const
    },
    tidepool: {
        key: [124, 255, 226] as const,
        fill: [62, 88, 255] as const
    },
    moonpool: {
        key: [155, 210, 255] as const,
        fill: [88, 58, 200] as const
    },
    puddle: {
        // soft blue #5ba8c2 (puddle), fill = deep blue #0047ab (water)
        key: hex2rgb("#2f3762"),
        fill: hex2rgb("#00193b")
    },
    dusk: {
        // warm peach #ff8f3e (streetlights), fill = violet-blue #003cef (rainy dusk)
        key: [255, 143, 62] as const,
        fill: [0, 0, 0] as const
    },
} as const;

// Change this one line to preview a palette.
const ACTIVE_PALETTE: keyof typeof PALETTES = "puddle";
const PALETTE = PALETTES[ACTIVE_PALETTE];
const MAX_SUBSTEPS = 3;

type DebugShape = {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    radius: number;
    born: number;
};

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
    const debugCanvasRef = useRef<HTMLCanvasElement>(null);

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

        const debugCanvas = debugCanvasRef.current;
        const debugContext = debugCanvas?.getContext("2d") ?? null;
        let debugEnabled = window.localStorage.getItem("fnWaterDebug") === "1";
        if (debugEnabled) document.body.classList.add("fn-water-debug-on");
        const debugShapes: DebugShape[] = [];

        let width = 0;
        let height = 0;
        let dpr = 1;
        let grid: Grid | null = null;
        let fieldImage: ImageData | null = null;
        let frame = 0;
        let lastFrameTime = 0;
        let accumulator = 0;
        let pendingFromX = Number.NaN;
        let pendingFromY = Number.NaN;
        let pendingToX = Number.NaN;
        let pendingToY = Number.NaN;
        let pendingSince = 0;
        let smoothedSpeed = 0;
        let calmFrames = 0;
        let running = false;

        const resetGrid = () => {
            const rows = Math.max(
                64,
                Math.min(160, Math.round((SIM_COLS * height) / Math.max(1, width)))
            );
            const speedScale = Math.max(
                0.25,
                Math.min(1.95, REFERENCE_WIDTH / Math.max(1, width))
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
            display.imageSmoothingEnabled = true;
            display.imageSmoothingQuality = "high";
            const waterBlur = Math.min(7, Math.max(2.4, (width / SIM_COLS) * 0.5));
            canvas.style.setProperty("--fn-water-blur", `${waterBlur}px`);
            if (debugCanvas && debugContext) {
                debugCanvas.width = Math.round(width * dpr);
                debugCanvas.height = Math.round(height * dpr);
                debugCanvas.style.width = `${width}px`;
                debugCanvas.style.height = `${height}px`;
                debugContext.setTransform(dpr, 0, 0, dpr, 0, 0);
            }
            resetGrid();
            drawDebug();
        };

        const drawDebug = () => {
            if (!debugEnabled || !debugContext) return;
            debugContext.clearRect(0, 0, width, height);
            const now = performance.now();
            debugContext.save();
            debugContext.lineCap = "round";
            debugContext.lineJoin = "round";

            for (let index = 0; index < debugShapes.length; index += 1) {
                const shape = debugShapes[index];
                const age = Math.min(1, (now - shape.born) / 2600);
                const ageAlpha = Math.max(0, 1 - age);
                const recency = 0.35 + (0.65 * index) / Math.max(1, debugShapes.length);
                const alpha = ageAlpha * recency;
                if (alpha <= 0.02) continue;

                debugContext.beginPath();
                debugContext.moveTo(shape.x0, shape.y0);
                debugContext.lineTo(shape.x1, shape.y1);
                debugContext.lineWidth = Math.max(2, shape.radius * 2);
                debugContext.strokeStyle = `rgba(255, 60, 170, ${alpha * 0.28})`;
                debugContext.stroke();
                debugContext.lineWidth = 1.4;
                debugContext.strokeStyle = `rgba(255, 120, 205, ${alpha * 0.9})`;
                debugContext.stroke();
            }

            // Legend
            debugContext.fillStyle = "rgba(4, 16, 26, 0.78)";
            debugContext.fillRect(16, 16, 300, 78);
            debugContext.fillStyle = "rgba(255, 120, 205, 1)";
            debugContext.fillRect(28, 33, 18, 4);
            debugContext.fillStyle = "rgba(235, 250, 255, 0.92)";
            debugContext.font = "12px system-ui, sans-serif";
            debugContext.fillText("trail capsule only", 54, 39);
            debugContext.fillText(`palette: ${ACTIVE_PALETTE}`, 28, 61);
            debugContext.fillText("Shift+D toggles this overlay", 28, 79);
            debugContext.restore();
        };

        const recordDebugTrail = (
            x0: number,
            y0: number,
            x1: number,
            y1: number,
            radius: number
        ) => {
            if (!debugEnabled) return;
            debugShapes.push({ x0, y0, x1, y1, radius, born: performance.now() });
        };

        const trimDebugShapes = () => {
            if (debugShapes.length > 80) {
                debugShapes.splice(0, debugShapes.length - 80);
            }
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
                    const keyLight = Math.max(0, dx * 0.9 + dy * 0.4);
                    const fillLight = Math.max(0, -dx * 0.9 - dy * 0.4);
                    const rawKey = keyLight * 42 + Math.max(0, height) * 0.5;
                    const rawFill = fillLight * 16;
                    const raw = rawKey + rawFill;

                    // A soft knee and Reinhard curve: faint residual waves fall
                    // away gradually instead of clipping into hard bands.
                    const shaped = Math.max(0, raw - 0.012);
                    if (shaped < 0.004) continue;
                    const glow = shaped / (1 + shaped);
                    const mix = rawKey / Math.max(0.0001, rawKey + rawFill);
                    const lift = 0.7 + 0.3 * glow;
                    const pixel = index * 4;

                    // Blend the two light directions into a gradient rather
                    // than flattening everything to one blue.
                    pixels[pixel] = Math.min(
                        255,
                        Math.round(
                            (PALETTE.key[0] * mix +
                                PALETTE.fill[0] * (1 - mix)) *
                                lift
                        )
                    );
                    pixels[pixel + 1] = Math.min(
                        255,
                        Math.round(
                            (PALETTE.key[1] * mix +
                                PALETTE.fill[1] * (1 - mix)) *
                                lift
                        )
                    );
                    pixels[pixel + 2] = Math.min(
                        255,
                        Math.round(
                            (PALETTE.key[2] * mix +
                                PALETTE.fill[2] * (1 - mix)) *
                                lift
                        )
                    );
                    pixels[pixel + 3] = Math.round(
                        255 * Math.min(0.58, Math.pow(glow, 1.25) * 0.8)
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
            pendingFromX = Number.NaN;
            pendingFromY = Number.NaN;
            pendingToX = Number.NaN;
            pendingToY = Number.NaN;
            smoothedSpeed = 0;
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
            let forcingApplied = false;
            while (accumulator >= SIM_STEP && steps < MAX_SUBSTEPS) {
                if (!forcingApplied) {
                    applyPendingForcing(now);
                    forcingApplied = true;
                }
                stepSimulation();
                accumulator -= SIM_STEP;
                steps += 1;
            }

            if (steps > 0) {
                render();
                drawDebug();
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

        const applyPendingForcing = (now: number) => {
            if (!grid) return;
            if (
                !Number.isFinite(pendingFromX) ||
                !Number.isFinite(pendingToX)
            ) {
                return;
            }

            const dx = pendingToX - pendingFromX;
            const dy = pendingToY - pendingFromY;
            const distance = Math.hypot(dx, dy);
            if (distance < 0.75) return;

            if (distance > 420) {
                pendingFromX = pendingToX;
                pendingFromY = pendingToY;
                pendingSince = now;
                smoothedSpeed = 0;
                return;
            }

            const cellSize = width / SIM_COLS;
            const elapsed = Number.isFinite(pendingSince)
                ? Math.max(SIM_STEP * 1000, now - pendingSince)
                : SIM_STEP * 1000;
            const rawSpeed = distance / elapsed; // CSS pixels per millisecond
            smoothedSpeed += (Math.min(2.5, rawSpeed) - smoothedSpeed) * 0.22;

            const speedScale = 1 + Math.min(1.05, smoothedSpeed * 0.65);
            const trailRadius = Math.max(2.0, (TRAIL_RADIUS_PX * speedScale) / cellSize);
            // The displacement is per path length, so slow movement does not
            // accumulate a pulse for every pointer callback.
            const trailStrength = Math.min(0.12, distance * 0.003);

            addCapsule(
                pendingFromX,
                pendingFromY,
                pendingToX,
                pendingToY,
                trailRadius,
                trailStrength
            );
            recordDebugTrail(
                pendingFromX,
                pendingFromY,
                pendingToX,
                pendingToY,
                trailRadius * cellSize
            );
            trimDebugShapes();

            pendingFromX = pendingToX;
            pendingFromY = pendingToY;
            pendingSince = now;
        };

        const onPointerMove = (event: PointerEvent) => {
            if (event.pointerType && event.pointerType !== "mouse") return;

            const coalesced =
                typeof event.getCoalescedEvents === "function"
                    ? event.getCoalescedEvents()
                    : [];
            const samples = coalesced.length > 0 ? coalesced : [event];
            let moved = false;

            for (const sample of samples) {
                const x = sample.clientX;
                const y = sample.clientY;
                const time = sample.timeStamp || performance.now();

                if (!Number.isFinite(pendingFromX) || !Number.isFinite(pendingToX)) {
                    pendingFromX = x;
                    pendingFromY = y;
                    pendingToX = x;
                    pendingToY = y;
                    pendingSince = time;
                    moved = true;
                    continue;
                }

                const jump = Math.hypot(x - pendingToX, y - pendingToY);
                if (jump > 420) {
                    pendingFromX = x;
                    pendingFromY = y;
                    pendingToX = x;
                    pendingToY = y;
                    pendingSince = time;
                    smoothedSpeed = 0;
                    moved = true;
                    continue;
                }

                if (jump > 0.1) {
                    pendingToX = x;
                    pendingToY = y;
                    moved = true;
                }
            }

            if (moved) start();
        };

        const onVisibilityChange = () => {
            if (document.hidden && running) stop();
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (!(event.shiftKey && event.key.toLowerCase() === "d")) return;
            debugEnabled = !debugEnabled;
            document.body.classList.toggle("fn-water-debug-on", debugEnabled);
            if (debugEnabled) {
                drawDebug();
            } else if (debugContext) {
                debugContext.clearRect(0, 0, width, height);
            }
        };

        resize();
        window.addEventListener("resize", resize);
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("keydown", onKeyDown);
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener("resize", resize);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("visibilitychange", onVisibilityChange);
            document.body.classList.remove("fn-water-debug-on");
        };
    }, []);

    return (
        <>
            <canvas ref={canvasRef} className="fn-water-field" aria-hidden="true" />
            <canvas ref={debugCanvasRef} className="fn-water-debug" aria-hidden="true" />
        </>
    );
}
