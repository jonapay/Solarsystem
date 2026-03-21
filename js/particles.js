// Particle System - handles hit effects, feathers, explosions
import { randomRange, lerp, ObjectPool } from './utils.js';

class Particle {
    constructor() {
        this.x = 0; this.y = 0;
        this.vx = 0; this.vy = 0;
        this.life = 0; this.maxLife = 0;
        this.size = 0; this.startSize = 0; this.endSize = 0;
        this.color = ''; this.alpha = 1;
        this.rotation = 0; this.rotationSpeed = 0;
        this.gravity = 0;
        this.type = 'circle'; // circle, feather, spark, star
        this.friction = 1;
        this.active = false;
    }
}

export class ParticleSystem {
    constructor() {
        this.pool = new ObjectPool(
            () => new Particle(),
            (p, config) => {
                if (!config) return;
                Object.assign(p, config);
                p.life = config.maxLife || 1;
                p.startSize = config.size || 4;
                p.endSize = config.endSize || 0;
                p.alpha = 1;
                p.active = true;
            },
            200
        );
    }

    emit(x, y, config, count = 1) {
        for (let i = 0; i < count; i++) {
            const cfg = typeof config === 'function' ? config(i) : { ...config };
            cfg.x = x + (cfg.offsetX || 0);
            cfg.y = y + (cfg.offsetY || 0);
            delete cfg.offsetX;
            delete cfg.offsetY;
            this.pool.get(cfg);
        }
    }

    // Pre-built effect: hit impact
    emitHit(x, y, color = '#FFD700') {
        // Sparks
        this.emit(x, y, () => {
            const angle = randomRange(0, Math.PI * 2);
            const speed = randomRange(100, 350);
            return {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                maxLife: randomRange(0.2, 0.5),
                size: randomRange(2, 5),
                endSize: 0,
                color: color,
                type: 'spark',
                gravity: 200,
                friction: 0.96,
                rotation: 0,
                rotationSpeed: 0
            };
        }, 12);

        // Flash
        this.emit(x, y, {
            vx: 0, vy: 0,
            maxLife: 0.15,
            size: 30,
            endSize: 60,
            color: '#FFFFFF',
            type: 'circle',
            gravity: 0,
            friction: 1,
            rotation: 0,
            rotationSpeed: 0
        }, 1);
    }

    // Pre-built effect: critical hit
    emitCritical(x, y) {
        // Big explosion sparks
        this.emit(x, y, () => {
            const angle = randomRange(0, Math.PI * 2);
            const speed = randomRange(150, 500);
            return {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                maxLife: randomRange(0.3, 0.7),
                size: randomRange(3, 7),
                endSize: 0,
                color: ['#FF4444', '#FF8800', '#FFDD00', '#FFFFFF'][Math.floor(Math.random() * 4)],
                type: 'spark',
                gravity: 150,
                friction: 0.95,
                rotation: 0,
                rotationSpeed: 0
            };
        }, 25);

        // Stars
        this.emit(x, y, () => {
            const angle = randomRange(0, Math.PI * 2);
            const speed = randomRange(50, 200);
            return {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                maxLife: randomRange(0.5, 1.0),
                size: randomRange(8, 14),
                endSize: 0,
                color: '#FFD700',
                type: 'star',
                gravity: 80,
                friction: 0.97,
                rotation: randomRange(0, Math.PI * 2),
                rotationSpeed: randomRange(-5, 5)
            };
        }, 6);

        // Flash
        this.emit(x, y, {
            vx: 0, vy: 0,
            maxLife: 0.2,
            size: 50,
            endSize: 100,
            color: '#FFFFFF',
            type: 'circle',
            gravity: 0,
            friction: 1,
            rotation: 0,
            rotationSpeed: 0
        }, 1);
    }

