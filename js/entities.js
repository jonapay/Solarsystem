// Entity System - Chickens, Power-ups, and target management
import { randomRange, randomInt, bezierPoint, generateFlightPath, ease } from './utils.js';

// Chicken types configuration
export const CHICKEN_TYPES = {
    normal: {
        name: 'Normal',
        color: '#CD853F',       // Peru brown
        bodyColor: '#8B6914',
        wingColor: '#A0522D',
        combColor: '#DC143C',
        beakColor: '#FFA500',
        eyeColor: '#000000',
        size: 1.0,
        speed: 1.0,
        health: 1,
        points: 100,
        spawnWeight: 50
    },
    fast: {
        name: 'Speedy',
        color: '#4169E1',
        bodyColor: '#27408B',
        wingColor: '#3A5FCD',
        combColor: '#FF4500',
        beakColor: '#FFD700',
        eyeColor: '#000000',
        size: 0.75,
        speed: 1.8,
        health: 1,
        points: 200,
        spawnWeight: 25
    },
    armored: {
        name: 'Tank',
        color: '#808080',
        bodyColor: '#696969',
        wingColor: '#778899',
        combColor: '#B22222',
        beakColor: '#DAA520',
        eyeColor: '#FF0000',
        size: 1.4,
        speed: 0.6,
        health: 3,
        points: 300,
        spawnWeight: 15
    },
    golden: {
        name: 'Golden',
        color: '#FFD700',
        bodyColor: '#DAA520',
        wingColor: '#FFC125',
        combColor: '#FF6347',
        beakColor: '#FF8C00',
        eyeColor: '#800080',
        size: 0.9,
        speed: 2.2,
        health: 1,
        points: 500,
        spawnWeight: 8
    },
    boss: {
        name: 'Boss',
        color: '#8B0000',
        bodyColor: '#660000',
        wingColor: '#A52A2A',
        combColor: '#FF0000',
        beakColor: '#FF4500',
        eyeColor: '#FFFF00',
        size: 2.0,
        speed: 0.4,
        health: 5,
        points: 1000,
        spawnWeight: 2
    }
};

// Power-up types
export const POWERUP_TYPES = {
    slowmo: {
        name: 'SLOW MOTION',
        color: '#00BFFF',
        icon: '⏱',
        duration: 5,
        effect: 'slowmo'
    },
    multishot: {
        name: 'MULTI-SHOT',
        color: '#FF4500',
        icon: '✦',
        duration: 6,
        effect: 'multishot'
    },
    scoreBoost: {
        name: 'SCORE BOOST',
        color: '#FFD700',
        icon: '★',
        duration: 8,
        effect: 'scoreboost'
    },
    magnet: {
        name: 'MAGNET',
        color: '#FF69B4',
        icon: '◎',
        duration: 5,
        effect: 'magnet'
    }
};

export class Chicken {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.type = CHICKEN_TYPES.normal;
        this.typeName = 'normal';
        this.health = 1;
        this.maxHealth = 1;
        this.alive = true;
        this.active = false;

        // Flight path
        this.path = null;
        this.pathProgress = 0;
        this.pathSpeed = 0;
        this.facingLeft = false;

        // Animation
        this.wingAngle = 0;
        this.wingSpeed = 8;
        this.bobOffset = 0;
        this.bobSpeed = 3;
        this.scale = 1;
        this.hitFlash = 0;

        // Death animation
        this.dying = false;
        this.deathTimer = 0;
        this.deathVx = 0;
        this.deathVy = 0;
        this.deathRotation = 0;
        this.deathRotSpeed = 0;

