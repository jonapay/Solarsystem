// Audio System - Procedural sound generation using Web Audio API
export class AudioSystem {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.initialized = false;
        this.musicPlaying = false;
        this.musicNodes = [];
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.7;
            this.masterGain.connect(this.ctx.destination);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = 0.15;
            this.musicGain.connect(this.masterGain);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = 0.5;
            this.sfxGain.connect(this.masterGain);

            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not available:', e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playShoot() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;

        // Gunshot: noise burst + low thump
        const bufferSize = this.ctx.sampleRate * 0.08;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, t);
        filter.frequency.exponentialRampToValueAtTime(300, t + 0.08);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(t);
        noise.stop(t + 0.1);

        // Low thump
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.08);
        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.4, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.12);
    }

    playHit() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;

        // Impact sound: mid-frequency ping
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.2);

        // Squawk
        const squawk = this.ctx.createOscillator();
        squawk.type = 'sawtooth';
        squawk.frequency.setValueAtTime(600 + Math.random() * 400, t);
        squawk.frequency.exponentialRampToValueAtTime(150, t + 0.12);

        const sGain = this.ctx.createGain();
        sGain.gain.setValueAtTime(0.15, t);
        sGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        squawk.connect(sGain);
        sGain.connect(this.sfxGain);
        squawk.start(t);
        squawk.stop(t + 0.15);
    }

    playCriticalHit() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;

        // Higher pitch impact
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.2);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.25);

        // Double squawk
        for (let i = 0; i < 2; i++) {
            const s = this.ctx.createOscillator();
            s.type = 'sawtooth';
            s.frequency.setValueAtTime(900 + Math.random() * 300, t + i * 0.05);
            s.frequency.exponentialRampToValueAtTime(100, t + 0.15 + i * 0.05);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.12, t + i * 0.05);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.18 + i * 0.05);
            s.connect(g);
            g.connect(this.sfxGain);
            s.start(t + i * 0.05);
            s.stop(t + 0.2 + i * 0.05);
        }
    }

    playMiss() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;

        // Ricochet whizz
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2000, t);
        osc.frequency.exponentialRampToValueAtTime(500, t + 0.15);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.15);
    }

    playPowerUp() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;

        // Rising arpeggio
        const notes = [400, 500, 600, 800];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, t + i * 0.06);
            gain.gain.linearRampToValueAtTime(0.2, t + i * 0.06 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.12);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t + i * 0.06);
            osc.stop(t + i * 0.06 + 0.15);
        });
    }

    playComboUp() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, t);
        osc.frequency.linearRampToValueAtTime(1000, t + 0.1);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.15);
    }

    playGameOver() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;

        // Descending tones
        const notes = [600, 500, 400, 250];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, t + i * 0.2);
            gain.gain.linearRampToValueAtTime(0.2, t + i * 0.2 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.2 + 0.3);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t + i * 0.2);
            osc.stop(t + i * 0.2 + 0.35);
        });
    }

    startMusic() {
        if (!this.initialized || this.musicPlaying) return;
        this.musicPlaying = true;
        this._playMusicLoop();
    }

    _playMusicLoop() {
        if (!this.musicPlaying || !this.initialized) return;

        const t = this.ctx.currentTime;
        const bpm = 110;
        const beatLen = 60 / bpm;
        const barLen = beatLen * 4;

        // Bass line pattern
        const bassNotes = [
            { note: 110, time: 0 },
            { note: 110, time: beatLen },
            { note: 130.81, time: beatLen * 2 },
            { note: 146.83, time: beatLen * 3 },
            { note: 130.81, time: barLen },
            { note: 130.81, time: barLen + beatLen },
            { note: 110, time: barLen + beatLen * 2 },
            { note: 98, time: barLen + beatLen * 3 },
        ];

        bassNotes.forEach(({ note, time }) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = note;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, t + time);
            gain.gain.linearRampToValueAtTime(0.2, t + time + 0.02);
            gain.gain.setValueAtTime(0.2, t + time + beatLen * 0.6);
            gain.gain.exponentialRampToValueAtTime(0.001, t + time + beatLen * 0.9);

            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(t + time);
            osc.stop(t + time + beatLen);
            this.musicNodes.push(osc);
        });

        // Hi-hat pattern
        for (let i = 0; i < 16; i++) {
            const time = i * (beatLen / 2);
            const bufSize = this.ctx.sampleRate * 0.03;
            const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let j = 0; j < bufSize; j++) {
                d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / bufSize, 8);
            }
            const src = this.ctx.createBufferSource();
            src.buffer = buf;

            const hpf = this.ctx.createBiquadFilter();
            hpf.type = 'highpass';
            hpf.frequency.value = 8000;

            const gain = this.ctx.createGain();
            const vol = (i % 2 === 0) ? 0.12 : 0.06;
            gain.gain.setValueAtTime(vol, t + time);
            gain.gain.exponentialRampToValueAtTime(0.001, t + time + 0.04);

            src.connect(hpf);
            hpf.connect(gain);
            gain.connect(this.musicGain);
            src.start(t + time);
            this.musicNodes.push(src);
        }

        // Schedule next loop
        this._musicTimer = setTimeout(() => {
            this._playMusicLoop();
        }, (barLen * 2 - 0.1) * 1000);
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this._musicTimer) {
            clearTimeout(this._musicTimer);
            this._musicTimer = null;
        }
        this.musicNodes.forEach(node => {
            try { node.stop(); } catch (e) { /* already stopped */ }
        });
        this.musicNodes = [];
    }

    setMusicVolume(v) {
        if (this.musicGain) this.musicGain.gain.value = v;
    }

    setSfxVolume(v) {
        if (this.sfxGain) this.sfxGain.gain.value = v;
    }
}
