// Squid Game Audio Engine with Authentic Voice & Sound FX
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.bgmPlaying = false;
        this.dollAudio = new Audio('audio/doll_voice.mp3');
        this.loseAudio = new Audio('audio/lose.mp3');
        this.winAudio = new Audio('audio/win.mp3');
        
        this.dollAudio.preload = 'auto';
        this.loseAudio.preload = 'auto';
        this.winAudio.preload = 'auto';

        this.bgmOscs = [];
        this.bgmTimer = null;
        this.heartbeatTimer = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMuted(mute) {
        this.enabled = !mute;
        this.dollAudio.muted = mute;
        this.loseAudio.muted = mute;
        this.winAudio.muted = mute;
        if (mute) {
            this.stopBGM();
            this.stopChant();
        }
    }

    // Authentic Doll Voice ("Mugunghwa kkochi pieot seumnida")
    playDollChant(speedMultiplier = 1.0, onComplete = null) {
        if (!this.enabled) {
            if (onComplete) {
                setTimeout(onComplete, (4500 / speedMultiplier));
            }
            return;
        }

        this.init();
        this.stopChant();

        try {
            this.dollAudio.pause();
            this.dollAudio.currentTime = 0;
            // Support speedup across rounds: 1.0x, 1.25x, 1.5x, 1.8x, 2.2x
            this.dollAudio.playbackRate = Math.min(Math.max(speedMultiplier, 0.8), 2.5);
            this.dollAudio.preservesPitch = false; // creepy speedup pitch rise!

            const playPromise = this.dollAudio.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.warn("Audio play prevented:", e);
                    // Fallback to procedural synth if browser blocks media element
                    this.playSynthesizedChant(speedMultiplier, onComplete);
                });
            }

            // In Squid Game, the chant line lasts ~4.5 seconds at 1.0x
            const durationMs = (4600 / speedMultiplier);
            this.chantEndTimer = setTimeout(() => {
                this.dollAudio.pause();
                if (onComplete) onComplete();
            }, durationMs);

        } catch (e) {
            console.warn("Error playing doll voice:", e);
            this.playSynthesizedChant(speedMultiplier, onComplete);
        }
    }

    stopChant() {
        if (this.dollAudio) {
            this.dollAudio.pause();
            this.dollAudio.currentTime = 0;
        }
        if (this.chantEndTimer) {
            clearTimeout(this.chantEndTimer);
            this.chantEndTimer = null;
        }
        this.stopHeartbeat();
    }

    // Procedural Fallback Doll Chant
    playSynthesizedChant(speedMultiplier, onComplete) {
        if (!this.ctx || !this.enabled) {
            if (onComplete) setTimeout(onComplete, 4000 / speedMultiplier);
            return;
        }
        const melody = [
            { f: 392, d: 0.35 }, { f: 392, d: 0.35 }, { f: 440, d: 0.35 },
            { f: 440, d: 0.35 }, { f: 392, d: 0.40 }, { f: 392, d: 0.30 },
            { f: 330, d: 0.40 }, { f: 392, d: 0.32 }, { f: 330, d: 0.32 },
            { f: 262, d: 0.70 }
        ];

        let currTime = this.ctx.currentTime + 0.05;
        const scale = 1.0 / speedMultiplier;

        melody.forEach(note => {
            const dur = note.d * scale;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note.f, currTime);
            gain.gain.setValueAtTime(0.001, currTime);
            gain.gain.exponentialRampToValueAtTime(0.2, currTime + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, currTime + dur * 0.9);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(currTime);
            osc.stop(currTime + dur);
            currTime += dur;
        });

        const totalMs = (currTime - this.ctx.currentTime) * 1000;
        setTimeout(() => { if (onComplete) onComplete(); }, totalMs);
    }

    // Sniper Gunshot
    playSniperShot() {
        if (!this.enabled) return;
        this.init();

        try {
            this.loseAudio.currentTime = 0;
            this.loseAudio.volume = 0.9;
            this.loseAudio.play().catch(() => {});
        } catch (e) {}

        if (this.ctx) {
            // Powerful sub-bass rumble + white noise crack
            const bufferSize = this.ctx.sampleRate * 0.5;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(3200, this.ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.4);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.85, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start();
        }
    }

    // Red Light Warning Alarm & Head Snap Servo sound
    playRedLightAlert() {
        if (!this.ctx || !this.enabled) return;
        this.init();

        // Mechanical servo buzz
        const servoOsc = this.ctx.createOscillator();
        const servoGain = this.ctx.createGain();
        servoOsc.type = 'sawtooth';
        servoOsc.frequency.setValueAtTime(160, this.ctx.currentTime);
        servoOsc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.25);
        servoGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        servoGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);
        servoOsc.connect(servoGain);
        servoGain.connect(this.ctx.destination);
        servoOsc.start();
        servoOsc.stop(this.ctx.currentTime + 0.28);

        // High alarm beep
        const beepOsc = this.ctx.createOscillator();
        const beepGain = this.ctx.createGain();
        beepOsc.type = 'sine';
        beepOsc.frequency.setValueAtTime(880, this.ctx.currentTime);
        beepGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        beepGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
        beepOsc.connect(beepGain);
        beepGain.connect(this.ctx.destination);
        beepOsc.start();
        beepOsc.stop(this.ctx.currentTime + 0.2);
    }

    // Continuous Tense Heartbeat during Red Light
    startHeartbeat() {
        if (!this.enabled) return;
        this.stopHeartbeat();
        this.playHeartbeatBeat();
        this.heartbeatTimer = setInterval(() => {
            this.playHeartbeatBeat();
        }, 750);
    }

    playHeartbeatBeat() {
        if (!this.ctx || !this.enabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(65, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.14);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.16);
    }

    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    // Footstep Sound
    playFootstep() {
        if (!this.ctx || !this.enabled) return;
        const now = performance.now();
        if (this.lastStep && now - this.lastStep < 200) return;
        this.lastStep = now;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120 + Math.random() * 40, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    // Iconic "Pink Soldiers" Theme Music Synthesizer (Bum... bum bum bum...)
    startPinkSoldiersBGM() {
        if (!this.enabled || this.bgmPlaying) return;
        this.init();
        this.bgmPlaying = true;

        // Notes for "Pink Soldiers": C4, D#4, D4, C4, A#3, C4
        const pattern = [
            { note: 261.63, dur: 0.4 }, // C4
            { note: 0, dur: 0.2 },      // rest
            { note: 311.13, dur: 0.35 },// D#4
            { note: 293.66, dur: 0.35 },// D4
            { note: 261.63, dur: 0.35 },// C4
            { note: 233.08, dur: 0.35 },// A#3
            { note: 261.63, dur: 0.6 }  // C4
        ];

        let index = 0;
        const step = () => {
            if (!this.bgmPlaying || !this.ctx || !this.enabled) return;
            const item = pattern[index];
            if (item.note > 0) {
                // Synthesize bass recorder / dark woodwind
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const filter = this.ctx.createBiquadFilter();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(item.note, this.ctx.currentTime);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(750, this.ctx.currentTime);

                gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + item.dur * 0.9);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start();
                osc.stop(this.ctx.currentTime + item.dur);

                // Marching kick drum thump
                const kick = this.ctx.createOscillator();
                const kickGain = this.ctx.createGain();
                kick.type = 'sine';
                kick.frequency.setValueAtTime(100, this.ctx.currentTime);
                kick.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.15);
                kickGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
                kickGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
                kick.connect(kickGain);
                kickGain.connect(this.ctx.destination);
                kick.start();
                kick.stop(this.ctx.currentTime + 0.15);
            }

            index = (index + 1) % pattern.length;
            this.bgmTimer = setTimeout(step, item.dur * 1000 + 150);
        };

        step();
    }

    stopBGM() {
        this.bgmPlaying = false;
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }
    }

    // Victory fanfare
    playVictory() {
        if (!this.enabled) return;
        this.stopChant();
        this.stopBGM();

        try {
            this.winAudio.currentTime = 0;
            this.winAudio.volume = 0.9;
            this.winAudio.play().catch(() => {});
        } catch (e) {}
    }
}

window.soundEngine = new SoundEngine();
