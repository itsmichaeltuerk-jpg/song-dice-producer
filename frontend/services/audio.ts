import { Arrangement, ParsedStepEvent } from '../types';

class AudioEngine {
    ctx: AudioContext | null = null;
    
    // Buses
    masterGain: GainNode | null = null;
    synthBus: GainNode | null = null;
    drumBus: GainNode | null = null;
    bassBus: GainNode | null = null;
    
    // FX
    compressor: DynamicsCompressorNode | null = null;
    reverbNode: ConvolverNode | null = null;
    reverbReturn: GainNode | null = null;
    delayNode: DelayNode | null = null;
    delayFeedback: GainNode | null = null;
    delayReturn: GainNode | null = null;
    
    // State
    isPlaying = false;
    scheduledNodes: (OscillatorNode | AudioBufferSourceNode)[] = [];
    arrangement: Arrangement | null = null;
    onBeatCallback: ((beat: number) => void) | null = null;
    onStopCallback: (() => void) | null = null;
    
    startTime = 0;
    secondsPerStep = 0.125; // 16th note duration
    totalSteps = 64;
    animationFrameId: number | null = null;
    lastReportedBeat = -1;

    // FX Levels
    _reverbLevel = 0.2;
    _delayLevel = 0.1;

    createReverbIR(ctx: AudioContext, duration: number, decay: number) {
        const length = ctx.sampleRate * duration;
        const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);
        for (let i = 0; i < length; i++) {
            const n = 1 - i / length;
            const env = Math.pow(n, decay);
            left[i] = (Math.random() * 2 - 1) * env;
            right[i] = (Math.random() * 2 - 1) * env;
        }
        return impulse;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            // 1. Master & Compressor
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.7;
            
            this.compressor = this.ctx.createDynamicsCompressor();
            this.compressor.threshold.value = -20;
            this.compressor.knee.value = 30;
            this.compressor.ratio.value = 12;
            this.compressor.attack.value = 0.003;
            this.compressor.release.value = 0.25;

            this.masterGain.connect(this.compressor);
            this.compressor.connect(this.ctx.destination);

            // 2. Instrument Buses
            this.synthBus = this.ctx.createGain();
            this.drumBus = this.ctx.createGain();
            this.bassBus = this.ctx.createGain();

            this.synthBus.connect(this.masterGain);
            this.drumBus.connect(this.masterGain);
            this.bassBus.connect(this.masterGain);

            // 3. Reverb FX
            this.reverbNode = this.ctx.createConvolver();
            this.reverbNode.buffer = this.createReverbIR(this.ctx, 2.5, 3.0);
            this.reverbReturn = this.ctx.createGain();
            this.reverbReturn.gain.value = this._reverbLevel;
            
            this.reverbNode.connect(this.reverbReturn);
            this.reverbReturn.connect(this.compressor);

            // 4. Delay FX
            this.delayNode = this.ctx.createDelay(5.0);
            this.delayFeedback = this.ctx.createGain();
            this.delayFeedback.gain.value = 0.4; // 40% feedback
            this.delayReturn = this.ctx.createGain();
            this.delayReturn.gain.value = this._delayLevel;

            this.delayNode.connect(this.delayFeedback);
            this.delayFeedback.connect(this.delayNode);
            this.delayNode.connect(this.delayReturn);
            this.delayReturn.connect(this.compressor);

            // 5. FX Routing
            // Synths go to both Reverb and Delay
            this.synthBus.connect(this.reverbNode);
            this.synthBus.connect(this.delayNode);
            
            // Drums go to Reverb (scaled down), no delay
            const drumReverbSend = this.ctx.createGain();
            drumReverbSend.gain.value = 0.4;
            this.drumBus.connect(drumReverbSend);
            drumReverbSend.connect(this.reverbNode);
            
