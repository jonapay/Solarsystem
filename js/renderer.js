// Renderer - Handles canvas rendering, background, and parallax
import { lerp, randomRange, clamp } from './utils.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Background layers for parallax
        this.bgLayers = [];
        this.clouds = [];
        this.trees = [];
        this.grassBlades = [];
        this.mountains = [];

        this.timeOfDay = 0; // 0-1, affects sky color
        this.screenShake = { x: 0, y: 0, intensity: 0, decay: 0.9 };

        this.resize();
        this._generateBackground();
    }

    resize() {
        const container = this.canvas.parentElement;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = container.clientWidth;
        const h = container.clientHeight;
        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.ctx.scale(dpr, dpr);
        this.displayWidth = w;
        this.displayHeight = h;
        this._generateBackground();
    }

    _generateBackground() {
        const w = this.displayWidth;
        const h = this.displayHeight;

        // Generate mountains
        this.mountains = [];
        for (let layer = 0; layer < 3; layer++) {
            const points = [];
            const segments = 20 + layer * 5;
            const baseY = h * (0.55 + layer * 0.1);
            const amplitude = h * (0.15 - layer * 0.03);

            for (let i = 0; i <= segments; i++) {
                const x = (i / segments) * (w + 100) - 50;
                const y = baseY - Math.abs(Math.sin(i * 0.8 + layer * 2)) * amplitude
                    - Math.abs(Math.sin(i * 1.7 + layer)) * amplitude * 0.5;
                points.push({ x, y });
            }
            this.mountains.push({
                points,
                layer,
                parallax: 0.1 + layer * 0.05,
                color: layer === 0 ? '#2d4a3e' : layer === 1 ? '#3d6b55' : '#4a8a6a'
            });
        }

        // Generate clouds
        this.clouds = [];
        for (let i = 0; i < 8; i++) {
            this.clouds.push({
                x: randomRange(-100, w + 100),
                y: randomRange(h * 0.03, h * 0.3),
                width: randomRange(80, 250),
                height: randomRange(30, 70),
                speed: randomRange(5, 25),
                opacity: randomRange(0.3, 0.7),
                parallax: randomRange(0.02, 0.08)
            });
        }

        // Generate trees
        this.trees = [];
        for (let i = 0; i < 15; i++) {
            this.trees.push({
                x: randomRange(0, w),
                baseY: h * randomRange(0.7, 0.82),
                height: randomRange(40, 120),
                width: randomRange(20, 50),
                type: Math.random() > 0.5 ? 'pine' : 'deciduous',
                color: `hsl(${randomRange(90, 150)}, ${randomRange(30, 60)}%, ${randomRange(20, 40)}%)`,
                parallax: randomRange(0.1, 0.2)
            });
        }

        // Generate grass
        this.grassBlades = [];
        for (let i = 0; i < 100; i++) {
            this.grassBlades.push({
                x: randomRange(0, w),
                baseY: h * randomRange(0.82, 0.95),
                height: randomRange(10, 30),
                swayOffset: randomRange(0, Math.PI * 2),
                swaySpeed: randomRange(1.5, 3),
                color: `hsl(${randomRange(80, 140)}, ${randomRange(40, 70)}%, ${randomRange(25, 45)}%)`
            });
        }
    }

    shake(intensity = 5) {
        this.screenShake.intensity = intensity;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    renderBackground(time) {
        const ctx = this.ctx;
        const w = this.displayWidth;
        const h = this.displayHeight;

        // Apply screen shake
        ctx.save();
        if (this.screenShake.intensity > 0.1) {
            this.screenShake.x = (Math.random() - 0.5) * this.screenShake.intensity * 2;
            this.screenShake.y = (Math.random() - 0.5) * this.screenShake.intensity * 2;
            this.screenShake.intensity *= this.screenShake.decay;
            ctx.translate(this.screenShake.x, this.screenShake.y);
        }

        // Sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.7);
        skyGrad.addColorStop(0, '#1a3a5c');
        skyGrad.addColorStop(0.3, '#3a7bd5');
        skyGrad.addColorStop(0.6, '#6db3f2');
        skyGrad.addColorStop(1, '#b8ddf7');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Sun
        const sunX = w * 0.8;
        const sunY = h * 0.12;
        const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 120);
        sunGrad.addColorStop(0, 'rgba(255, 250, 200, 0.9)');
        sunGrad.addColorStop(0.3, 'rgba(255, 220, 100, 0.4)');
        sunGrad.addColorStop(1, 'rgba(255, 200, 50, 0)');
        ctx.fillStyle = sunGrad;
        ctx.fillRect(sunX - 120, sunY - 120, 240, 240);

        ctx.fillStyle = '#FFFDE8';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 25, 0, Math.PI * 2);
        ctx.fill();

        // Clouds
        for (const cloud of this.clouds) {
            cloud.x += cloud.speed * 0.016;
            if (cloud.x > w + cloud.width) cloud.x = -cloud.width;

            ctx.save();
            ctx.globalAlpha = cloud.opacity;
            ctx.fillStyle = '#FFFFFF';
            const cx = cloud.x;
            const cy = cloud.y;

            // Multi-ellipse cloud
            ctx.beginPath();
            ctx.ellipse(cx, cy, cloud.width * 0.5, cloud.height * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx - cloud.width * 0.25, cy + 5, cloud.width * 0.35, cloud.height * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + cloud.width * 0.25, cy + 3, cloud.width * 0.35, cloud.height * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + cloud.width * 0.1, cy - cloud.height * 0.2, cloud.width * 0.3, cloud.height * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // Mountains
        for (const mtn of this.mountains) {
            ctx.fillStyle = mtn.color;
            ctx.beginPath();
            ctx.moveTo(-50, h);
            for (const pt of mtn.points) {
                ctx.lineTo(pt.x, pt.y);
            }
            ctx.lineTo(w + 50, h);
            ctx.closePath();
            ctx.fill();

            // Atmospheric haze
            if (mtn.layer < 2) {
                ctx.fillStyle = `rgba(100, 160, 200, ${0.15 - mtn.layer * 0.05})`;
                ctx.fill();
            }
        }

        // Ground
        const groundY = h * 0.78;
        const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
        groundGrad.addColorStop(0, '#4a7c3f');
        groundGrad.addColorStop(0.3, '#3d6b33');
        groundGrad.addColorStop(1, '#2d5023');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, groundY, w, h - groundY);

        // Ground detail line
        ctx.strokeStyle = '#5a9c4f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < w; x += 3) {
            const y = groundY + Math.sin(x * 0.05) * 3 + Math.sin(x * 0.02) * 5;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Trees (background)
        for (const tree of this.trees) {
            this._renderTree(ctx, tree, time);
        }

        // Grass
        for (const grass of this.grassBlades) {
            const sway = Math.sin(time * 0.001 * grass.swaySpeed + grass.swayOffset) * 5;
            ctx.strokeStyle = grass.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(grass.x, grass.baseY);
            ctx.quadraticCurveTo(
                grass.x + sway,
                grass.baseY - grass.height * 0.6,
                grass.x + sway * 1.5,
                grass.baseY - grass.height
            );
            ctx.stroke();
        }
    }

    _renderTree(ctx, tree, time) {
        const sway = Math.sin(time * 0.001 + tree.x * 0.01) * 2;

        ctx.save();
        ctx.translate(tree.x, tree.baseY);

        // Trunk
        ctx.fillStyle = '#5D3A1A';
        ctx.fillRect(-tree.width * 0.1, -tree.height * 0.4, tree.width * 0.2, tree.height * 0.4);

        if (tree.type === 'pine') {
            // Pine tree layers
            for (let i = 0; i < 3; i++) {
                const layerW = tree.width * (1 - i * 0.25);
                const layerY = -tree.height * (0.3 + i * 0.25);
                const layerH = tree.height * 0.35;

                ctx.fillStyle = tree.color;
                ctx.beginPath();
                ctx.moveTo(sway, layerY - layerH);
                ctx.lineTo(-layerW / 2, layerY);
                ctx.lineTo(layerW / 2, layerY);
                ctx.closePath();
                ctx.fill();
            }
        } else {
            // Deciduous tree crown
            ctx.fillStyle = tree.color;
            ctx.beginPath();
            ctx.ellipse(sway, -tree.height * 0.65, tree.width * 0.5, tree.height * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.beginPath();
            ctx.ellipse(sway - 5, -tree.height * 0.7, tree.width * 0.3, tree.height * 0.25, -0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    renderForeground(time) {
        // Vignette effect
        const ctx = this.ctx;
        const w = this.displayWidth;
        const h = this.displayHeight;

        const vignetteGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.8);
        vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = vignetteGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.restore(); // Restore from screen shake
    }

    get width() { return this.displayWidth; }
    get height() { return this.displayHeight; }
}
