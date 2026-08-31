import { Arrangement, NoteEvent, MixerState, StemTrack } from '../types';
import { HexArrangementMemory, buildHexArrangementMemory, EVENT_BYTE_SIZE, midiToNoteName } from './hexSequencer';

class AudioEngine {
    private ctx: AudioContext | null = null;
    private masterGainNode: GainNode | null = null;
    private limiterNode: DynamicsCompressorNode | null = null;
    private trackGainNodes: Record<StemTrack, GainNode | null> = {
        melody: null,
        chords: null,
        bass: null,
        drums: null,
        pad: null
    };

    // Pre-calculated wave shaper distortion curves for analog warmth
    private bassSaturationCurve: Float32Array | null = null;
    private keysSaturationCurve: Float32Array | null = null;
    private drumsTapeCurve: Float32Array | null = null;

    // Stereo delay node for lead melody spatial depth
    private leadDelayNode: DelayNode | null = null;
    private leadDelayFeedback: GainNode | null = null;

    // Pre-allocated metallic noise buffers for realistic cymbals, snares, claps, and hats
    private snareNoiseBuffer: AudioBuffer | null = null;
    private hatNoiseBuffer: AudioBuffer | null = null;
    private crashNoiseBuffer: AudioBuffer | null = null;
    private metallicCymbalBuffer: AudioBuffer | null = null;

    private isPlaying = false;
    private currentArrangement: Arrangement | null = null;
    private currentMixer: MixerState | null = null;
    private hexMemory: HexArrangementMemory | null = null;

    // Active voice tracking for auto-disposal
    private activeSourceNodes: Set<AudioNode> = new Set();

    // Lookahead Clock
    private schedulerTimerId: number | null = null;
    private animFrameId: number | null = null;

    private loopStartTime = 0;
    private secondsPerBeat = 0.5;
    private totalBeatsInLoop = 32;
    private loopDurationSec = 16;
    private nextScheduleTime = 0;
    private scheduleAheadSec = 0.22;
    private timerIntervalMs = 30;

    private scheduledStepBitmask: Set<number> = new Set();
    private loopIteration = 0;

    private onBeatCallback: ((currentBeatInLoop: number, currentBar: number) => void) | null = null;
    private onStopCallback: (() => void) | null = null;

    public init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            this.ctx = new AudioCtx({ latencyHint: 'playback' });

            // Master Gain with -3dB headroom for pristine summing
            this.masterGainNode = this.ctx.createGain();
            this.masterGainNode.gain.setValueAtTime(0.80, this.ctx.currentTime);

            // Transparent Master Limiter / Bus Glue
            this.limiterNode = this.ctx.createDynamicsCompressor();
            this.limiterNode.threshold.setValueAtTime(-4.5, this.ctx.currentTime);
            this.limiterNode.knee.setValueAtTime(5.0, this.ctx.currentTime);
            this.limiterNode.ratio.setValueAtTime(14.0, this.ctx.currentTime);
            this.limiterNode.attack.setValueAtTime(0.0025, this.ctx.currentTime);
            this.limiterNode.release.setValueAtTime(0.08, this.ctx.currentTime);

            // Master DC Blocker (highpass at 25Hz)
            const masterHighpass = this.ctx.createBiquadFilter();
            masterHighpass.type = 'highpass';
            masterHighpass.frequency.setValueAtTime(25, this.ctx.currentTime);

            this.masterGainNode.connect(masterHighpass);
            masterHighpass.connect(this.limiterNode);
            this.limiterNode.connect(this.ctx.destination);

            // -----------------------------------------------------------------
            // PRODUCER MIX BUS ROUTING & FREQUENCY CARVING:
            // High-pass filter chords, pads, and leads to clear out 30Hz - 200Hz
            // -----------------------------------------------------------------
            const chordsFilter = this.ctx.createBiquadFilter();
            chordsFilter.type = 'highpass';
            chordsFilter.frequency.setValueAtTime(160, this.ctx.currentTime);

            // Pad Bus Filter: 150Hz clean highpass + gentle 4.5kHz air shimmer
            const padHighpass = this.ctx.createBiquadFilter();
            padHighpass.type = 'highpass';
            padHighpass.frequency.setValueAtTime(150, this.ctx.currentTime);

            const padAirShimmer = this.ctx.createBiquadFilter();
            padAirShimmer.type = 'highshelf';
            padAirShimmer.frequency.setValueAtTime(4500, this.ctx.currentTime);
            padAirShimmer.gain.setValueAtTime(2.0, this.ctx.currentTime);

            const melodyFilter = this.ctx.createBiquadFilter();
            melodyFilter.type = 'highpass';
            melodyFilter.frequency.setValueAtTime(200, this.ctx.currentTime);

            // Lead Tape Delay Echo return bus
            this.leadDelayNode = this.ctx.createDelay(1.0);
            this.leadDelayNode.delayTime.setValueAtTime(0.24, this.ctx.currentTime);
            this.leadDelayFeedback = this.ctx.createGain();
            this.leadDelayFeedback.gain.setValueAtTime(0.22, this.ctx.currentTime);

            const delayFilter = this.ctx.createBiquadFilter();
            delayFilter.type = 'lowpass';
            delayFilter.frequency.setValueAtTime(2400, this.ctx.currentTime);

            this.leadDelayNode.connect(delayFilter);
            delayFilter.connect(this.leadDelayFeedback);
            this.leadDelayFeedback.connect(this.leadDelayNode);
            delayFilter.connect(this.masterGainNode);