    // Feather burst
    emitFeathers(x, y, bodyColor = '#8B4513') {
        const colors = [bodyColor, '#FFFFFF', '#F5DEB3', '#DEB887'];
        this.emit(x, y, () => {
            const angle = randomRange(0, Math.PI * 2);
            const speed = randomRange(60, 200);
            return {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - randomRange(30, 80),
                maxLife: randomRange(0.8, 2.0),
                size: randomRange(6, 14),
                endSize: randomRange(3, 6),
                color: colors[Math.floor(Math.random() * colors.length)],
                type: 'feather',
                gravity: randomRange(50, 120),
                friction: 0.985,
                rotation: randomRange(0, Math.PI * 2),
                rotationSpeed: randomRange(-4, 4)
            };
        }, 10);
    }

    // Score popup particle
    emitScorePopup(x, y, text, color = '#FFD700') {
        const p = this.pool.get({
            x, y,
            vx: randomRange(-20, 20),
            vy: -120,
            maxLife: 1.2,
            size: 20,
            endSize: 16,
            color: color,
            type: 'text',
            text: text,
            gravity: -30,
            friction: 0.98,
            rotation: 0,
            rotationSpeed: 0
        });
        return p;
    }

    // Miss indicator
    emitMiss(x, y) {
        // Dust puff
        this.emit(x, y, () => {
            const angle = randomRange(-Math.PI * 0.8, -Math.PI * 0.2);
            const speed = randomRange(20, 60);
            return {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                maxLife: randomRange(0.3, 0.6),
                size: randomRange(3, 8),
                endSize: randomRange(10, 20),
                color: '#886644',
                type: 'circle',
                gravity: -10,
                friction: 0.95,
                rotation: 0,
                rotationSpeed: 0
            };
        }, 5);
    }

    update(dt) {
        const particles = this.pool.getActive();
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                p.active = false;
                this.pool.release(p);
                continue;
            }

            const lifeRatio = p.life / p.maxLife;

            p.vy += p.gravity * dt;
            p.vx *= p.friction;
            p.vy *= p.friction;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.rotation += p.rotationSpeed * dt;

            p.size = lerp(p.endSize, p.startSize, lifeRatio);
            p.alpha = Math.min(1, lifeRatio * 2);
        }
    }

    render(ctx) {
        const particles = this.pool.getActive();
        ctx.save();

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            if (!p.active) continue;

            ctx.globalAlpha = p.alpha;

            if (p.type === 'text') {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.font = `bold ${Math.round(p.size)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#000';
                ctx.fillText(p.text, 1, 1);
                ctx.fillStyle = p.color;
                ctx.fillText(p.text, 0, 0);
                ctx.restore();
                continue;
            }

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;

            switch (p.type) {
                case 'circle':
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'spark':
                    ctx.beginPath();
                    ctx.moveTo(-p.size, 0);
                    ctx.lineTo(0, -p.size * 0.3);
                    ctx.lineTo(p.size * 1.5, 0);
                    ctx.lineTo(0, p.size * 0.3);
                    ctx.closePath();
                    ctx.fill();
                    break;

                case 'feather':
                    ctx.beginPath();
                    ctx.ellipse(0, 0, p.size, p.size * 0.3, 0, 0, Math.PI * 2);
                    ctx.fill();
                    // Feather line
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(-p.size, 0);
                    ctx.lineTo(p.size, 0);
                    ctx.stroke();
                    break;

                case 'star':
                    this._drawStar(ctx, 0, 0, 5, p.size, p.size * 0.4);
                    ctx.fill();
                    break;

                default:
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                    ctx.fill();
            }

            ctx.restore();
        }

        ctx.restore();
    }

    _drawStar(ctx, cx, cy, spikes, outerR, innerR) {
        let rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes;
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerR);
        for (let i = 0; i < spikes; i++) {
            ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
            rot += step;
            ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerR);
        ctx.closePath();
    }

    clear() {
        this.pool.releaseAll();
    }

    get count() {
        return this.pool.getActive().length;
    }
}
