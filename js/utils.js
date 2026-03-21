// Utility functions and math helpers

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

export function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

export function randomInt(min, max) {
    return Math.floor(randomRange(min, max + 1));
}

export function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

// Easing functions
export const ease = {
    linear: t => t,
    inQuad: t => t * t,
    outQuad: t => t * (2 - t),
    inOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    inCubic: t => t * t * t,
    outCubic: t => (--t) * t * t + 1,
    inOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    outBack: t => { const s = 1.70158; return (t -= 1) * t * ((s + 1) * t + s) + 1; },
    outElastic: t => {
        if (t === 0 || t === 1) return t;
        return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
    },
    outBounce: t => {
        if (t < 1 / 2.75) return 7.5625 * t * t;
        if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
};

// Color utilities
export function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export function rgbString(r, g, b, a = 1) {
    return a < 1 ? `rgba(${r},${g},${b},${a})` : `rgb(${r},${g},${b})`;
}

// Bezier curve point calculation
export function bezierPoint(t, p0, p1, p2, p3) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    return {
        x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
        y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
    };
}

// Generate a random flight path using bezier curves
export function generateFlightPath(canvasW, canvasH, direction) {
    const margin = 100;
    const fromLeft = direction === 'left' || (direction === 'random' && Math.random() > 0.5);

    const startX = fromLeft ? -margin : canvasW + margin;
    const endX = fromLeft ? canvasW + margin : -margin;

    const yRange = canvasH * 0.6;
    const yOffset = canvasH * 0.08;

    const startY = randomRange(yOffset, yOffset + yRange);
    const endY = randomRange(yOffset, yOffset + yRange);

    const cp1x = fromLeft ? canvasW * 0.25 : canvasW * 0.75;
    const cp2x = fromLeft ? canvasW * 0.75 : canvasW * 0.25;
    const cp1y = randomRange(yOffset, yOffset + yRange);
    const cp2y = randomRange(yOffset, yOffset + yRange);

    return {
        p0: { x: startX, y: startY },
        p1: { x: cp1x, y: cp1y },
        p2: { x: cp2x, y: cp2y },
        p3: { x: endX, y: endY },
        fromLeft
    };
}

// Object pool for performance
export class ObjectPool {
    constructor(createFn, resetFn, initialSize = 50) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        this.active = [];
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(createFn());
        }
    }

    get(...args) {
        let obj = this.pool.pop();
        if (!obj) obj = this.createFn();
        this.resetFn(obj, ...args);
        this.active.push(obj);
        return obj;
    }

    release(obj) {
        const idx = this.active.indexOf(obj);
        if (idx !== -1) {
            this.active.splice(idx, 1);
            this.pool.push(obj);
        }
    }

    releaseAll() {
        while (this.active.length) {
            this.pool.push(this.active.pop());
        }
    }

    getActive() {
        return this.active;
    }
}