            // Dedicated Bass Bus EQ
            const bassPresenceEq = this.ctx.createBiquadFilter();
            bassPresenceEq.type = 'peaking';
            bassPresenceEq.frequency.setValueAtTime(800, this.ctx.currentTime);
            bassPresenceEq.Q.setValueAtTime(1.8, this.ctx.currentTime);
            bassPresenceEq.gain.setValueAtTime(4.0, this.ctx.currentTime);

            const bassLowWarmthEq = this.ctx.createBiquadFilter();
            bassLowWarmthEq.type = 'peaking';
            bassLowWarmthEq.frequency.setValueAtTime(105, this.ctx.currentTime);
            bassLowWarmthEq.Q.setValueAtTime(1.4, this.ctx.currentTime);
            bassLowWarmthEq.gain.setValueAtTime(3.5, this.ctx.currentTime);

            // Drum bus punch shaper
            const drumPunchEq = this.ctx.createBiquadFilter();
            drumPunchEq.type = 'peaking';
            drumPunchEq.frequency.setValueAtTime(4500, this.ctx.currentTime);
            drumPunchEq.gain.setValueAtTime(2.5, this.ctx.currentTime);

            // Create Stem Gain Nodes
            const stemKeys: StemTrack[] = ['melody', 'chords', 'bass', 'drums', 'pad'];
            const defaultLevels: Record<StemTrack, number> = {
                melody: 0.78,
                chords: 0.74,
                bass: 1.00,
                drums: 0.90,
                pad: 0.62
            };

            stemKeys.forEach(key => {
                const g = this.ctx!.createGain();
                g.gain.setValueAtTime(defaultLevels[key], this.ctx!.currentTime);

                if (key === 'chords') {
                    g.connect(chordsFilter);
                    chordsFilter.connect(this.masterGainNode!);
                } else if (key === 'pad') {
                    g.connect(padHighpass);
                    padHighpass.connect(padAirShimmer);
                    padAirShimmer.connect(this.masterGainNode!);
                } else if (key === 'melody') {
                    g.connect(melodyFilter);
                    melodyFilter.connect(this.masterGainNode!);
                    if (this.leadDelayNode) {
                        const send = this.ctx!.createGain();
                        send.gain.setValueAtTime(0.20, this.ctx!.currentTime);
                        melodyFilter.connect(send);
                        send.connect(this.leadDelayNode);
                    }
                } else if (key === 'bass') {
                    g.connect(bassLowWarmthEq);
                    bassLowWarmthEq.connect(bassPresenceEq);
                    bassPresenceEq.connect(this.masterGainNode!);
                } else if (key === 'drums') {
                    g.connect(drumPunchEq);
                    drumPunchEq.connect(this.masterGainNode!);
                } else {
                    g.connect(this.masterGainNode!);
                }

                this.trackGainNodes[key] = g;
            });

