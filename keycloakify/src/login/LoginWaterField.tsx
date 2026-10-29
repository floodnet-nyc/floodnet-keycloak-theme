import { useEffect, useRef } from "react";

const SIM_COLS = 120;
const SIM_STEP = 1 / 60;
const BASE_C2 = 0.02;
const REFERENCE_WIDTH = 1440;
const MAX_C2 = 0.42;
const DAMPING = 0.980;
const TRAIL_RADIUS_PX = 20;
const DEBUG_FADE_MS = 800;
const RAW_FIELD_SCALE = 0.15;
const HEIGHT_COLOR_SCALE = 0.2;
const HEIGHT_ALPHA_SCALE = 0.1;
const PALETTE_RAMP_STEPS = 32;
const HEIGHT_NEGATIVE_COLOR = [74, 120, 255] as const;
const HEIGHT_POSITIVE_COLOR = [255, 112, 220] as const;

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
        key: hex2rgb("#3f5f8b"),
        fill: hex2rgb("#818ecb")
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
type Rgb = readonly [number, number, number];

const rgbToHsl = (color: Rgb): [number, number, number] => {
    const r = color[0] / 255;
    const g = color[1] / 255;
    const b = color[2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2;
    if (max === min) return [0, 0, lightness];
    const delta = max - min;
    const saturation =
        lightness > 0.5
            ? delta / Math.max(0.0001, 2 - max - min)
            : delta / Math.max(0.0001, max + min);
    let hue: number;
    if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    return [hue / 6, saturation, lightness];
};

const hslToRgb = (hsl: readonly [number, number, number]): [number, number, number] => {
    const [hue, saturation, lightness] = hsl;
    if (saturation <= 0.0001) {
        const value = Math.round(lightness * 255);
        return [value, value, value];
    }
    const q =
        lightness < 0.5
            ? lightness * (1 + saturation)
            : lightness + saturation - lightness * saturation;
    const p = 2 * lightness - q;
    const channel = (t: number) => {
        let value = t;
        if (value < 0) value += 1;
        if (value > 1) value -= 1;
        if (value < 1 / 6) return p + (q - p) * 6 * value;
        if (value < 1 / 2) return q;
        if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
        return p;
    };
    return [
        Math.round(channel(hue + 1 / 3) * 255),
        Math.round(channel(hue) * 255),
        Math.round(channel(hue - 1 / 3) * 255)
    ];
};

const makePaletteRamp = (from: Rgb, to: Rgb, steps: number) => {
    const fromHsl = rgbToHsl(from);
    const toHsl = rgbToHsl(to);
    let hueDelta = toHsl[0] - fromHsl[0];
    if (hueDelta > 0.5) hueDelta -= 1;
    if (hueDelta < -0.5) hueDelta += 1;
    return Array.from({ length: steps }, (_, index) => {
        const t = index / Math.max(1, steps - 1);
        return hslToRgb([
            (fromHsl[0] + hueDelta * t + 1) % 1,
            fromHsl[1] + (toHsl[1] - fromHsl[1]) * t,
            fromHsl[2] + (toHsl[2] - fromHsl[2]) * t
        ]);
    });
};

const PALETTE_RAMP = makePaletteRamp(PALETTE.fill, PALETTE.key, PALETTE_RAMP_STEPS);
const MAX_SUBSTEPS = 3;

type DebugShape = {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    r0: number;
    r1: number;
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
        const rawCanvas = document.createElement("canvas");
        const rawContext = rawCanvas.getContext("2d");
        let rawImage: ImageData | null = null;
        let debugEnabled = window.localStorage.getItem("fnWaterDebug") === "1";
        let debugFieldMode = false;
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
        let colorByHeight = false;
        canvas.classList.toggle("fn-water-field--height", colorByHeight);
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
            rawCanvas.width = SIM_COLS;
            rawCanvas.height = rows;
            rawImage = rawContext?.createImageData(SIM_COLS, rows) ?? null;
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

        const drawRawField = () => {
            if (!grid || !rawImage || !rawContext || !debugContext) return;
            const { cols, rows, curr } = grid;
            let maxAbs = 0.0001;
            for (let index = 0; index < curr.length; index += 1) {
                const value = Math.abs(curr[index]);
                if (value > maxAbs) maxAbs = value;
            }
            const data = rawImage.data;
            // Fixed scale so the debug view does not renormalize the residual
            // field to full contrast every frame.
            const inverse = 1 / RAW_FIELD_SCALE;
            for (let index = 0; index < curr.length; index += 1) {
                const value = Math.max(-1, Math.min(1, curr[index] * inverse));
                const pixel = index * 4;
                if (value >= 0) {
                    data[pixel] = Math.round(24 + 220 * value);
                    data[pixel + 1] = Math.round(30 + 115 * value);
                    data[pixel + 2] = Math.round(40 + 35 * value);
                } else {
                    const n = -value;
                    data[pixel] = Math.round(8 + 18 * n);
                    data[pixel + 1] = Math.round(26 + 58 * n);
                    data[pixel + 2] = Math.round(36 + 170 * n);
                }
                data[pixel + 3] = 255;
            }
            rawContext.putImageData(rawImage, 0, 0);
            debugContext.clearRect(0, 0, width, height);
            debugContext.imageSmoothingEnabled = true;
            debugContext.drawImage(rawCanvas, 0, 0, cols, rows, 0, 0, width, height);
            debugContext.fillStyle = "rgba(4, 16, 26, 0.8)";
            debugContext.fillRect(16, 16, 330, 72);
            debugContext.fillStyle = "rgba(235, 250, 255, 0.92)";
            debugContext.font = "12px system-ui, sans-serif";
            debugContext.fillText("raw height field (no lighting)", 28, 36);
            debugContext.fillText(
                `fixed scale ±${RAW_FIELD_SCALE.toFixed(3)}  max |h| ${maxAbs.toFixed(4)}`,
                28,
                56
            );
            debugContext.fillText("Shift+F returns to capsules", 28, 76);
        };

        const drawDebug = () => {
            if (!debugEnabled || !debugContext) return;
            if (debugFieldMode) {
                drawRawField();
                return;
            }
            debugContext.clearRect(0, 0, width, height);
            const now = performance.now();
            debugContext.save();
            debugContext.lineCap = "round";
            debugContext.lineJoin = "round";

            for (let index = 0; index < debugShapes.length; index += 1) {
                const shape = debugShapes[index];
                const age = Math.min(1, (now - shape.born) / DEBUG_FADE_MS);
                // Tail-end capsules fade much faster than the head, so the
                // overlay only shows recent forcing rather than a trail of
                // long-lived marks.
                const ageAlpha = (1 - age) * (1 - age);
                const recency = 0.15 + (0.85 * index) / Math.max(1, debugShapes.length);
                const alpha = ageAlpha * recency;
                if (alpha <= 0.02) continue;

                const averageRadius = (shape.r0 + shape.r1) * 0.5;
                debugContext.beginPath();
                debugContext.moveTo(shape.x0, shape.y0);
                debugContext.lineTo(shape.x1, shape.y1);
                debugContext.lineWidth = Math.max(2, averageRadius * 2);
                debugContext.strokeStyle = `rgba(255, 60, 170, ${alpha * 0.28})`;
                debugContext.stroke();
                debugContext.lineWidth = 1.4;
                debugContext.strokeStyle = `rgba(255, 120, 205, ${alpha * 0.9})`;
                debugContext.stroke();
                debugContext.beginPath();
                debugContext.arc(shape.x0, shape.y0, Math.max(1, shape.r0), 0, Math.PI * 2);
                debugContext.strokeStyle = `rgba(255, 120, 205, ${alpha * 0.7})`;
                debugContext.stroke();
                debugContext.beginPath();
                debugContext.arc(shape.x1, shape.y1, Math.max(1, shape.r1), 0, Math.PI * 2);
                debugContext.strokeStyle = `rgba(255, 160, 225, ${alpha * 0.95})`;
                debugContext.stroke();
            }

            // Legend
            debugContext.fillStyle = "rgba(4, 16, 26, 0.78)";
            debugContext.fillRect(16, 16, 300, 78);
            debugContext.fillStyle = "rgba(255, 120, 205, 1)";
            debugContext.fillRect(28, 33, 18, 4);
            debugContext.fillStyle = "rgba(235, 250, 255, 0.92)";
            debugContext.font = "12px system-ui, sans-serif";
            debugContext.fillText("tapered capsule: tail -> head", 54, 39);
            debugContext.fillText(`palette: ${ACTIVE_PALETTE}`, 28, 61);
            debugContext.fillText("Shift+D toggles this overlay", 28, 79);
            debugContext.restore();
        };

        const recordDebugTrail = (
            x0: number,
            y0: number,
            x1: number,
            y1: number,
            r0: number,
            r1: number
        ) => {
            if (!debugEnabled) return;
            debugShapes.push({ x0, y0, x1, y1, r0, r1, born: performance.now() });
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
            tailRadius: number,
            headRadius: number,
            tailStrength: number,
            headStrength: number
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
            const reach = Math.ceil(Math.max(tailRadius, headRadius) * 2.2);
            const minX = Math.max(1, Math.floor(Math.min(gx0, gx1) - reach));
            const maxX = Math.min(cols - 2, Math.ceil(Math.max(gx0, gx1) + reach));
            const minY = Math.max(1, Math.floor(Math.min(gy0, gy1) - reach));
            const maxY = Math.min(rows - 2, Math.ceil(Math.max(gy0, gy1) + reach));
            for (let y = minY; y <= maxY; y += 1) {
                for (let x = minX; x <= maxX; x += 1) {
                    let t = 0;
                    if (lengthSquared > 0.0001) {
                        t = ((x - gx0) * dx + (y - gy0) * dy) / lengthSquared;
                        t = Math.max(0, Math.min(1, t));
                    }
                    const localRadius = tailRadius + (headRadius - tailRadius) * t;
                    if (localRadius < 0.25) continue;
                    const px = gx0 + dx * t;
                    const py = gy0 + dy * t;
                    const distanceSquared = (x - px) * (x - px) + (y - py) * (y - py);
                    if (distanceSquared > reach * reach) continue;
                    const falloff = Math.exp(
                        -distanceSquared / (2 * localRadius * localRadius)
                    );
                    const localStrength =
                        tailStrength + (headStrength - tailStrength) * t;
                    curr[y * cols + x] -= falloff * localStrength;
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
                    if (colorByHeight) {
                        const value = Math.max(
                            -1,
                            Math.min(1, height / HEIGHT_COLOR_SCALE)
                        );
                        const magnitude = Math.abs(value);
                        if (magnitude < 0.018) continue;
                        const color =
                            value >= 0
                                ? HEIGHT_POSITIVE_COLOR
                                : HEIGHT_NEGATIVE_COLOR;
                        const lift = 0.72 + 0.28 * magnitude;
                        const pixel = index * 4;
                        pixels[pixel] = Math.min(255, Math.round(color[0] * lift));
                        pixels[pixel + 1] = Math.min(
                            255,
                            Math.round(color[1] * lift)
                        );
                        pixels[pixel + 2] = Math.min(
                            255,
                            Math.round(color[2] * lift)
                        );
                        pixels[pixel + 3] = Math.round(
                            255 * Math.min(0.52, Math.pow(magnitude, 0.95) * 0.5)
                        );
                        continue;
                    }

                    const keyLight = Math.max(0, dx * 0.9 + dy * 0.4);
                    const fillLight = Math.max(0, -dx * 0.9 - dy * 0.4);
                    const rawKey = keyLight * 42 + Math.max(0, height) * 0.5;
                    const rawFill = fillLight * 16;
                    const raw = rawKey + rawFill;

                    // A soft knee and Reinhard curve for the directional part.
                    const shaped = Math.max(0, raw - 0.012);
                    const glow = shaped / (1 + shaped);

                    // Height sets transparency; the two light directions set
                    // the hue via an HSL ramp. A strong crest/trough remains
                    // visible even where its slope is zero.
                    const heightAmount = Math.min(
                        1,
                        Math.abs(height) / HEIGHT_ALPHA_SCALE
                    );
                    const heightAlpha = Math.pow(heightAmount, 0.9);
                    const lightMix =
                        raw > 0.0001
                            ? rawKey / Math.max(0.0001, rawKey + rawFill)
                            : 0.5;
                    const heightMix = Math.max(
                        0,
                        Math.min(
                            1,
                            0.5 + (height / HEIGHT_COLOR_SCALE) * 0.5
                        )
                    );
                    const mix = raw > 0.0001
                        ? lightMix * 0.7 + heightMix * 0.3
                        : heightMix;
                    const rampIndex = Math.max(
                        0,
                        Math.min(
                            PALETTE_RAMP_STEPS - 1,
                            Math.round(mix * (PALETTE_RAMP_STEPS - 1))
                        )
                    );
                    const color = PALETTE_RAMP[rampIndex];
                    const alpha = Math.min(
                        0.62,
                        Math.pow(glow, 1.25) * 0.65 + heightAlpha * 0.38
                    );
                    if (alpha < 0.01) continue;
                    const lift = 0.72 + 0.28 * Math.max(glow, heightAlpha);
                    const pixel = index * 4;

                    pixels[pixel] = Math.min(255, Math.round(color[0] * lift));
                    pixels[pixel + 1] = Math.min(
                        255,
                        Math.round(color[1] * lift)
                    );
                    pixels[pixel + 2] = Math.min(
                        255,
                        Math.round(color[2] * lift)
                    );
                    pixels[pixel + 3] = Math.round(255 * alpha);
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

            const waveSpeedPxPerMs =
                (Math.sqrt(grid.c2) * cellSize * 60) / 1000;
            const speedRatio = rawSpeed / Math.max(0.0001, waveSpeedPxPerMs);
            const attenuation = 1 / (1 + Math.max(0, speedRatio - 1) * 0.9);

            // Do not let a single simulation step force the whole jump and
            // become a supersonic line source. Only the last portion of the
            // pointer movement contributes, and fast movement is attenuated.
            const maxForcedDistance = Math.max(10, cellSize * 1.4);
            const appliedDistance = Math.min(distance, maxForcedDistance);
            const vx = dx / distance;
            const vy = dy / distance;
            const fromX = pendingToX - vx * appliedDistance;
            const fromY = pendingToY - vy * appliedDistance;

            const speedScale = 1 + Math.min(1.05, smoothedSpeed * 0.65);
            const headRadius = Math.max(2.0, (TRAIL_RADIUS_PX * speedScale) / cellSize);
            const tailRadius = Math.max(1.5, headRadius * 0.45);
            const headStrength = Math.min(
                0.11,
                appliedDistance * 0.0032 * attenuation
            );
            const tailStrength = headStrength * 0.22;

            addCapsule(
                fromX,
                fromY,
                pendingToX,
                pendingToY,
                tailRadius,
                headRadius,
                tailStrength,
                headStrength
            );
            recordDebugTrail(
                fromX,
                fromY,
                pendingToX,
                pendingToY,
                tailRadius * cellSize,
                headRadius * cellSize
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

        const onPointerDown = (event: PointerEvent) => {
            if (event.pointerType && event.pointerType !== "mouse") return;
            if (event.button !== 0) return;
            const target = event.target instanceof Element ? event.target : null;
            if (target?.closest(".card-pf, a, button, input, select, textarea, label")) {
                return;
            }

            const cellSize = width / SIM_COLS;
            const radius = Math.max(3, 34 / cellSize);
            addCapsule(
                event.clientX,
                event.clientY,
                event.clientX,
                event.clientY,
                radius,
                radius,
                0.12,
                0.12
            );
            recordDebugTrail(
                event.clientX,
                event.clientY,
                event.clientX,
                event.clientY,
                radius * cellSize,
                radius * cellSize
            );
            trimDebugShapes();
            start();
        };

        const onVisibilityChange = () => {
            if (document.hidden && running) stop();
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.shiftKey && event.key.toLowerCase() === "h") {
                colorByHeight = !colorByHeight;
                canvas.classList.toggle("fn-water-field--height", colorByHeight);
                if (grid) render();
                if (debugEnabled) drawDebug();
                return;
            }

            if (event.shiftKey && event.key.toLowerCase() === "f") {
                debugFieldMode = !debugFieldMode;
                debugEnabled = true;
                document.body.classList.add("fn-water-debug-on");
                drawDebug();
                return;
            }

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
        window.addEventListener("pointerdown", onPointerDown, { passive: true });
        window.addEventListener("keydown", onKeyDown);
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener("resize", resize);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerdown", onPointerDown);
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
