// Game - Main game loop and state management
import { Renderer } from './renderer.js';
import { InputSystem } from './input.js';
import { EntityManager, POWERUP_TYPES } from './entities.js';
import { ParticleSystem } from './particles.js';
import { AudioSystem } from './audio.js';
import { UISystem } from './ui.js';
import { clamp } from './utils.js';

const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameover',
    HOW_TO: 'howto'
};

const TIMED_DURATION = 60; // seconds
const COMBO_TIMEOUT = 2.5; // seconds to maintain combo
const MISS_PENALTY = -25;

export class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new Renderer(this.canvas);
        this.input = new InputSystem(this.canvas);
        this.entities = new EntityManager();
        this.particles = new ParticleSystem();
        this.audio = new AudioSystem();
        this.ui = new UISystem();

        this.state = GAME_STATES.MENU;
        this.gameMode = 'timed'; // 'timed' or 'endless'
        this.lastTime = 0;
        this.running = false;

        // Game stats
        this.stats = {
            score: 0,
            combo: 1,
            maxCombo: 1,
            comboTimer: 0,
            comboMaxTime: COMBO_TIMEOUT,
            comboChanged: false,
            hits: 0,
            shots: 0,
            misses: 0,
            accuracy: 100,
            timeRemaining: TIMED_DURATION,
            timeLimit: TIMED_DURATION,
            elapsedTime: 0,
            activePowerUp: null,
            powerUpRemaining: 0,
            powerUpDuration: 0
        };

        // Power-up state
        this.activePowerUp = null;
        this.powerUpTimer = 0;
        this.timeScale = 1;

        // Muzzle flash
        this.muzzleFlash = 0;

        this._bindUI();
        this._bindResize();
    }

    _bindUI() {
        document.getElementById('btn-timed').addEventListener('click', () => {
            this.startGame('timed');
        });
        document.getElementById('btn-endless').addEventListener('click', () => {
            this.startGame('endless');
        });
        document.getElementById('btn-how-to').addEventListener('click', () => {
            this.state = GAME_STATES.HOW_TO;
            this.ui.showHowTo();
        });
        document.getElementById('btn-back-menu').addEventListener('click', () => {
            this.state = GAME_STATES.MENU;
            this.ui.showMainMenu();
        });
        document.getElementById('btn-pause').addEventListener('click', () => {
            this.pause();
        });
        document.getElementById('btn-resume').addEventListener('click', () => {
            this.resume();
        });
        document.getElementById('btn-quit').addEventListener('click', () => {
            this.quitToMenu();
        });
        document.getElementById('btn-retry').addEventListener('click', () => {
            this.startGame(this.gameMode);
        });
        document.getElementById('btn-menu').addEventListener('click', () => {
            this.quitToMenu();
        });
    }

    _bindResize() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.renderer.resize();
            }, 100);
        });
    }

    start() {
        this.running = true;
        this.ui.showMainMenu();
        this.input.setDefaultCursor();
        this.lastTime = performance.now();
        this._loop(this.lastTime);
    }

    startGame(mode) {
        this.audio.init();
        this.audio.resume();

        this.gameMode = mode;
        this.state = GAME_STATES.PLAYING;

        // Reset stats
        this.stats.score = 0;
        this.stats.combo = 1;
        this.stats.maxCombo = 1;
        this.stats.comboTimer = 0;
        this.stats.comboChanged = false;
        this.stats.hits = 0;
        this.stats.shots = 0;
        this.stats.misses = 0;
        this.stats.accuracy = 100;
        this.stats.timeRemaining = mode === 'timed' ? TIMED_DURATION : 0;
        this.stats.timeLimit = mode === 'timed' ? TIMED_DURATION : 0;
        this.stats.elapsedTime = 0;
        this.stats.activePowerUp = null;
        this.stats.powerUpRemaining = 0;
        this.stats.powerUpDuration = 0;

        this.activePowerUp = null;
        this.powerUpTimer = 0;
        this.timeScale = 1;
        this.muzzleFlash = 0;

        this.entities.reset();
        this.particles.clear();
        this.ui.resetScoreDisplay();
        this.ui.showGameplay();
        this.input.hideCursor();

        this.audio.startMusic();
    }

    pause() {
        if (this.state !== GAME_STATES.PLAYING) return;
        this.state = GAME_STATES.PAUSED;
        this.ui.showPause();
        this.input.showCursor();
    }

    resume() {
        if (this.state !== GAME_STATES.PAUSED) return;
        this.state = GAME_STATES.PLAYING;
        this.ui.hidePause();
        this.input.hideCursor();
        this.lastTime = performance.now();
    }

    gameOver() {
        this.state = GAME_STATES.GAME_OVER;
        this.audio.stopMusic();
        this.audio.playGameOver();
        this.input.showCursor();

        this.ui.showGameOver({
            score: this.stats.score,
            accuracy: this.stats.accuracy,
            maxCombo: this.stats.maxCombo,
            hits: this.stats.hits
        });
    }

    quitToMenu() {
        this.state = GAME_STATES.MENU;
        this.audio.stopMusic();
        this.entities.reset();
        this.particles.clear();
        this.ui.showMainMenu();
        this.input.setDefaultCursor();
    }

    _loop(timestamp) {
        if (!this.running) return;

        const rawDt = (timestamp - this.lastTime) / 1000;
        const dt = Math.min(rawDt, 0.05); // Cap delta to avoid spiral
        this.lastTime = timestamp;

        this._update(dt);
        this._render(timestamp);

        requestAnimationFrame(t => this._loop(t));
    }

    _update(dt) {
        // Handle escape key for pause
        if (this.input.consumeKey('Escape')) {
            if (this.state === GAME_STATES.PLAYING) this.pause();
            else if (this.state === GAME_STATES.PAUSED) this.resume();
        }

        if (this.state !== GAME_STATES.PLAYING) return;

        const effectiveDt = dt * this.timeScale;

        // Track elapsed time
        this.stats.elapsedTime += dt;

        // Timer (timed mode)
        if (this.stats.timeLimit > 0) {
            this.stats.timeRemaining -= dt;
            if (this.stats.timeRemaining <= 0) {
                this.stats.timeRemaining = 0;
                this.gameOver();
                return;
            }
        }

        // Endless mode: game over if accuracy drops below 20% (after at least 10 shots)
        if (this.gameMode === 'endless' && this.stats.shots >= 10 && this.stats.accuracy < 20) {
            this.gameOver();
            return;
        }

        // Combo timer
        if (this.stats.combo > 1) {
            this.stats.comboTimer -= dt;
            if (this.stats.comboTimer <= 0) {
                this.stats.combo = 1;
                this.stats.comboTimer = 0;
            }
        }

        // Power-up timer
        if (this.activePowerUp) {
            this.powerUpTimer -= dt;
            this.stats.powerUpRemaining = this.powerUpTimer;
            if (this.powerUpTimer <= 0) {
                this._deactivatePowerUp();
            }
        }

        // Muzzle flash decay
        if (this.muzzleFlash > 0) {
            this.muzzleFlash -= dt * 10;
        }

        // Process clicks
        const clicks = this.input.getClicks();
        for (const click of clicks) {
            this._processShot(click.x, click.y);
        }

        // Update entities (pass raw dt; EntityManager passes timeScale to chickens internally)
        this.entities.update(dt, this.renderer.width, this.renderer.height, this.timeScale);

        // Magnet power-up: pull chickens toward screen center
        if (this.activePowerUp && this.activePowerUp.effect === 'magnet') {
            const cx = this.renderer.width / 2;
            const cy = this.renderer.height * 0.4;
            for (const c of this.entities.chickens) {
                if (!c.active || !c.alive || c.dying) continue;
                c.x += (cx - c.x) * 2.0 * dt;
                c.y += (cy - c.y) * 2.0 * dt;
            }
        }

        // Update particles (use timeScale so particles slow during slow-mo)
        this.particles.update(dt * this.timeScale);

        // Update HUD
        this.stats.comboChanged = false;
        this.ui.updateHUD(this.stats);
    }

    _processShot(x, y) {
        this.stats.shots++;
        this.audio.playShoot();
        this.muzzleFlash = 1;
        this.renderer.shake(3);

        // Check power-up pickup first
        const powerUp = this.entities.getPowerUpAt(x, y);
        if (powerUp) {
            this._collectPowerUp(powerUp);
            // Don't count as miss
            this.stats.shots--;
        }

        // Check chicken hit
        let hitSomething = false;
        const multishot = this.activePowerUp && this.activePowerUp.effect === 'multishot';

        // In multishot mode, check all chickens near the click in a larger radius
        if (multishot) {
            const radius = 80;
            for (const chicken of this.entities.chickens) {
                if (!chicken.active || !chicken.alive) continue;
                const dx = chicken.x - x;
                const dy = chicken.y - y;
                const hitDist = radius + chicken.width * 0.6;
                if (dx * dx + dy * dy <= hitDist * hitDist) {
                    this._hitChicken(chicken, x, y);
                    hitSomething = true;
                }
            }
        } else {
            const chicken = this.entities.getChickenAt(x, y);
            if (chicken) {
                this._hitChicken(chicken, x, y);
                hitSomething = true;
            }
        }

        if (!hitSomething && !powerUp) {
            // Miss
            this.stats.misses++;
            this.stats.combo = 1;
            this.stats.comboTimer = 0;
            this.stats.score = Math.max(0, this.stats.score + MISS_PENALTY);
            this.audio.playMiss();
            this.particles.emitMiss(x, y);
        }

        // Update accuracy
        if (this.stats.shots > 0) {
            this.stats.accuracy = Math.round((this.stats.hits / this.stats.shots) * 100);
        }
    }

    _hitChicken(chicken, clickX, clickY) {
        const isCritical = chicken.isCriticalHit(clickX, clickY);
        const damage = isCritical ? 2 : 1;
        const killed = chicken.hit(damage);

        this.stats.hits++;

        // Score calculation
        let points = chicken.type.points;

        if (isCritical) {
            points *= 2;
            this.audio.playCriticalHit();
            this.particles.emitCritical(chicken.x, chicken.y);
            this.renderer.shake(6);
        } else {
            this.audio.playHit();
            this.particles.emitHit(chicken.x, chicken.y, chicken.type.color);
            this.renderer.shake(3);
        }

        // Score boost power-up
        if (this.activePowerUp && this.activePowerUp.effect === 'scoreboost') {
            points *= 2;
        }

        // Combo
        this.stats.combo++;
        this.stats.comboTimer = COMBO_TIMEOUT;
        this.stats.comboChanged = true;
        if (this.stats.combo > this.stats.maxCombo) {
            this.stats.maxCombo = this.stats.combo;
        }

        // Combo milestone sounds
        if (this.stats.combo % 5 === 0) {
            this.audio.playComboUp();
        }

        // Apply combo multiplier
        const comboMultiplier = Math.min(this.stats.combo, 20);
        points *= comboMultiplier;

        this.stats.score += Math.round(points);

        // Score popup
        const label = isCritical ? `CRITICAL! +${Math.round(points)}` : `+${Math.round(points)}`;
        const popupColor = isCritical ? '#FF4444' : chicken.typeName === 'golden' ? '#FFD700' : '#FFFFFF';
        this.particles.emitScorePopup(chicken.x, chicken.y - 30, label, popupColor);

        if (this.stats.combo > 1) {
            this.particles.emitScorePopup(chicken.x, chicken.y - 55, `${this.stats.combo}x COMBO`, '#44AAFF');
        }

        if (killed) {
            this.particles.emitFeathers(chicken.x, chicken.y, chicken.type.color);

            // Chance to spawn power-up on kill
            if (Math.random() < 0.08) {
                this.entities.spawnPowerUp(chicken.x, chicken.y);
            }
        }
    }

    _collectPowerUp(powerUp) {
        const type = powerUp.type;
        powerUp.active = false;

        this.audio.playPowerUp();

        // Deactivate existing power-up
        if (this.activePowerUp) {
            this._deactivatePowerUp();
        }

        this.activePowerUp = type;
        this.powerUpTimer = type.duration;
        this.stats.activePowerUp = type;
        this.stats.powerUpDuration = type.duration;
        this.stats.powerUpRemaining = type.duration;

        // Apply effect
        switch (type.effect) {
            case 'slowmo':
                this.timeScale = 0.4;
                break;
            case 'multishot':
                // Handled in shot processing
                break;
            case 'scoreboost':
                // Handled in score calculation
                break;
            case 'magnet':
                // Pull nearby chickens toward center
                break;
        }

        this.particles.emitScorePopup(
            this.renderer.width / 2,
            this.renderer.height * 0.3,
            type.name + '!',
            type.color
        );
    }

    _deactivatePowerUp() {
        if (!this.activePowerUp) return;

        if (this.activePowerUp.effect === 'slowmo') {
            this.timeScale = 1;
        }

        this.activePowerUp = null;
        this.powerUpTimer = 0;
        this.stats.activePowerUp = null;
    }

    _render(timestamp) {
        const ctx = this.renderer.ctx;

        this.renderer.clear();
        this.renderer.beginFrame();
        this.renderer.renderBackground(timestamp);

        if (this.state === GAME_STATES.PLAYING || this.state === GAME_STATES.PAUSED) {
            // Render entities
            this.entities.render(ctx);

            // Render particles
            this.particles.render(ctx);

            // Muzzle flash screen overlay
            if (this.muzzleFlash > 0) {
                ctx.save();
                ctx.globalAlpha = this.muzzleFlash * 0.08;
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, this.renderer.width, this.renderer.height);
                ctx.restore();
            }

            // Slow-mo visual effect
            if (this.activePowerUp && this.activePowerUp.effect === 'slowmo') {
                ctx.save();
                ctx.globalAlpha = 0.1;
                ctx.fillStyle = '#0044AA';
                ctx.fillRect(0, 0, this.renderer.width, this.renderer.height);
                ctx.restore();
            }

            // Magnet visual effect
            if (this.activePowerUp && this.activePowerUp.effect === 'magnet') {
                ctx.save();
                ctx.globalAlpha = 0.08;
                ctx.fillStyle = '#FF69B4';
                ctx.fillRect(0, 0, this.renderer.width, this.renderer.height);
                // Pulsing ring at center
                const pulse = Math.sin(timestamp * 0.005) * 0.3 + 0.5;
                ctx.globalAlpha = pulse * 0.2;
                ctx.strokeStyle = '#FF69B4';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(this.renderer.width / 2, this.renderer.height * 0.4, 80 + pulse * 40, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        this.renderer.renderForeground(timestamp);
        this.renderer.endFrame();

        // Custom crosshair (during gameplay, drawn outside shake transform)
        if (this.state === GAME_STATES.PLAYING) {
            this.input.renderCrosshair(ctx);
        }
    }
}