            // Bass stays dry (only goes to masterGain)
        }
    }

    setReverbLevel(level: number) {
        this._reverbLevel = level;
        if (this.reverbReturn && this.ctx) {
            this.reverbReturn.gain.setTargetAtTime(level, this.ctx.currentTime, 0.05);
        }
    }

    setDelayLevel(level: number) {
        this._delayLevel = level;
        if (this.delayReturn && this.ctx) {
            this.delayReturn.gain.setTargetAtTime(level, this.ctx.currentTime, 0.05);
        }
    }

    noteToFreq(note: string): number {
        if (!note || note === 'X' || note === '-' || note === '.') return 0;
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const match = note.match(/([A-G]#?)(\d)/);
        if (!match) return 0;
        const n = notes.indexOf(match[1]);
        const octave = parseInt(match[2], 10);
        if (n === -1) return 0;
        const midiNote = octave * 12 + n + 12;
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }

    playTone(freq: number, startTime: number, duration: number, type: OscillatorType, vol: number, bus: GainNode) {
        if (!this.ctx || freq === 0) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.value = freq;
        
        const attack = 0.02;
        const release = 0.05;
        const actualDuration = Math.max(duration, attack + release);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + attack);
        gain.gain.setValueAtTime(vol, startTime + actualDuration - release);
        gain.gain.linearRampToValueAtTime(0, startTime + actualDuration);

        osc.connect(gain);
        gain.connect(bus);
        
        osc.start(startTime);
        osc.stop(startTime + actualDuration);
        this.scheduledNodes.push(osc);
    }

    playKick(startTime: number, vol: number, bus: GainNode) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.frequency.setValueAtTime(150, startTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, startTime + 0.3);
        
        gain.gain.setValueAtTime(vol, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
        
        osc.connect(gain);
        gain.connect(bus);
        osc.start(startTime);
        osc.stop(startTime + 0.3);
        this.scheduledNodes.push(osc);
    }

    playSnare(startTime: number, vol: number, bus: GainNode) {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;
        const noiseGain = this.ctx.createGain();
        
        noiseGain.gain.setValueAtTime(vol, startTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(bus);
        noise.start(startTime);
        this.scheduledNodes.push(noise);

        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(250, startTime);
        oscGain.gain.setValueAtTime(vol * 0.5, startTime);
        oscGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
        osc.connect(oscGain);
        oscGain.connect(bus);
        osc.start(startTime);
        osc.stop(startTime + 0.2);
        this.scheduledNodes.push(osc);
    }

    playHat(startTime: number, vol: number, bus: GainNode) {
        if (!this.ctx) return;
        const duration = 0.05;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const bandpass = this.ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 8000;
        const gain = this.ctx.createGain();
        
        gain.gain.setValueAtTime(vol, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        noise.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(bus);
        noise.start(startTime);
        this.scheduledNodes.push(noise);
    }

    parseChord(chordName: string): string[] {
        const rootMatch = chordName.match(/^[A-G]#?/);
        if (!rootMatch) return [];
        const root = rootMatch[0];
        const isMinor = chordName.includes('m') && !chordName.includes('maj');
        
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const rootIdx = notes.indexOf(root);
        if (rootIdx === -1) return [];

        const thirdIdx = (rootIdx + (isMinor ? 3 : 4)) % 12;
        const fifthIdx = (rootIdx + 7) % 12;

        return [`${notes[rootIdx]}3`, `${notes[thirdIdx]}3`, `${notes[fifthIdx]}3`];
    }

    parseStepString(stepString: string): ParsedStepEvent[] {
        if (!stepString) return [];
        const steps = stepString.trim().split(/\s+/);
        const events: ParsedStepEvent[] = [];
        let currentEvent: ParsedStepEvent | null = null;

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            if (step === 'X' || (step !== '-' && step !== '.')) {
                if (currentEvent) events.push(currentEvent);
                currentEvent = { step: i, note: step, duration_steps: 1 };
            } else if (step === '.') {
                if (currentEvent) currentEvent.duration_steps++;
            } else if (step === '-') {
                if (currentEvent) {
                    events.push(currentEvent);
                    currentEvent = null;
                }
            }
        }
        if (currentEvent) events.push(currentEvent);
        return events;
    }

    scheduleTrack(events: ParsedStepEvent[], trackType: 'melody' | 'bass' | 'chords' | 'kick' | 'snare' | 'hat') {
        if (!this.synthBus || !this.drumBus || !this.bassBus) return;

        events.forEach(event => {
            const eventTime = this.startTime + (event.step * this.secondsPerStep);
            const duration = event.duration_steps * this.secondsPerStep;
            const vol = 0.8;

            if (trackType === 'kick') this.playKick(eventTime, vol, this.drumBus!);
            else if (trackType === 'snare') this.playSnare(eventTime, vol, this.drumBus!);
            else if (trackType === 'hat') this.playHat(eventTime, vol * 0.5, this.drumBus!);
            else if (trackType === 'chords') {
                const chordNotes = this.parseChord(event.note);
                chordNotes.forEach(n => {
                    const freq = this.noteToFreq(n);
                    if (freq) this.playTone(freq, eventTime, duration, 'triangle', vol * 0.25, this.synthBus!);
                });
            } else {
                const freq = this.noteToFreq(event.note);
                if (freq) {
                    const type = trackType === 'bass' ? 'sawtooth' : 'sine';
                    const v = trackType === 'bass' ? vol * 0.5 : vol * 0.7;
                    const bus = trackType === 'bass' ? this.bassBus! : this.synthBus!;
                    this.playTone(freq, eventTime, duration, type, v, bus);
                }
            }
        });
    }

    updateVisualizer = () => {
        if (!this.isPlaying || !this.ctx) return;

        const currentTime = this.ctx.currentTime;
        const elapsedTime = currentTime - this.startTime;
        
        if (elapsedTime >= this.totalSteps * this.secondsPerStep) {
            this.stop();
            return;
        }

        const currentBeatFloat = elapsedTime / (this.secondsPerStep * 4);
        const currentBeatInt = Math.floor(currentBeatFloat);

        if (currentBeatInt !== this.lastReportedBeat) {
            this.lastReportedBeat = currentBeatInt;
            if (this.onBeatCallback) {
                this.onBeatCallback((currentBeatInt % 4) + 1);
            }
        }

        this.animationFrameId = requestAnimationFrame(this.updateVisualizer);
    };

    play(arrangement: Arrangement, onBeat?: (beat: number) => void, onStop?: () => void) {
        this.init();
        if (!this.ctx) return;
        this.stop();
        
        this.arrangement = arrangement;
        this.onBeatCallback = onBeat || null;
        this.onStopCallback = onStop || null;
        this.isPlaying = true;
        
        const bpm = arrangement.bpm || 120;
        this.secondsPerStep = (60.0 / bpm) / 4; // 16th note
        this.startTime = this.ctx.currentTime + 0.1;
        this.totalSteps = 64; // 4 bars * 16 steps
        this.lastReportedBeat = -1;

        // Sync delay time to BPM (dotted 8th note)
        if (this.delayNode) {
            this.delayNode.delayTime.value = this.secondsPerStep * 3;
        }

        // Parse and schedule all tracks
        this.scheduleTrack(this.parseStepString(arrangement.step_melody), 'melody');
        this.scheduleTrack(this.parseStepString(arrangement.step_bass), 'bass');
        this.scheduleTrack(this.parseStepString(arrangement.step_chords), 'chords');
        this.scheduleTrack(this.parseStepString(arrangement.step_drums_kick), 'kick');
        this.scheduleTrack(this.parseStepString(arrangement.step_drums_snare), 'snare');
        this.scheduleTrack(this.parseStepString(arrangement.step_drums_hat), 'hat');

        this.animationFrameId = requestAnimationFrame(this.updateVisualizer);
    }

    stop() {
        this.isPlaying = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.scheduledNodes.forEach(node => {
            try { node.stop(); } catch (e) { /* ignore */ }
            node.disconnect();
        });
        this.scheduledNodes = [];
        if (this.onStopCallback) this.onStopCallback();
    }
}

export const audio = new AudioEngine();