            this.generateSaturationCurves();
            this.generateSharedNoiseBuffers();
        }

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    private generateSaturationCurves() {
        const nSamples = 1024;
        
        // Bass analog tube/tape saturation curve
        const bassCurve = new Float32Array(nSamples);
        const kBass = 2.8;
        for (let i = 0; i < nSamples; i++) {
            const x = (i * 2) / nSamples - 1;
            bassCurve[i] = ((1 + kBass) * x) / (1 + kBass * Math.abs(x));
        }
        this.bassSaturationCurve = bassCurve;

        // Keys soft Rhodes overdrive
        const keysCurve = new Float32Array(nSamples);
        const kKeys = 1.4;
        for (let i = 0; i < nSamples; i++) {
            const x = (i * 2) / nSamples - 1;
            keysCurve[i] = Math.tanh(x * kKeys);
        }
        this.keysSaturationCurve = keysCurve;

        // Drums gentle tape transient glue
        const drumsCurve = new Float32Array(nSamples);
        for (let i = 0; i < nSamples; i++) {
            const x = (i * 2) / nSamples - 1;
            drumsCurve[i] = (x > 0 ? Math.pow(x, 0.9) : -Math.pow(-x, 0.9)) * 0.95;
        }
        this.drumsTapeCurve = drumsCurve;
    }

    private generateSharedNoiseBuffers() {
        if (!this.ctx) return;
        const sr = this.ctx.sampleRate;

        // Snare noise buffer
        const snareLen = Math.floor(sr * 0.22);
        this.snareNoiseBuffer = this.ctx.createBuffer(1, snareLen, sr);
        const sData = this.snareNoiseBuffer.getChannelData(0);
        for (let i = 0; i < snareLen; i++) {
            const decay = Math.exp(-i / (sr * 0.040)) * 0.8 + Math.exp(-i / (sr * 0.09)) * 0.2;
            sData[i] = (Math.random() * 2 - 1) * decay;
        }

        // Closed Hat metallic multi-band noise buffer
        const hatLen = Math.floor(sr * 0.07);
        this.hatNoiseBuffer = this.ctx.createBuffer(1, hatLen, sr);
        const hData = this.hatNoiseBuffer.getChannelData(0);
        for (let i = 0; i < hatLen; i++) {
            const decay = Math.exp(-i / (sr * 0.014));
            const t = i / sr;
            const metalRings = (Math.sin(t * 8320 * 2 * Math.PI) + Math.sin(t * 11450 * 2 * Math.PI) + Math.sin(t * 14200 * 2 * Math.PI)) * 0.25;
            hData[i] = ((Math.random() * 2 - 1) * 0.75 + metalRings) * decay;
        }

        // Crash / Open Hat noise buffer
        const crashLen = Math.floor(sr * 0.65);
        this.crashNoiseBuffer = this.ctx.createBuffer(1, crashLen, sr);
        const cData = this.crashNoiseBuffer.getChannelData(0);
        for (let i = 0; i < crashLen; i++) {
            const decay = Math.exp(-i / (sr * 0.18));
            cData[i] = (Math.random() * 2 - 1) * decay;
        }

        // Shimmering ride/metallic percussion buffer
        const cymbalLen = Math.floor(sr * 0.45);
        this.metallicCymbalBuffer = this.ctx.createBuffer(1, cymbalLen, sr);
        const mData = this.metallicCymbalBuffer.getChannelData(0);
        for (let i = 0; i < cymbalLen; i++) {
            const t = i / sr;
            const ring = Math.sin(t * 5400 * 2 * Math.PI) * 0.3 + Math.sin(t * 7800 * 2 * Math.PI) * 0.3;
            const decay = Math.exp(-i / (sr * 0.12));
            mData[i] = ((Math.random() * 2 - 1) * 0.4 + ring) * decay;
        }
    }

    public updateMixer(mixer: MixerState) {
        this.currentMixer = mixer;
        if (!this.ctx || !this.masterGainNode) return;

        const now = this.ctx.currentTime;
        const targetMaster = Math.max(0.0001, Math.min(1.0, mixer.masterVolume * 0.80));
        this.masterGainNode.gain.setTargetAtTime(targetMaster, now, 0.015);

        const hasAnySolo = Object.entries(mixer).some(([k, v]) => k !== 'metronome' && k !== 'masterVolume' && (v as { solo: boolean }).solo);

        const tracks: StemTrack[] = ['melody', 'chords', 'bass', 'drums', 'pad'];
        tracks.forEach(track => {
            const node = this.trackGainNodes[track];
            if (!node) return;
            const tState = mixer[track];
            let effectiveGain = tState.volume;

            if (tState.muted) {
                effectiveGain = 0.0001;
            } else if (hasAnySolo && !tState.solo) {
                effectiveGain = 0.0001;
            }

            node.gain.setTargetAtTime(effectiveGain, now, 0.015);
        });
    }

    public midiNumberToFreq(midi: number): number {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    private registerVoiceDisposal(source: AudioScheduledSourceNode, nodesToDisconnect: AudioNode[]) {
        this.activeSourceNodes.add(source);
        source.onended = () => {
            this.activeSourceNodes.delete(source);
            nodesToDisconnect.forEach(n => {
                try { n.disconnect(); } catch {}
            });
        };
    }

    // =========================================================================
    // ENHANCED KEYS: Fender Rhodes & Juno-60 Polyphonic Shimmer
    // =========================================================================
    private playChordVoice(freq: number, startTime: number, duration: number, vel: number) {
        if (!this.ctx || !this.trackGainNodes.chords || freq <= 0) return;

        const normVel = Math.max(0.1, Math.min(1.0, (vel || 90) / 127));
        const safeStart = Math.max(this.ctx.currentTime + 0.002, startTime);
        const safeDuration = Math.max(0.08, duration);

        const keysVoiceMaster = this.ctx.createGain();

        // 1. METALLIC TINE HAMMER STRIKE
        const tineOsc = this.ctx.createOscillator();
        const tineFilter = this.ctx.createBiquadFilter();
        const tineGain = this.ctx.createGain();

        tineOsc.type = 'sine';
        tineOsc.frequency.setValueAtTime(Math.min(14000, freq * 2.756), safeStart);

        tineFilter.type = 'bandpass';
        tineFilter.frequency.setValueAtTime(Math.min(10000, freq * 3.5), safeStart);
        tineFilter.Q.setValueAtTime(2.2, safeStart);

        const tineVol = normVel * 0.16;
        tineGain.gain.setValueAtTime(0.0001, safeStart);
        tineGain.gain.linearRampToValueAtTime(tineVol, safeStart + 0.003);
        tineGain.gain.exponentialRampToValueAtTime(0.0001, safeStart + 0.08);

        tineOsc.connect(tineFilter);
        tineFilter.connect(tineGain);
        tineGain.connect(keysVoiceMaster);

        // 2. WARM STEREO CHORUS BODY
        const oscLeft = this.ctx.createOscillator();
        const oscRight = this.ctx.createOscillator();
        const bodyFilter = this.ctx.createBiquadFilter();
        const bodyGain = this.ctx.createGain();

        oscLeft.type = 'triangle';
        oscLeft.frequency.setValueAtTime(freq, safeStart);

        oscRight.type = 'sawtooth';
        oscRight.frequency.setValueAtTime(freq * 1.0022, safeStart);

        bodyFilter.type = 'lowpass';
        bodyFilter.Q.setValueAtTime(1.5, safeStart);
        const openCutoff = Math.min(5200, freq * 4.5 * (0.65 + normVel * 0.55));
        const restCutoff = Math.min(2200, freq * 1.8);
        bodyFilter.frequency.setValueAtTime(openCutoff, safeStart);
        bodyFilter.frequency.exponentialRampToValueAtTime(restCutoff, safeStart + Math.min(0.55, safeDuration * 0.8));

        const bodyVol = normVel * 0.26;
        const sustainLevel = Math.max(0.001, bodyVol * 0.65);

        bodyGain.gain.setValueAtTime(0.0001, safeStart);
        bodyGain.gain.linearRampToValueAtTime(bodyVol, safeStart + 0.012);
        bodyGain.gain.exponentialRampToValueAtTime(sustainLevel, safeStart + Math.min(0.35, safeDuration * 0.5));
        bodyGain.gain.setValueAtTime(sustainLevel, safeStart + Math.max(0.04, safeDuration - 0.05));
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, safeStart + safeDuration + 0.08);

        oscLeft.connect(bodyFilter);
        oscRight.connect(bodyFilter);
        bodyFilter.connect(bodyGain);

        if (this.keysSaturationCurve) {
            const shaper = this.ctx.createWaveShaper();
            shaper.curve = this.keysSaturationCurve;
            bodyGain.connect(shaper);
            shaper.connect(keysVoiceMaster);
        } else {
            bodyGain.connect(keysVoiceMaster);
        }

        keysVoiceMaster.connect(this.trackGainNodes.chords);

        const stopTime = safeStart + safeDuration + 0.12;
        tineOsc.start(safeStart);
        oscLeft.start(safeStart);
        oscRight.start(safeStart);

        tineOsc.stop(safeStart + 0.09);
        oscLeft.stop(stopTime);
        oscRight.stop(stopTime);

        this.registerVoiceDisposal(oscLeft, [
            tineOsc, tineFilter, tineGain,
            oscLeft, oscRight, bodyFilter, bodyGain,
            keysVoiceMaster
        ]);
    }

    // =========================================================================
    // ENHANCED LEAD MELODY
    // =========================================================================
    private playMelodyVoice(freq: number, startTime: number, duration: number, vel: number) {
        if (!this.ctx || !this.trackGainNodes.melody || freq <= 0) return;

        const normVel = Math.max(0.1, Math.min(1.0, (vel || 105) / 127));
        const safeStart = Math.max(this.ctx.currentTime + 0.002, startTime);
        const safeDuration = Math.max(0.06, duration);

        const leadVoiceMaster = this.ctx.createGain();

        const oscMain = this.ctx.createOscillator();
        oscMain.type = 'sawtooth';
        oscMain.frequency.setValueAtTime(freq, safeStart);

        const oscBody = this.ctx.createOscillator();
        oscBody.type = 'sine';
        oscBody.frequency.setValueAtTime(freq, safeStart);

        // Delayed Vibrato LFO
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(5.4, safeStart);

        lfoGain.gain.setValueAtTime(0, safeStart);
        lfoGain.gain.setValueAtTime(0, safeStart + 0.14);
        lfoGain.gain.linearRampToValueAtTime(freq * 0.015, safeStart + Math.min(0.4, safeDuration));

        lfo.connect(lfoGain);
        lfoGain.connect(oscMain.frequency);
        lfoGain.connect(oscBody.frequency);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.setValueAtTime(2.4, safeStart);

        const peakCutoff = Math.min(7500, freq * 5.0 * (0.7 + normVel * 0.5));
        const bodyCutoff = Math.min(2600, freq * 2.2);
        filter.frequency.setValueAtTime(Math.min(1200, freq * 1.5), safeStart);
        filter.frequency.exponentialRampToValueAtTime(peakCutoff, safeStart + 0.025);
        filter.frequency.exponentialRampToValueAtTime(bodyCutoff, safeStart + safeDuration);

        const gain = this.ctx.createGain();
        const targetVol = normVel * 0.25;
        gain.gain.setValueAtTime(0.0001, safeStart);
        gain.gain.linearRampToValueAtTime(targetVol, safeStart + 0.016);
        gain.gain.setValueAtTime(targetVol * 0.88, safeStart + Math.max(0.02, safeDuration - 0.04));
        gain.gain.linearRampToValueAtTime(0.0001, safeStart + safeDuration + 0.04);

        oscMain.connect(filter);
        oscBody.connect(filter);
        filter.connect(gain);
        gain.connect(leadVoiceMaster);

        leadVoiceMaster.connect(this.trackGainNodes.melody);

        const stopTime = safeStart + safeDuration + 0.06;
        lfo.start(safeStart);
        oscMain.start(safeStart);
        oscBody.start(safeStart);

        lfo.stop(stopTime);
        oscMain.stop(stopTime);
        oscBody.stop(stopTime);

        this.registerVoiceDisposal(oscMain, [
            lfo, lfoGain, oscMain, oscBody, filter, gain, leadVoiceMaster
        ]);
    }

    // =========================================================================
    // ENHANCED DRUM SUITE
    // =========================================================================
    private playDrumMidi(midiNote: number, startTime: number, vel: number) {
        if (!this.ctx || !this.trackGainNodes.drums) return;

        const normVel = Math.max(0.1, Math.min(1.0, vel / 127));
        const safeStart = Math.max(this.ctx.currentTime + 0.002, startTime);

        if (midiNote === 36) { 
            // 1. KICK DRUM
            const kickMaster = this.ctx.createGain();

            const subOsc = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            subOsc.frequency.setValueAtTime(145, safeStart);
            subOsc.frequency.exponentialRampToValueAtTime(44, safeStart + 0.075);

            const subVol = normVel * 0.52;
            subGain.gain.setValueAtTime(0.0001, safeStart);
            subGain.gain.linearRampToValueAtTime(subVol, safeStart + 0.003);
            subGain.gain.exponentialRampToValueAtTime(0.0001, safeStart + 0.24);

            subOsc.connect(subGain);
            subGain.connect(kickMaster);

            const clickOsc = this.ctx.createOscillator();
            const clickGain = this.ctx.createGain();
            const clickFilter = this.ctx.createBiquadFilter();

            clickOsc.type = 'triangle';
            clickOsc.frequency.setValueAtTime(3800, safeStart);
            clickOsc.frequency.exponentialRampToValueAtTime(400, safeStart + 0.015);

            clickFilter.type = 'bandpass';
            clickFilter.frequency.setValueAtTime(3200, safeStart);
            clickFilter.Q.setValueAtTime(1.5, safeStart);

            const clickVol = normVel * 0.22;
            clickGain.gain.setValueAtTime(clickVol, safeStart);
            clickGain.gain.exponentialRampToValueAtTime(0.0001, safeStart + 0.020);

            clickOsc.connect(clickFilter);
            clickFilter.connect(clickGain);
            clickGain.connect(kickMaster);

            kickMaster.connect(this.trackGainNodes.drums);

            subOsc.start(safeStart);
            clickOsc.start(safeStart);
            subOsc.stop(safeStart + 0.25);
            clickOsc.stop(safeStart + 0.03);

            this.registerVoiceDisposal(subOsc, [subOsc, subGain, clickOsc, clickFilter, clickGain, kickMaster]);

        } else if (midiNote === 38) { 
            // 2. SNARE DRUM
            const snareMaster = this.ctx.createGain();

            if (this.snareNoiseBuffer) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = this.snareNoiseBuffer;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(2800, safeStart);
                filter.Q.setValueAtTime(1.2, safeStart);

                const gain = this.ctx.createGain();
                const snareVol = normVel * 0.32;
                gain.gain.setValueAtTime(0.0001, safeStart);
                gain.gain.linearRampToValueAtTime(snareVol, safeStart + 0.003);
                gain.gain.exponentialRampToValueAtTime(0.0001, safeStart + 0.18);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(snareMaster);

                noise.start(safeStart);
                noise.stop(safeStart + 0.20);
                this.registerVoiceDisposal(noise, [noise, filter, gain]);
            }

            const bodyOsc = this.ctx.createOscillator();
            const bodyGain = this.ctx.createGain();
            bodyOsc.type = 'triangle';
            bodyOsc.frequency.setValueAtTime(195, safeStart);
            bodyOsc.frequency.exponentialRampToValueAtTime(125, safeStart + 0.045);

            const bodyVol = normVel * 0.24;
            bodyGain.gain.setValueAtTime(0.0001, safeStart);
            bodyGain.gain.linearRampToValueAtTime(bodyVol, safeStart + 0.003);
            bodyGain.gain.exponentialRampToValueAtTime(0.0001, safeStart + 0.09);

            bodyOsc.connect(bodyGain);
            bodyGain.connect(snareMaster);

            snareMaster.connect(this.trackGainNodes.drums);

            bodyOsc.start(safeStart);
            bodyOsc.stop(safeStart + 0.10);
            this.registerVoiceDisposal(bodyOsc, [bodyOsc, bodyGain, snareMaster]);

        } else if (midiNote === 39) { 
            // 3. HANDCLAP
            const clapMaster = this.ctx.createGain();
            const clapOffsets = [0, 0.011, 0.022];

            clapOffsets.forEach((offset, idx) => {
                if (this.snareNoiseBuffer) {
                    const noise = this.ctx.createBufferSource();
                    noise.buffer = this.snareNoiseBuffer;

                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'bandpass';
                    filter.frequency.setValueAtTime(1600 + idx * 250, safeStart + offset);
                    filter.Q.setValueAtTime(2.0, safeStart + offset);

                    const gain = this.ctx.createGain();
                    const isFinal = idx === clapOffsets.length - 1;
                    const clapVol = normVel * (isFinal ? 0.35 : 0.18);

                    gain.gain.setValueAtTime(0.0001, safeStart + offset);
                    gain.gain.linearRampToValueAtTime(clapVol, safeStart + offset + 0.002);
                    gain.gain.exponentialRampToValueAtTime(0.0001, safeStart + offset + (isFinal ? 0.22 : 0.025));

                    noise.connect(filter);
                    filter.connect(gain);
                    gain.connect(clapMaster);

                    noise.start(safeStart + offset);
                    noise.stop(safeStart + offset + (isFinal ? 0.24 : 0.03));
                    this.registerVoiceDisposal(noise, [noise, filter, gain]);
                }
            });

            clapMaster.connect(this.trackGainNodes.drums);

        } else if (midiNote === 46 || midiNote === 49) { 
            // 4. OPEN HAT & CRASH CYMBAL
            const isCrash = midiNote === 49;
            if (this.crashNoiseBuffer) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = this.crashNoiseBuffer;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'highpass';
                filter.frequency.setValueAtTime(isCrash ? 3800 : 5200, safeStart);

                const gain = this.ctx.createGain();
                const vol = normVel * (isCrash ? 0.24 : 0.18);
                gain.gain.setValueAtTime(0.0001, safeStart);
                gain.gain.linearRampToValueAtTime(vol, safeStart + 0.004);
                gain.gain.exponentialRampToValueAtTime(0.0001, safeStart + (isCrash ? 0.55 : 0.35));

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.trackGainNodes.drums);

                noise.start(safeStart);
                noise.stop(safeStart + (isCrash ? 0.60 : 0.38));
                this.registerVoiceDisposal(noise, [noise, filter, gain]);
            }

        } else { 
            // 5. CLOSED HI-HAT
            if (this.hatNoiseBuffer) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = this.hatNoiseBuffer;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'highpass';
                filter.frequency.setValueAtTime(7200, safeStart);

                const bandpass = this.ctx.createBiquadFilter();
                bandpass.type = 'peaking';
                bandpass.frequency.setValueAtTime(10500, safeStart);
                bandpass.gain.setValueAtTime(3.0, safeStart);

                const gain = this.ctx.createGain();
                const hatVol = normVel * 0.18;
                gain.gain.setValueAtTime(0.0001, safeStart);
                gain.gain.linearRampToValueAtTime(hatVol, safeStart + 0.002);
                gain.gain.exponentialRampToValueAtTime(0.0001, safeStart + 0.055);

                noise.connect(filter);
                filter.connect(bandpass);
                bandpass.connect(gain);
                gain.connect(this.trackGainNodes.drums);

                noise.start(safeStart);
                noise.stop(safeStart + 0.06);
                this.registerVoiceDisposal(noise, [noise, filter, bandpass, gain]);
            }
        }
    }

    // =========================================================================
    // UPGRADED CINEMATIC AMBIENT PAD: Roland Juno / Prophet-5 Warm Analog Stack
    // Layer 1: 5-Oscillator Super-Saw/Triangle Stack with Micro-Detune (-6, -2, 0, +2, +6 cents)
    // Layer 2: Sub-Harmonic Foundation (Sine octave below fundamental for rich low-mid body)
    // Layer 3: Breathing Dual-Phase LFO Cutoff Modulation (0.28Hz slow analog drift)
    // Layer 4: Ethereal Silky Envelope (280ms swell attack + long reverb-like release)
    // =========================================================================
    private playPadVoice(freq: number, startTime: number, duration: number, vel: number) {
        if (!this.ctx || !this.trackGainNodes.pad || freq <= 0) return;

        const normVel = Math.max(0.1, Math.min(1.0, (vel || 65) / 127));
        const safeStart = Math.max(this.ctx.currentTime + 0.002, startTime);
        const safeDuration = Math.max(0.25, duration);

        const padVoiceMaster = this.ctx.createGain();

        // 1. DUAL ANALOG FILTERS WITH STEREO RESONANCE
        const mainFilter = this.ctx.createBiquadFilter();
        mainFilter.type = 'lowpass';
        mainFilter.Q.setValueAtTime(1.8, safeStart);

        // Filter envelope: opens gently from 480Hz to 1600Hz, then rests at 850Hz
        const baseCutoff = Math.min(1800, freq * 2.8 * (0.75 + normVel * 0.45));
        mainFilter.frequency.setValueAtTime(420, safeStart);
        mainFilter.frequency.linearRampToValueAtTime(baseCutoff, safeStart + Math.min(0.8, safeDuration * 0.4));
        mainFilter.frequency.linearRampToValueAtTime(Math.min(1100, baseCutoff * 0.7), safeStart + safeDuration);

        // Slow Breathing LFO (0.28Hz slow cutoff drift for alive, organic warmth)
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.28, safeStart);
        lfoGain.gain.setValueAtTime(120, safeStart); // +/-120Hz breathing sweep

        lfo.connect(lfoGain);
        lfoGain.connect(mainFilter.frequency);

        // 2. 5-OSCILLATOR DETUNED SUPER-STACK (Juno chorus width)
        // Osc 1: Pure center triangle
        const oscCenter = this.ctx.createOscillator();
        oscCenter.type = 'triangle';
        oscCenter.frequency.setValueAtTime(freq, safeStart);

        // Osc 2: Left-panned soft saw (-2.5 cents)
        const oscDetuneL1 = this.ctx.createOscillator();
        oscDetuneL1.type = 'sawtooth';
        oscDetuneL1.frequency.setValueAtTime(freq * 0.9985, safeStart);

        // Osc 3: Right-panned soft saw (+2.5 cents)
        const oscDetuneR1 = this.ctx.createOscillator();
        oscDetuneR1.type = 'sawtooth';
        oscDetuneR1.frequency.setValueAtTime(freq * 1.0015, safeStart);

        // Osc 4: Ethereal wide saw (-6 cents)
        const oscDetuneL2 = this.ctx.createOscillator();
        oscDetuneL2.type = 'sawtooth';
        oscDetuneL2.frequency.setValueAtTime(freq * 0.9965, safeStart);

        // Osc 5: Sub-harmonic sine (warm fundamental body)
        const oscSub = this.ctx.createOscillator();
        oscSub.type = 'sine';
        oscSub.frequency.setValueAtTime(freq, safeStart);

        // Connect all 5 oscillators into resonant filter
        oscCenter.connect(mainFilter);
        oscDetuneL1.connect(mainFilter);
        oscDetuneR1.connect(mainFilter);
        oscDetuneL2.connect(mainFilter);
        oscSub.connect(mainFilter);

        // 3. ETHEREAL SILKY ENVELOPE (Lush swelling attack and diffuse release)
        const gain = this.ctx.createGain();
        const targetVol = normVel * 0.16;
        const attackTime = Math.min(0.35, safeDuration * 0.25);
        const releaseTime = 0.45;

        gain.gain.setValueAtTime(0.0001, safeStart);
        gain.gain.linearRampToValueAtTime(targetVol, safeStart + attackTime);
        gain.gain.setValueAtTime(targetVol * 0.88, safeStart + Math.max(attackTime, safeDuration - 0.15));
        gain.gain.linearRampToValueAtTime(0.0001, safeStart + safeDuration + releaseTime);

        mainFilter.connect(gain);
        gain.connect(padVoiceMaster);
        padVoiceMaster.connect(this.trackGainNodes.pad);

        // Start oscillators
        const stopTime = safeStart + safeDuration + releaseTime + 0.05;
        lfo.start(safeStart);
        oscCenter.start(safeStart);
        oscDetuneL1.start(safeStart);
        oscDetuneR1.start(safeStart);
        oscDetuneL2.start(safeStart);
        oscSub.start(safeStart);

        lfo.stop(stopTime);
        oscCenter.stop(stopTime);
        oscDetuneL1.stop(stopTime);
        oscDetuneR1.stop(stopTime);
        oscDetuneL2.stop(stopTime);
        oscSub.stop(stopTime);

        this.registerVoiceDisposal(oscCenter, [
            lfo, lfoGain,
            oscCenter, oscDetuneL1, oscDetuneR1, oscDetuneL2, oscSub,
            mainFilter, gain, padVoiceMaster
        ]);
    }

    // =========================================================================
    // TRIPLE-LAYER PRODUCER BASS SYNTHESIS ENGINE
    // =========================================================================
    private playBassVoice(freq: number, startTime: number, duration: number, vel: number) {
        if (!this.ctx || !this.trackGainNodes.bass || freq <= 0) return;

        let effectiveFreq = freq;
        while (effectiveFreq < 45) effectiveFreq *= 2;
        while (effectiveFreq > 160) effectiveFreq /= 2;

        const normVel = Math.max(0.2, Math.min(1.0, (vel || 110) / 127));
        const safeStart = Math.max(this.ctx.currentTime + 0.002, startTime);
        const safeDuration = Math.max(0.10, duration);

        const voiceMasterGain = this.ctx.createGain();

        // 1. SUB LAYER
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(effectiveFreq, safeStart);

        const subVol = normVel * 0.48;
        subGain.gain.setValueAtTime(0.0001, safeStart);
        subGain.gain.linearRampToValueAtTime(subVol, safeStart + 0.010);
        subGain.gain.setValueAtTime(subVol * 0.92, safeStart + safeDuration - 0.03);
        subGain.gain.linearRampToValueAtTime(0.0001, safeStart + safeDuration);

        subOsc.connect(subGain);
        subGain.connect(voiceMasterGain);

        // 2. SATURATED MID HARMONICS LAYER
        const midOsc = this.ctx.createOscillator();
        const midFilter = this.ctx.createBiquadFilter();
        const midGain = this.ctx.createGain();

        midOsc.type = 'sawtooth';
        midOsc.frequency.setValueAtTime(effectiveFreq, safeStart);

        midFilter.type = 'lowpass';
        midFilter.Q.setValueAtTime(3.2, safeStart);
        midFilter.frequency.setValueAtTime(1400, safeStart);
        midFilter.frequency.exponentialRampToValueAtTime(340, safeStart + Math.min(0.22, safeDuration));

        const midVol = normVel * 0.32;
        midGain.gain.setValueAtTime(0.0001, safeStart);
        midGain.gain.linearRampToValueAtTime(midVol, safeStart + 0.008);
        midGain.gain.setValueAtTime(midVol * 0.85, safeStart + safeDuration - 0.03);
        midGain.gain.linearRampToValueAtTime(0.0001, safeStart + safeDuration);

        midOsc.connect(midFilter);
        midFilter.connect(midGain);

        if (this.bassSaturationCurve) {
            const shaper = this.ctx.createWaveShaper();
            shaper.curve = this.bassSaturationCurve;
            midGain.connect(shaper);
            shaper.connect(voiceMasterGain);
        } else {
            midGain.connect(voiceMasterGain);
        }

        // 3. TRANSIENT ATTACK PLUCK
        const attackOsc = this.ctx.createOscillator();
        const attackGain = this.ctx.createGain();
        attackOsc.type = 'triangle';
        attackOsc.frequency.setValueAtTime(effectiveFreq * 2.2, safeStart);
        attackOsc.frequency.exponentialRampToValueAtTime(effectiveFreq, safeStart + 0.025);

        const attackVol = normVel * 0.22;
        attackGain.gain.setValueAtTime(0.0001, safeStart);
        attackGain.gain.linearRampToValueAtTime(attackVol, safeStart + 0.003);
        attackGain.gain.exponentialRampToValueAtTime(0.0001, safeStart + 0.035);

        attackOsc.connect(attackGain);
        attackGain.connect(voiceMasterGain);

        voiceMasterGain.connect(this.trackGainNodes.bass);

        const stopTime = safeStart + safeDuration + 0.02;
        subOsc.start(safeStart);
        midOsc.start(safeStart);
        attackOsc.start(safeStart);

        subOsc.stop(stopTime);
        midOsc.stop(stopTime);
        attackOsc.stop(safeStart + 0.04);

        this.registerVoiceDisposal(subOsc, [
            subOsc, subGain, midOsc, midFilter, midGain,
            attackOsc, attackGain, voiceMasterGain
        ]);
    }

    private playClick(startTime: number, isDownbeat: boolean) {
        if (!this.ctx || !this.masterGainNode) return;
        const safeStart = Math.max(this.ctx.currentTime + 0.002, startTime);

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(isDownbeat ? 1400 : 900, safeStart);

        gain.gain.setValueAtTime(0.0001, safeStart);
        gain.gain.linearRampToValueAtTime(0.08, safeStart + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, safeStart + 0.025);

        osc.connect(gain);
        gain.connect(this.masterGainNode);

        const stopTime = safeStart + 0.03;
        osc.start(safeStart);
        osc.stop(stopTime);

        this.registerVoiceDisposal(osc, [osc, gain]);
    }

    // =========================================================================
    // HEX BUFFER TRAVERSAL
    // =========================================================================
    private scheduleLoopWindowHex() {
        if (!this.isPlaying || !this.ctx || !this.hexMemory) return;

        const currentTime = this.ctx.currentTime;
        const horizon = currentTime + this.scheduleAheadSec;
        const secondsPerStep = this.secondsPerBeat * 0.25;

        while (this.nextScheduleTime < horizon) {
            const timeInLoop = this.nextScheduleTime - this.loopStartTime;
            const currentStepInLoop = Math.floor(timeInLoop / secondsPerStep) % this.hexMemory.totalSteps;

            const stepKey = (this.loopIteration << 8) | currentStepInLoop;
            if (!this.scheduledStepBitmask.has(stepKey)) {
                this.scheduledStepBitmask.add(stepKey);

                const tracks = this.hexMemory.tracks;

                // Drums
                this.scanTrackBuffer(tracks.drums.buffer, currentStepInLoop, (midi, durTicks, vel) => {
                    this.playDrumMidi(midi, this.nextScheduleTime, vel);
                });

                // Bass
                this.scanTrackBuffer(tracks.bass.buffer, currentStepInLoop, (midi, durTicks, vel) => {
                    const durSec = durTicks * secondsPerStep;
                    this.playBassVoice(this.midiNumberToFreq(midi), this.nextScheduleTime, durSec, vel);
                });

                // Chords
                this.scanTrackBuffer(tracks.chords.buffer, currentStepInLoop, (midi, durTicks, vel) => {
                    const durSec = durTicks * secondsPerStep;
                    this.playChordVoice(this.midiNumberToFreq(midi), this.nextScheduleTime, durSec, vel);
                });

                // Melody
                this.scanTrackBuffer(tracks.melody.buffer, currentStepInLoop, (midi, durTicks, vel) => {
                    const durSec = durTicks * secondsPerStep;
                    this.playMelodyVoice(this.midiNumberToFreq(midi), this.nextScheduleTime, durSec, vel);
                });

                // Pad
                this.scanTrackBuffer(tracks.pad.buffer, currentStepInLoop, (midi, durTicks, vel) => {
                    const durSec = durTicks * secondsPerStep;
                    this.playPadVoice(this.midiNumberToFreq(midi), this.nextScheduleTime, durSec, vel);
                });

                // Metronome
                if (this.currentMixer?.metronome && (currentStepInLoop % 4 === 0)) {
                    this.playClick(this.nextScheduleTime, currentStepInLoop % 16 === 0);
                }
            }

            this.nextScheduleTime += secondsPerStep;

            if (this.nextScheduleTime >= this.loopStartTime + this.loopDurationSec) {
                this.loopStartTime += this.loopDurationSec;
                this.loopIteration++;
                this.scheduledStepBitmask.clear();
            }
        }
    }

    private scanTrackBuffer(
        buffer: Uint8Array,
        targetStep: number,
        onEvent: (midi: number, durTicks: number, vel: number) => void
    ) {
        const len = buffer.length;
        for (let offset = 0; offset < len; offset += EVENT_BYTE_SIZE) {
            const step = buffer[offset];
            if (step === targetStep) {
                const midi = buffer[offset + 1];
                const durTicks = buffer[offset + 2];
                const vel = buffer[offset + 3];
                onEvent(midi, durTicks, vel);
            } else if (step > targetStep) {
                break;
            }
        }
    }

    public play(
        arrangement: Arrangement,
        mixer: MixerState,
        onBeat: (currentBeatInLoop: number, currentBar: number) => void,
        onStop: () => void
    ) {
        this.init();
        if (!this.ctx) return;
        this.stop();

        this.isPlaying = true;
        this.currentArrangement = arrangement;
        this.currentMixer = mixer;
        this.onBeatCallback = onBeat;
        this.onStopCallback = onStop;

        this.hexMemory = buildHexArrangementMemory(arrangement);

        const bpm = Math.max(50, Math.min(220, arrangement.bpm || 94));
        this.secondsPerBeat = 60.0 / bpm;
        const totalBars = Math.max(4, arrangement.bars_total || 8);
        this.totalBeatsInLoop = totalBars * 4;
        this.loopDurationSec = this.totalBeatsInLoop * this.secondsPerBeat;

        const startTime = this.ctx.currentTime + 0.04;
        this.loopStartTime = startTime;
        this.nextScheduleTime = startTime;
        this.loopIteration = 0;
        this.scheduledStepBitmask.clear();

        this.updateMixer(mixer);

        this.schedulerTimerId = window.setInterval(() => {
            this.scheduleLoopWindowHex();
        }, this.timerIntervalMs);

        const updateVisuals = () => {
            if (!this.isPlaying || !this.ctx) return;

            const elapsed = this.ctx.currentTime - this.loopStartTime;
            if (elapsed >= 0) {
                const totalProgressBeats = (elapsed / this.secondsPerBeat) % this.totalBeatsInLoop;
                const currentBar = (Math.floor(totalProgressBeats / 4) % totalBars) + 1;
                const currentBeatInBar = (totalProgressBeats % 4) + 1;

                if (this.onBeatCallback) {
                    this.onBeatCallback(currentBeatInBar, currentBar);
                }
            }

            this.animFrameId = requestAnimationFrame(updateVisuals);
        };

        this.animFrameId = requestAnimationFrame(updateVisuals);
    }

    public stop() {
        this.isPlaying = false;

        if (this.schedulerTimerId) {
            clearInterval(this.schedulerTimerId);
            this.schedulerTimerId = null;
        }

        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }

        this.scheduledStepBitmask.clear();

        this.activeSourceNodes.forEach(node => {
            try {
                (node as AudioScheduledSourceNode).stop();
            } catch {}
            try {
                node.disconnect();
            } catch {}
        });
        this.activeSourceNodes.clear();

        if (this.onStopCallback) {
            this.onStopCallback();
        }
    }

    public getIsPlaying(): boolean {
        return this.isPlaying;
    }
}

export const audioEngine = new AudioEngine();