        // Size
        this.baseWidth = 50;
        this.baseHeight = 40;
        this.width = this.baseWidth;
        this.height = this.baseHeight;
    }

    spawn(canvasW, canvasH, typeName, difficulty = 1) {
        this.active = true;
        this.alive = true;
        this.dying = false;
        this.deathTimer = 0;

        const type = CHICKEN_TYPES[typeName] || CHICKEN_TYPES.normal;
        this.type = type;
        this.typeName = typeName;
        this.health = type.health;
        this.maxHealth = type.health;
        this.scale = type.size;

        this.width = this.baseWidth * this.scale;
        this.height = this.baseHeight * this.scale;

        // Generate flight path
        this.path = generateFlightPath(canvasW, canvasH, 'random');
        this.facingLeft = !this.path.fromLeft;
        this.pathProgress = 0;
        this.pathSpeed = (0.15 + difficulty * 0.02) * type.speed;

        // Randomize wing animation offset
        this.wingAngle = randomRange(0, Math.PI * 2);
        this.wingSpeed = randomRange(6, 12);
        this.bobOffset = randomRange(0, Math.PI * 2);
        this.bobSpeed = randomRange(2, 5);

        // Set initial position
        const pos = bezierPoint(0, this.path.p0, this.path.p1, this.path.p2, this.path.p3);
        this.x = pos.x;
        this.y = pos.y;

        this.hitFlash = 0;
    }

    update(dt, timeScale = 1) {
        if (!this.active) return;

        if (this.dying) {
            this.deathTimer += dt;
            this.deathVy += 600 * dt;
            this.x += this.deathVx * dt;
            this.y += this.deathVy * dt;
            this.deathRotation += this.deathRotSpeed * dt;

            if (this.deathTimer > 2.0) {
                this.active = false;
            }
            return;
        }

        if (!this.alive) return;

        // Advance on path
        this.pathProgress += this.pathSpeed * dt * timeScale;

        if (this.pathProgress >= 1) {
            this.active = false;
            return;
        }

        const pos = bezierPoint(
            this.pathProgress,
            this.path.p0, this.path.p1, this.path.p2, this.path.p3
        );

        // Determine facing direction from movement
        if (pos.x > this.x + 0.5) this.facingLeft = false;
        else if (pos.x < this.x - 0.5) this.facingLeft = true;

        this.x = pos.x;
        this.y = pos.y + Math.sin(this.bobOffset + performance.now() * 0.003 * this.bobSpeed) * 8;

        // Wing animation
        this.wingAngle = Math.sin(performance.now() * 0.01 * this.wingSpeed) * 0.6;

        // Hit flash decay
        if (this.hitFlash > 0) {
            this.hitFlash -= dt * 5;
        }
    }

    hit(damage = 1) {
        if (!this.alive || this.dying) return false;

        this.health -= damage;
        this.hitFlash = 1;

        if (this.health <= 0) {
            this.alive = false;
            this.dying = true;
            this.deathTimer = 0;
            this.deathVx = randomRange(-100, 100);
            this.deathVy = randomRange(-250, -100);
            this.deathRotSpeed = randomRange(-8, 8);
            return true; // killed
        }
        return false; // still alive
    }

    containsPoint(px, py) {
        if (!this.alive || this.dying) return false;
        const hw = this.width * 0.6;
        const hh = this.height * 0.6;
        return px >= this.x - hw && px <= this.x + hw &&
               py >= this.y - hh && py <= this.y + hh;
    }

    isCriticalHit(px, py) {
        // Critical zone is the center 30% of the chicken
        const critRadius = Math.min(this.width, this.height) * 0.2;
        const dx = px - this.x;
        const dy = py - this.y;
        return (dx * dx + dy * dy) <= critRadius * critRadius;
    }

    render(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.dying) {
            ctx.rotate(this.deathRotation);
            ctx.globalAlpha = Math.max(0, 1 - this.deathTimer * 0.8);
        }

        const s = this.scale;
        const dir = this.facingLeft ? -1 : 1;
        ctx.scale(dir, 1);

        // Hit flash effect
        if (this.hitFlash > 0) {
            ctx.filter = `brightness(${1 + this.hitFlash * 2})`;
        }

        // Shadow under chicken
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.ellipse(0, this.height * 0.4 * s, this.width * 0.4 * s, 6 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = this.type.bodyColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width * 0.4 * s, this.height * 0.35 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body highlight
        ctx.fillStyle = this.type.color;
        ctx.beginPath();
        ctx.ellipse(-2 * s, -4 * s, this.width * 0.32 * s, this.height * 0.25 * s, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Wing (animated)
        ctx.save();
        ctx.translate(2 * s, 2 * s);
        ctx.rotate(this.wingAngle);
        ctx.fillStyle = this.type.wingColor;
        ctx.beginPath();
        ctx.ellipse(8 * s, 0, 16 * s, 8 * s, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Tail feathers
        ctx.fillStyle = this.type.wingColor;
        for (let i = 0; i < 3; i++) {
            ctx.save();
            ctx.translate(-this.width * 0.35 * s, -4 * s + i * 4 * s);
            ctx.rotate(-0.5 + i * 0.25);
            ctx.beginPath();
            ctx.ellipse(-8 * s, 0, 12 * s, 3 * s, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Head
        ctx.fillStyle = this.type.color;
        ctx.beginPath();
        ctx.arc(this.width * 0.25 * s, -this.height * 0.2 * s, 10 * s, 0, Math.PI * 2);
        ctx.fill();

        // Comb
        ctx.fillStyle = this.type.combColor;
        const combX = this.width * 0.25 * s;
        const combY = -this.height * 0.2 * s - 10 * s;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(combX - 4 * s + i * 4 * s, combY - 2 * s + Math.abs(i - 1) * 2 * s, 3.5 * s, 0, Math.PI * 2);
            ctx.fill();
        }

        // Eye
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(this.width * 0.32 * s, -this.height * 0.22 * s, 4 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.type.eyeColor;
        ctx.beginPath();
        ctx.arc(this.width * 0.34 * s, -this.height * 0.22 * s, 2.5 * s, 0, Math.PI * 2);
        ctx.fill();
        // Pupil highlight
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(this.width * 0.35 * s, -this.height * 0.24 * s, 1 * s, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = this.type.beakColor;
        ctx.beginPath();
        const beakX = this.width * 0.38 * s;
        const beakY = -this.height * 0.15 * s;
        ctx.moveTo(beakX, beakY - 3 * s);
        ctx.lineTo(beakX + 10 * s, beakY);
        ctx.lineTo(beakX, beakY + 3 * s);
        ctx.closePath();
        ctx.fill();

        // Legs
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 2 * s;
        ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i += 2) {
            ctx.beginPath();
            ctx.moveTo(i * 5 * s, this.height * 0.3 * s);
            ctx.lineTo(i * 5 * s + 2 * s, this.height * 0.5 * s);
            // Toes
            ctx.moveTo(i * 5 * s - 3 * s, this.height * 0.52 * s);
            ctx.lineTo(i * 5 * s + 2 * s, this.height * 0.5 * s);
            ctx.lineTo(i * 5 * s + 7 * s, this.height * 0.52 * s);
            ctx.stroke();
        }

        // Health bar for armored/boss types
        if (this.maxHealth > 1 && this.alive) {
            const barW = this.width * 0.7 * s;
            const barH = 4 * s;
            const barX = -barW / 2;
            const barY = -this.height * 0.5 * s - 10 * s;

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barW, barH);

            const healthPct = this.health / this.maxHealth;
            const hColor = healthPct > 0.5 ? '#44FF44' : healthPct > 0.25 ? '#FFAA00' : '#FF3333';
            ctx.fillStyle = hColor;
            ctx.fillRect(barX, barY, barW * healthPct, barH);
        }

        ctx.filter = 'none';
        ctx.restore();
    }
}

export class PowerUp {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.active = false;
        this.type = null;
        this.typeName = '';
        this.size = 28;
        this.bobOffset = 0;
        this.glowPhase = 0;
        this.vx = 0;
        this.vy = 0;
        this.lifetime = 0;
        this.maxLifetime = 8;
    }

    spawn(x, y, typeName) {
        this.active = true;
        this.x = x;
        this.y = y;
        this.type = POWERUP_TYPES[typeName];
        this.typeName = typeName;
        this.vx = randomRange(-30, 30);
        this.vy = randomRange(-60, -20);
        this.bobOffset = Math.random() * Math.PI * 2;
        this.glowPhase = 0;
        this.lifetime = 0;
    }

    update(dt) {
        if (!this.active) return;

        this.lifetime += dt;
        if (this.lifetime > this.maxLifetime) {
            this.active = false;
            return;
        }

        this.vy += 40 * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vx *= 0.99;

        this.glowPhase += dt * 4;
        this.bobOffset += dt * 2;
    }

    containsPoint(px, py) {
        if (!this.active) return false;
        const dx = px - this.x;
        const dy = py - this.y;
        return (dx * dx + dy * dy) <= this.size * this.size * 1.5;
    }

    render(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.translate(this.x, this.y + Math.sin(this.bobOffset) * 5);

        // Pulsing opacity near end of life
        const remainLife = this.maxLifetime - this.lifetime;
        if (remainLife < 2) {
            ctx.globalAlpha = 0.5 + Math.sin(this.lifetime * 10) * 0.5;
        }

        // Glow
        const glowSize = this.size + Math.sin(this.glowPhase) * 5;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize * 1.5);
        gradient.addColorStop(0, this.type.color + '66');
        gradient.addColorStop(1, this.type.color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, glowSize * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Circle background
        ctx.fillStyle = this.type.color;
        ctx.shadowColor = this.type.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Inner circle
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFFFFF33';
        ctx.beginPath();
        ctx.arc(0, -3, this.size * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Icon
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.round(this.size)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type.icon, 0, 1);

        ctx.restore();
    }
}

// Entity manager
export class EntityManager {
    constructor() {
        this.chickens = [];
        this.powerUps = [];
        this.maxChickens = 30;
        this.maxPowerUps = 5;

        // Pre-allocate
        for (let i = 0; i < this.maxChickens; i++) {
            this.chickens.push(new Chicken());
        }
        for (let i = 0; i < this.maxPowerUps; i++) {
            this.powerUps.push(new PowerUp());
        }

        this.spawnTimer = 0;
        this.spawnInterval = 2.0;
        this.powerUpTimer = 0;
        this.powerUpInterval = 15;
        this.difficulty = 1;
        this.totalSpawned = 0;
    }

    reset() {
        this.chickens.forEach(c => { c.active = false; c.alive = false; c.dying = false; });
        this.powerUps.forEach(p => { p.active = false; });
        this.spawnTimer = 0;
        this.powerUpTimer = 0;
        this.difficulty = 1;
        this.totalSpawned = 0;
        this.spawnInterval = 2.0;
    }

    selectChickenType() {
        const types = Object.entries(CHICKEN_TYPES);
        let totalWeight = 0;
        const weights = types.map(([name, cfg]) => {
            const w = cfg.spawnWeight;
            totalWeight += w;
            return { name, weight: totalWeight };
        });
        const r = Math.random() * totalWeight;
        for (const { name, weight } of weights) {
            if (r <= weight) return name;
        }
        return 'normal';
    }

    spawnChicken(canvasW, canvasH) {
        const chicken = this.chickens.find(c => !c.active);
        if (!chicken) return null;

        const typeName = this.selectChickenType();
        chicken.spawn(canvasW, canvasH, typeName, this.difficulty);
        this.totalSpawned++;
        return chicken;
    }

    spawnPowerUp(x, y) {
        const pu = this.powerUps.find(p => !p.active);
        if (!pu) return null;

        const types = Object.keys(POWERUP_TYPES);
        const typeName = types[randomInt(0, types.length - 1)];
        pu.spawn(x, y, typeName);
        return pu;
    }

    update(dt, canvasW, canvasH, timeScale = 1) {
        // Difficulty scaling
        this.difficulty = 1 + this.totalSpawned * 0.02;
        this.spawnInterval = Math.max(0.4, 2.0 - this.difficulty * 0.1);

        // Spawn timer
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            // Spawn 1-3 chickens based on difficulty
            const count = Math.min(3, 1 + Math.floor(this.difficulty * 0.3));
            for (let i = 0; i < count; i++) {
                this.spawnChicken(canvasW, canvasH);
            }
        }

        // Power-up spawn timer
        this.powerUpTimer += dt;
        if (this.powerUpTimer >= this.powerUpInterval) {
            this.powerUpTimer = 0;
            // Spawn power-up at random position
            this.spawnPowerUp(
                randomRange(canvasW * 0.2, canvasW * 0.8),
                randomRange(canvasH * 0.15, canvasH * 0.5)
            );
        }

        // Update entities
        for (const c of this.chickens) {
            if (c.active) c.update(dt, timeScale);
        }
        for (const p of this.powerUps) {
            if (p.active) p.update(dt);
        }
    }

    getChickenAt(px, py) {
        // Check in reverse order (topmost first)
        for (let i = this.chickens.length - 1; i >= 0; i--) {
            const c = this.chickens[i];
            if (c.active && c.alive && c.containsPoint(px, py)) {
                return c;
            }
        }
        return null;
    }

    getPowerUpAt(px, py) {
        for (const p of this.powerUps) {
            if (p.active && p.containsPoint(px, py)) {
                return p;
            }
        }
        return null;
    }

    render(ctx) {
        // Render chickens sorted by y position for depth
        const activeChickens = this.chickens.filter(c => c.active);
        activeChickens.sort((a, b) => a.y - b.y);
        for (const c of activeChickens) {
            c.render(ctx);
        }
        for (const p of this.powerUps) {
            if (p.active) p.render(ctx);
        }
    }

    getActiveCount() {
        return this.chickens.filter(c => c.active && c.alive).length;
    }
}
