// UI System - Menus, HUD, and transitions
export class UISystem {
    constructor() {
        // Screens
        this.mainMenu = document.getElementById('main-menu');
        this.howToScreen = document.getElementById('how-to-screen');
        this.pauseScreen = document.getElementById('pause-screen');
        this.gameoverScreen = document.getElementById('gameover-screen');
        this.hud = document.getElementById('hud');

        // HUD elements
        this.hudScore = document.getElementById('hud-score');
        this.hudCombo = document.getElementById('hud-combo');
        this.hudTime = document.getElementById('hud-time');
        this.hudAccuracy = document.getElementById('hud-accuracy');
        this.comboBar = document.getElementById('combo-bar');
        this.powerUpIndicator = document.getElementById('power-up-indicator');
        this.powerUpName = document.getElementById('power-up-name');
        this.powerUpTimer = document.getElementById('power-up-timer');

        // Game over elements
        this.finalScore = document.getElementById('final-score');
        this.finalAccuracy = document.getElementById('final-accuracy');
        this.finalCombo = document.getElementById('final-combo');
        this.finalHits = document.getElementById('final-hits');
        this.finalHighScore = document.getElementById('final-high-score');

        // High score display
        this.highScoreValue = document.getElementById('high-score-value');

        // Animation state
        this.scoreDisplayed = 0;
        this.targetScore = 0;
        this.comboScale = 1;
    }

    showScreen(screen) {
        [this.mainMenu, this.howToScreen, this.pauseScreen, this.gameoverScreen].forEach(s => {
            s.classList.remove('active');
        });
        if (screen) {
            screen.classList.add('active');
        }
    }

    showMainMenu() {
        this.showScreen(this.mainMenu);
        this.hud.classList.add('hidden');
        this.highScoreValue.textContent = this.getHighScore().toLocaleString();
    }

    showHowTo() {
        this.showScreen(this.howToScreen);
    }

    showPause() {
        this.showScreen(this.pauseScreen);
    }

    showGameOver(stats) {
        this.showScreen(this.gameoverScreen);

        // Animate final stats appearance
        this.finalScore.textContent = stats.score.toLocaleString();
        this.finalAccuracy.textContent = stats.accuracy + '%';
        this.finalCombo.textContent = stats.maxCombo + 'x';
        this.finalHits.textContent = stats.hits;

        const highScore = this.getHighScore();
        if (stats.score > highScore) {
            this.setHighScore(stats.score);
            this.finalHighScore.textContent = stats.score.toLocaleString() + ' NEW!';
            this.finalHighScore.style.color = '#FFD700';
        } else {
            this.finalHighScore.textContent = highScore.toLocaleString();
            this.finalHighScore.style.color = '';
        }
    }

    showGameplay() {
        this.showScreen(null);
        this.hud.classList.remove('hidden');
    }

    hidePause() {
        this.pauseScreen.classList.remove('active');
    }

    updateHUD(state) {
        // Smooth score counting
        this.targetScore = state.score;
        if (this.scoreDisplayed < this.targetScore) {
            this.scoreDisplayed += Math.ceil((this.targetScore - this.scoreDisplayed) * 0.15);
            if (this.scoreDisplayed > this.targetScore) this.scoreDisplayed = this.targetScore;
        }
        this.hudScore.textContent = this.scoreDisplayed.toLocaleString();

        // Combo display
        if (state.combo > 1) {
            this.hudCombo.textContent = state.combo + 'x';
            this.hudCombo.style.color = state.combo >= 10 ? '#FF4444' :
                                         state.combo >= 5 ? '#FFD700' : '#FFFFFF';
            if (state.comboChanged) {
                this.hudCombo.style.transform = 'scale(1.4)';
                setTimeout(() => { this.hudCombo.style.transform = 'scale(1)'; }, 150);
            }
        } else {
            this.hudCombo.textContent = '1x';
            this.hudCombo.style.color = '#888';
        }

        // Time
        if (state.timeLimit > 0) {
            const secs = Math.ceil(state.timeRemaining);
            this.hudTime.textContent = secs;
            this.hudTime.style.color = secs <= 10 ? '#FF4444' : '#FFFFFF';
            if (secs <= 5) {
                this.hudTime.style.animation = 'pulse 0.5s ease-in-out infinite';
            } else {
                this.hudTime.style.animation = '';
            }
        } else {
            this.hudTime.textContent = '--';
            this.hudTime.style.color = '#888';
        }

        // Accuracy
        this.hudAccuracy.textContent = state.accuracy + '%';
        this.hudAccuracy.style.color = state.accuracy >= 80 ? '#44FF44' :
                                        state.accuracy >= 50 ? '#FFDD44' : '#FF4444';

        // Combo bar
        this.comboBar.style.width = (state.comboTimer / state.comboMaxTime * 100) + '%';
        this.comboBar.style.backgroundColor = state.combo >= 10 ? '#FF4444' :
                                               state.combo >= 5 ? '#FFD700' : '#44AAFF';

        // Power-up indicator
        if (state.activePowerUp) {
            this.powerUpIndicator.classList.remove('hidden');
            this.powerUpName.textContent = state.activePowerUp.name;
            this.powerUpName.style.color = state.activePowerUp.color;
            this.powerUpTimer.style.width = (state.powerUpRemaining / state.powerUpDuration * 100) + '%';
            this.powerUpTimer.style.backgroundColor = state.activePowerUp.color;
        } else {
            this.powerUpIndicator.classList.add('hidden');
        }
    }

    getHighScore() {
        try {
            return parseInt(localStorage.getItem('skyhunter_highscore') || '0', 10);
        } catch {
            return 0;
        }
    }

    setHighScore(score) {
        try {
            localStorage.setItem('skyhunter_highscore', score.toString());
        } catch { /* ignore */ }
    }

    resetScoreDisplay() {
        this.scoreDisplayed = 0;
        this.targetScore = 0;
    }
}
