import { Arrangement, DieState, NoteEvent, VibeSettings } from '../types';

// =========================================================================
// MUSIC THEORY ENGINE & SCALE DEFINITIONS
// =========================================================================

const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const MODE_INTERVALS: Record<string, number[]> = {
    ionian: [0, 2, 4, 5, 7, 9, 11],
    major: [0, 2, 4, 5, 7, 9, 11],
    aeolian: [0, 2, 3, 5, 7, 8, 10],
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
    pentatonic_major: [0, 2, 4, 7, 9],
    pentatonic_minor: [0, 3, 5, 7, 10],
    blues: [0, 3, 5, 6, 7, 10]
};

// Map Roman numerals to scale degrees (0-indexed) and chord qualities
const ROMAN_CHORD_MAP: Record<string, { degree: number; isMinor: boolean; isDim?: boolean; is7th?: boolean }> = {
    'i': { degree: 0, isMinor: true },
    'I': { degree: 0, isMinor: false },
    'ii': { degree: 1, isMinor: true },
    'II': { degree: 1, isMinor: false },
    'bII': { degree: 1, isMinor: false },
    'iii': { degree: 2, isMinor: true },
    'III': { degree: 2, isMinor: false },
    'bIII': { degree: 2, isMinor: false },
    'iv': { degree: 3, isMinor: true },
    'IV': { degree: 3, isMinor: false },
    'v': { degree: 4, isMinor: true },
    'V': { degree: 4, isMinor: false },
    'vi': { degree: 5, isMinor: true },
    'VI': { degree: 5, isMinor: false },
    'bVI': { degree: 5, isMinor: false },
    'vii': { degree: 6, isMinor: true },
    'vii°': { degree: 6, isMinor: true, isDim: true },
    'VII': { degree: 6, isMinor: false },
    'bVII': { degree: 6, isMinor: false }
};

export interface ParsedKeyInfo {
    rootName: string;
    rootIndex: number;
    mode: string;
    isMinor: boolean;
    scalePitches: number[]; // chromatic offsets 0-11
}

export function parseKeyAndMode(keyStr: string): ParsedKeyInfo {
    const raw = keyStr.trim();
    const match = raw.match(/^([A-G][#b]?)\s*(.*)$/i);
    let root = 'A';
    let modeCandidate = 'minor';

    if (match) {
        root = match[1].toUpperCase();
        if (root.length === 2 && root[1] === 'B') {
            root = root[0] + 'b';
        }
        const rest = match[2].toLowerCase();
        if (rest.includes('major') || rest.includes('ionian')) modeCandidate = 'major';
        else if (rest.includes('dorian')) modeCandidate = 'dorian';
        else if (rest.includes('lydian')) modeCandidate = 'lydian';
        else if (rest.includes('mixolydian')) modeCandidate = 'mixolydian';
        else if (rest.includes('phrygian')) modeCandidate = 'phrygian';
        else modeCandidate = 'minor';
    }

    // Standardize root note to index 0-11
    const cleanRoot = root === 'Bb' ? 'A#' : root === 'Eb' ? 'D#' : root === 'Ab' ? 'G#' : root === 'Db' ? 'C#' : root === 'Gb' ? 'F#' : root;
    let rootIdx = PITCH_NAMES.indexOf(cleanRoot);
    if (rootIdx === -1) rootIdx = 9; // default A

    const intervals = MODE_INTERVALS[modeCandidate] || MODE_INTERVALS.minor;
    const isMinor = modeCandidate !== 'major' && modeCandidate !== 'lydian' && modeCandidate !== 'mixolydian';

    const scalePitches = intervals.map(int => (rootIdx + int) % 12);

    return {
        rootName: PITCH_NAMES[rootIdx],
        rootIndex: rootIdx,
        mode: modeCandidate.charAt(0).toUpperCase() + modeCandidate.slice(1),
        isMinor,
        scalePitches
    };
}

// Convert MIDI number (e.g. 60) to pitch string ("C4")
export function midiToPitchName(midi: number): string {
    const note = PITCH_NAMES[midi % 12];
    const oct = Math.floor(midi / 12) - 1;
    return `${note}${oct}`;
}

// Convert pitch string ("C4", "A#3") to MIDI number
export function pitchNameToMidi(pitch: string): number {
    const m = pitch.trim().match(/^([A-Ga-g][#b]?)(\d+)$/);
    if (!m) return 60;
    const name = m[1].toUpperCase();
    const cleanName = name === 'BB' ? 'A#' : name === 'EB' ? 'D#' : name === 'AB' ? 'G#' : name === 'DB' ? 'C#' : name === 'GB' ? 'F#' : name;
    const oct = parseInt(m[2], 10);
    const idx = PITCH_NAMES.indexOf(cleanName);
    if (idx === -1) return 60;
    return (oct + 1) * 12 + idx;
}

// =========================================================================
// CHORD PROGRESSION GENERATOR & VOICE LEADING
// =========================================================================

interface ChordStep {
    name: string;
    roman: string;
    rootMidi: number;
    notes: string[]; // ["A3", "C4", "E4"]
    durationBeats: number;
}

export function buildProceduralChordProgression(
    chordDieStr: string,
    keyInfo: ParsedKeyInfo,
    totalBars = 8,
    complexity = 40
): ChordStep[] {
    let romanPattern: string[] = [];

    const lower = chordDieStr.toLowerCase();
    if (lower.includes('vi – iv – i – v') || lower.includes('vi-iv-i-v')) {
        romanPattern = ['vi', 'IV', 'I', 'V'];
    } else if (lower.includes('i – v – vi – iv') || lower.includes('i-v-vi-iv')) {
        romanPattern = ['I', 'V', 'vi', 'IV'];
    } else if (lower.includes('ii – v – i') || lower.includes('ii-v-i')) {
        romanPattern = ['ii', 'V', 'I', 'VI'];
    } else if (lower.includes('i – bvi – bvii') || lower.includes('i-bvi-bvii')) {
        romanPattern = ['i', 'bVI', 'bVII', 'i'];
    } else if (lower.includes('i – iv – v') || lower.includes('i-iv-v')) {
        romanPattern = ['i', 'iv', 'v', 'i'];
    } else if (lower.includes('i – bvii – iv') || lower.includes('i-bvii-iv')) {
        romanPattern = ['I', 'bVII', 'IV', 'I'];
    } else if (lower.includes('i – iii – iv – v') || lower.includes('i-iii-iv-v')) {
        romanPattern = ['I', 'iii', 'IV', 'V'];
    } else if (keyInfo.isMinor) {
        romanPattern = ['i', 'bVI', 'bIII', 'bVII'];
    } else {
        romanPattern = ['I', 'V', 'vi', 'IV'];
    }

    const fullBarsSequence: string[] = [];
    for (let b = 0; b < totalBars; b++) {
        fullBarsSequence.push(romanPattern[b % romanPattern.length]);
    }

    let previousMidiVoicing: number[] = [];
    const chordSteps: ChordStep[] = [];

    fullBarsSequence.forEach((roman, barIdx) => {
        const info = ROMAN_CHORD_MAP[roman] || { degree: 0, isMinor: keyInfo.isMinor };
        const rootPitchOffset = keyInfo.scalePitches[info.degree % keyInfo.scalePitches.length];
        const chordRootName = PITCH_NAMES[rootPitchOffset];
        const isMin = info.isMinor;
        const chordName = `${chordRootName}${isMin ? 'm' : ''}${complexity > 60 ? '7' : ''}`;

        const thirdOffset = (rootPitchOffset + (isMin ? 3 : 4)) % 12;
        const fifthOffset = (rootPitchOffset + 7) % 12;
        const seventhOffset = (rootPitchOffset + (isMin ? 10 : 11)) % 12;

        const candidatePitches = [rootPitchOffset, thirdOffset, fifthOffset];
        if (complexity > 60 || (complexity > 30 && barIdx % 2 === 1)) {
            candidatePitches.push(seventhOffset);
        }

        const targetOctave = 3;
        const currentVoicingMidi: number[] = [];

        candidatePitches.forEach((pitchClass, idx) => {
            let chosenMidi = (targetOctave + 1) * 12 + pitchClass;
            if (idx === 0 && chosenMidi > 60) chosenMidi -= 12;
            if (idx > 0 && chosenMidi < 55) chosenMidi += 12;

            if (previousMidiVoicing.length > 0) {
                const nearestPrev = previousMidiVoicing[Math.min(idx, previousMidiVoicing.length - 1)];
                while (Math.abs(chosenMidi - 12 - nearestPrev) < Math.abs(chosenMidi - nearestPrev)) {
                    chosenMidi -= 12;
                }
                while (Math.abs(chosenMidi + 12 - nearestPrev) < Math.abs(chosenMidi - nearestPrev)) {
                    chosenMidi += 12;
                }
            }

            currentVoicingMidi.push(chosenMidi);
        });

        currentVoicingMidi.sort((a, b) => a - b);
        previousMidiVoicing = currentVoicingMidi;

        // Position root bass in punchy audible octave 2 (MIDI 36-47: C2 to B2, or E1 to D2)
        let rootMidiCalculated = (2 + 1) * 12 + rootPitchOffset;
        if (rootMidiCalculated < 36) rootMidiCalculated += 12; // Bring anything below E1 up to punchy E1/E2

        chordSteps.push({
            name: chordName,
            roman,
            rootMidi: rootMidiCalculated,
            notes: currentVoicingMidi.map(m => midiToPitchName(m)),
            durationBeats: 4
        });
    });

    return chordSteps;
}

// =========================================================================
// CHORD EVENTS & RHYTHM STYLES GENERATOR
// =========================================================================

export function generateChordEvents(
    chordSteps: ChordStep[],
    rhythmDieStr: string
): NoteEvent[] {
    const events: NoteEvent[] = [];
    const lower = rhythmDieStr.toLowerCase();

    const isStabs = lower.includes('stab') || lower.includes('syncopated');
    const isArp = lower.includes('arpeggiat') || lower.includes('16th');
    const isPads = lower.includes('pad') || lower.includes('whole-note');
    const isOffbeat = lower.includes('offbeat') || lower.includes('ska') || lower.includes('reggae');
    const isHalfPushes = lower.includes('half-note') || lower.includes('push');

    chordSteps.forEach((step, barIdx) => {
        const barNum = barIdx + 1;
        const vel = 88;

        if (isPads) {
            events.push({
                bar: barNum,
                beat: 1,
                note: step.name,
                chord_notes: step.notes,
                duration_beats: 4,
                velocity: vel - 15
            });
        } else if (isOffbeat) {
            [1.5, 2.5, 3.5, 4.5].forEach(beat => {
                events.push({
                    bar: barNum,
                    beat,
                    note: step.name,
                    chord_notes: step.notes,
                    duration_beats: 0.5,
                    velocity: vel
                });
            });
        } else if (isHalfPushes) {
            events.push({
                bar: barNum,
                beat: 1,
                note: step.name,
                chord_notes: step.notes,
                duration_beats: 1.5,
                velocity: vel + 4
            });
            events.push({
                bar: barNum,
                beat: 2.5,
                note: step.name,
                chord_notes: step.notes,
                duration_beats: 2.0,
                velocity: vel
            });
        } else if (isArp) {
            const numNotes = step.notes.length;
            for (let stepIdx = 0; stepIdx < 8; stepIdx++) {
                const notePitch = step.notes[stepIdx % numNotes];
                events.push({
                    bar: barNum,
                    beat: 1 + stepIdx * 0.5,
                    note: step.name,
                    chord_notes: [notePitch],
                    duration_beats: 0.5,
                    velocity: vel - (stepIdx % 2 === 0 ? 0 : 12)
                });
            }
        } else {
            events.push({
                bar: barNum,
                beat: 1,
                note: step.name,
                chord_notes: step.notes,
                duration_beats: 1.5,
                velocity: vel + 5
            });
            events.push({
                bar: barNum,
                beat: barIdx % 2 === 0 ? 3 : 2.5,
                note: step.name,
                chord_notes: step.notes,
                duration_beats: 1.5,
                velocity: vel - 2
            });
        }
    });

    return events;
}

// =========================================================================
// TOPLINE MELODY GENERATOR
// =========================================================================

const VOCAL_HOOK_WORDS = [
    ['Late', 'night', 'glow', 'on', 'tape'],
    ['Feel', 'the', 'drift', 'in', 'motion'],
    ['Spin', 'it', 'slow', 'until', 'we', 'know'],
    ['Echoes', 'fade', 'into', 'the', 'light'],
    ['Golden', 'hour', 'on', 'the', 'dash'],
    ['Hold', 'the', 'frequency', 'alive'],
    ['Midnight', 'running', 'out', 'of', 'time'],
    ['Silver', 'skies', 'above', 'the', 'room']
];

export function generateToplineMelody(
    chordSteps: ChordStep[],
    keyInfo: ParsedKeyInfo,
    vibe: VibeSettings
): NoteEvent[] {
    const events: NoteEvent[] = [];
    const scale = keyInfo.scalePitches;

    const motifDegrees = [
        keyInfo.isMinor ? 2 : 2,
        4,
        0,
        scale.length > 5 ? 5 : 4,
        keyInfo.isMinor ? 6 : 4
    ];

    const chosenHookPhrase = VOCAL_HOOK_WORDS[Math.floor(Math.random() * VOCAL_HOOK_WORDS.length)];
    let wordIdx = 0;

    const totalBars = chordSteps.length;

    for (let bar = 1; bar <= totalBars; bar++) {
        const isVariationBar = bar >= 5;
        const currentChord = chordSteps[bar - 1];
        const chordMidiNotes = currentChord.notes.map(n => pitchNameToMidi(n));
        const barInSection = ((bar - 1) % 4) + 1;

        if (barInSection === 1) {
            const deg = motifDegrees[0];
            const pitch = (4 + 1) * 12 + scale[deg % scale.length];
            events.push({
                bar,
                beat: 1,
                note: midiToPitchName(pitch),
                duration_beats: 0.75,
                velocity: 105,
                lyric_placeholder: chosenHookPhrase[wordIdx++ % chosenHookPhrase.length]
            });

            const deg2 = motifDegrees[1];
            const pitch2 = (4 + 1) * 12 + scale[deg2 % scale.length];
            events.push({
                bar,
                beat: 2,
                note: midiToPitchName(pitch2),
                duration_beats: 0.75,
                velocity: 110,
                lyric_placeholder: chosenHookPhrase[wordIdx++ % chosenHookPhrase.length]
            });

            const deg3 = isVariationBar ? (motifDegrees[3] || 5) : motifDegrees[2];
            const pitch3 = (4 + 1) * 12 + scale[deg3 % scale.length] + (isVariationBar ? 12 : 0);
            events.push({
                bar,
                beat: 3,
                note: midiToPitchName(Math.min(84, pitch3)),
                duration_beats: 1.5,
                velocity: 116,
                lyric_placeholder: chosenHookPhrase[wordIdx++ % chosenHookPhrase.length]
            });
        } else if (barInSection === 2) {
            const targetChordTone = chordMidiNotes[Math.min(1, chordMidiNotes.length - 1)] + 12;
            events.push({
                bar,
                beat: 1,
                note: midiToPitchName(Math.min(82, targetChordTone)),
                duration_beats: 1.0,
                velocity: 108,
                lyric_placeholder: chosenHookPhrase[wordIdx++ % chosenHookPhrase.length]
            });

            const stepDown = targetChordTone - 2;
            events.push({
                bar,
                beat: 2.5,
                note: midiToPitchName(stepDown),
                duration_beats: 1.5,
                velocity: 104,
                lyric_placeholder: chosenHookPhrase[wordIdx++ % chosenHookPhrase.length]
            });
        } else if (barInSection === 3) {
            const p1 = (4 + 1) * 12 + scale[motifDegrees[1] % scale.length];
            events.push({
                bar,
                beat: 1,
                note: midiToPitchName(p1),
                duration_beats: 1.0,
                velocity: 102,
                lyric_placeholder: chosenHookPhrase[wordIdx++ % chosenHookPhrase.length]
            });

            const p2 = (4 + 1) * 12 + scale[motifDegrees[0] % scale.length];
            events.push({
                bar,
                beat: 2.5,
                note: midiToPitchName(p2),
                duration_beats: 1.0,
                velocity: 98,
                lyric_placeholder: chosenHookPhrase[wordIdx++ % chosenHookPhrase.length]
            });

            if (vibe.space < 60) {
                const p3 = (4 + 1) * 12 + scale[0];
                events.push({
                    bar,
                    beat: 4,
                    note: midiToPitchName(p3),
                    duration_beats: 0.5,
                    velocity: 94,
                    lyric_placeholder: chosenHookPhrase[wordIdx++ % chosenHookPhrase.length]
                });
            }
        } else if (barInSection === 4) {
            const rootPitch = (4 + 1) * 12 + scale[0];
            events.push({
                bar,
                beat: 1,
                note: midiToPitchName(rootPitch),
                duration_beats: isVariationBar ? 3.0 : 2.0,
                velocity: 106,
                lyric_placeholder: chosenHookPhrase[wordIdx++ % chosenHookPhrase.length]
            });
        }
    }

    return events;
}

// =========================================================================
// PUNCHY POCKET BASSLINE GENERATOR (Calibrated for High Audibility)
// =========================================================================

export function generateBassline(
    chordSteps: ChordStep[],
    bassDieStr: string
): NoteEvent[] {
    const events: NoteEvent[] = [];
    const lower = bassDieStr.toLowerCase();

    const isPump = lower.includes('pump') || lower.includes('8th');
    const is808 = lower.includes('808') || lower.includes('slide') || lower.includes('sub');
    const isWalking = lower.includes('walking') || lower.includes('counter');
    const isMinimal = lower.includes('minimal') || lower.includes('silent');

    chordSteps.forEach((chord, idx) => {
        const bar = idx + 1;
        // Keep root in the punchy sweet spot: MIDI 36 to 52 (E1 to E2)
        let rootMidi = chord.rootMidi;
        while (rootMidi < 38) rootMidi += 12; // Raise sub notes below D1 so speakers reproduce them cleanly

        const velPrimary = 122; // Confident high velocity for cutting through mix

        if (isMinimal) {
            events.push({
                bar,
                beat: 1,
                note: midiToPitchName(rootMidi),
                duration_beats: 3.5,
                velocity: velPrimary
            });
        } else if (is808) {
            events.push({
                bar,
                beat: 1,
                note: midiToPitchName(rootMidi),
                duration_beats: 2.2,
                velocity: 125
            });
            events.push({
                bar,
                beat: 3.5,
                note: midiToPitchName(rootMidi + (idx % 2 === 0 ? 5 : 7)),
                duration_beats: 0.5,
                velocity: 110
            });
        } else if (isPump) {
            for (let beat = 1; beat <= 4; beat++) {
                events.push({
                    bar,
                    beat,
                    note: midiToPitchName(rootMidi),
                    duration_beats: 0.5,
                    velocity: velPrimary
                });
                events.push({
                    bar,
                    beat: beat + 0.5,
                    note: midiToPitchName(rootMidi),
                    duration_beats: 0.5,
                    velocity: 104
                });
            }
        } else if (isWalking) {
            events.push({
                bar,
                beat: 1,
                note: midiToPitchName(rootMidi),
                duration_beats: 1.0,
                velocity: velPrimary
            });
            events.push({
                bar,
                beat: 2,
                note: midiToPitchName(rootMidi + 4),
                duration_beats: 1.0,
                velocity: 112
            });
            events.push({
                bar,
                beat: 3,
                note: midiToPitchName(rootMidi + 7),
                duration_beats: 1.0,
                velocity: 116
            });
            events.push({
                bar,
                beat: 4,
                note: midiToPitchName(rootMidi + 10),
                duration_beats: 1.0,
                velocity: 108
            });
        } else {
            // Default Syncopated Pop Pocket (Strong locked downbeat hits)
            events.push({
                bar,
                beat: 1,
                note: midiToPitchName(rootMidi),
                duration_beats: 1.5,
                velocity: velPrimary
            });
            events.push({
                bar,
                beat: 3,
                note: midiToPitchName(rootMidi),
                duration_beats: 1.0,
                velocity: 115
            });
            if (idx % 2 === 1) {
                events.push({
                    bar,
                    beat: 4.5,
                    note: midiToPitchName(rootMidi + 7), // Punchy octave or 5th jump
                    duration_beats: 0.5,
                    velocity: 110
                });
            }
        }
    });

    return events;
}

// =========================================================================
// DRUM GROOVE GENERATOR
// =========================================================================

export function generateDrumGroove(
    totalBars: number,
    drumDieStr: string,
    bpm: number
): NoteEvent[] {
    const events: NoteEvent[] = [];
    const lower = drumDieStr.toLowerCase();

    const isTrap = lower.includes('trap') || lower.includes('drill');
    const isFourOnFloor = lower.includes('four-on-the-floor') || lower.includes('dance') || lower.includes('house');
    const isBreakbeat = lower.includes('breakbeat') || lower.includes('jungle');

    for (let bar = 1; bar <= totalBars; bar++) {
        const isEndFillBar = bar === totalBars || bar % 4 === 0;

        if (isFourOnFloor) {
            [1, 2, 3, 4].forEach(beat => {
                events.push({ bar, beat, piece: 'kick', duration_beats: 0.5, velocity: 120 });
            });
            [2, 4].forEach(beat => {
                events.push({ bar, beat, piece: 'clap', duration_beats: 0.5, velocity: 112 });
            });
            [1.5, 2.5, 3.5, 4.5].forEach(beat => {
                events.push({ bar, beat, piece: 'openhat', duration_beats: 0.5, velocity: 85 });
            });
        } else if (isTrap) {
            events.push({ bar, beat: 1, piece: 'kick', duration_beats: 0.5, velocity: 122 });
            events.push({ bar, beat: bar % 2 === 1 ? 3 : 2.5, piece: 'kick', duration_beats: 0.5, velocity: 115 });
            if (bar % 2 === 0) {
                events.push({ bar, beat: 3.75, piece: 'kick', duration_beats: 0.25, velocity: 105 });
            }
            events.push({ bar, beat: 3, piece: 'snare', duration_beats: 0.5, velocity: 120 });

            for (let b = 1; b <= 4; b += 0.5) {
                events.push({ bar, beat: b, piece: 'hat', duration_beats: 0.25, velocity: b % 1 === 0 ? 82 : 68 });
            }
            if (isEndFillBar) {
                events.push({ bar, beat: 4.25, piece: 'hat', duration_beats: 0.25, velocity: 90 });
                events.push({ bar, beat: 4.5, piece: 'hat', duration_beats: 0.25, velocity: 95 });
                events.push({ bar, beat: 4.75, piece: 'hat', duration_beats: 0.25, velocity: 100 });
            }
        } else if (isBreakbeat) {
            events.push({ bar, beat: 1, piece: 'kick', duration_beats: 0.5, velocity: 120 });
            events.push({ bar, beat: 2, piece: 'snare', duration_beats: 0.5, velocity: 110 });
            events.push({ bar, beat: 2.75, piece: 'kick', duration_beats: 0.25, velocity: 105 });
            events.push({ bar, beat: 3.5, piece: 'kick', duration_beats: 0.5, velocity: 115 });
            events.push({ bar, beat: 4, piece: 'snare', duration_beats: 0.5, velocity: 115 });
            [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5].forEach(b => {
                events.push({ bar, beat: b, piece: 'hat', duration_beats: 0.25, velocity: 74 });
            });
        } else {
            events.push({ bar, beat: 1, piece: 'kick', duration_beats: 0.5, velocity: 118 });
            events.push({ bar, beat: 2, piece: 'snare', duration_beats: 0.5, velocity: 108 });
            events.push({ bar, beat: bar % 2 === 1 ? 3 : 3.5, piece: 'kick', duration_beats: 0.5, velocity: 114 });
            if (bar % 2 === 0) {
                events.push({ bar, beat: 2.75, piece: 'kick', duration_beats: 0.25, velocity: 92 });
            }
            events.push({ bar, beat: 4, piece: 'snare', duration_beats: 0.5, velocity: 110 });

            [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5].forEach(b => {
                events.push({
                    bar,
                    beat: b,
                    piece: 'hat',
                    duration_beats: 0.25,
                    velocity: b % 1 === 0 ? 80 : 64
                });
            });

            if (isEndFillBar) {
                events.push({ bar, beat: 4.5, piece: 'crash', duration_beats: 1.0, velocity: 112 });
            }
        }
    }

    return events;
}

export function generateAmbientPadEvents(chordSteps: ChordStep[]): NoteEvent[] {
    const events: NoteEvent[] = [];
    chordSteps.forEach((step, idx) => {
        const bar = idx + 1;
        events.push({
            bar,
            beat: 1,
            note: step.name,
            chord_notes: step.notes,
            duration_beats: 4,
            velocity: 64
        });
    });
    return events;
}

const TITLE_PREFIXES = [
    'Velvet', 'Midnight', 'Neon', 'Echo', 'Analog', 'Golden', 'Silver',
    'Ghost', 'Subway', 'Static', 'Tape', 'Sunlight', 'Prism', 'Drift',
    'Low-Fi', 'Haze', 'Obsidian', 'Aura', 'Retrograde', 'Mirage'
];

const TITLE_SUFFIXES = [
    'Tape Reel', 'Solstice', 'Echoes', 'Drive', 'Frequency', 'Horizon',
    'Vibe', 'Memories', 'Sketches', 'Lover', 'Sessions', 'Starlight',
    'Groove', 'Currents', 'Cascade', 'Pulse', 'Overdrive', 'Breeze'
];

function generateEvocativeTitle(keyName: string, genreDie?: string): string {
    const p = TITLE_PREFIXES[Math.floor(Math.random() * TITLE_PREFIXES.length)];
    const s = TITLE_SUFFIXES[Math.floor(Math.random() * TITLE_SUFFIXES.length)];
    return `${p} ${s}`;
}

export function composeProceduralArrangement(
    dice: DieState[],
    vibe: VibeSettings,
    refineInstruction?: string
): Arrangement {
    const keyDie = dice.find(d => d.category === 'Key / Mode')?.value || 'A Minor / Aeolian';
    const tempoDie = dice.find(d => d.category === 'Tempo & Feel')?.value || '94 BPM';
    const chordDie = dice.find(d => d.category === 'Chord Progression')?.value || 'vi – IV – I – V';
    const rhythmDie = dice.find(d => d.category === 'Chord Rhythm')?.value || 'Syncopated 8th-note Stabs';
    const bassDie = dice.find(d => d.category === 'Bassline')?.value || 'Syncopated Pop Pocket';
    const drumDie = dice.find(d => d.category === 'Drum Groove')?.value || 'Boom-Bap Dusty Vinyl Pocket';
    const genreDie = dice.find(d => d.category === 'Vibe / Genre')?.value || 'Bedroom Indie Pop';

    const bpmMatch = tempoDie.match(/(\d+)/);
    const bpm = bpmMatch ? parseInt(bpmMatch[1], 10) : 94;

    const keyInfo = parseKeyAndMode(keyDie);
    const totalBars = 8;

    const chordSteps = buildProceduralChordProgression(chordDie, keyInfo, totalBars, vibe.complexity);

    const chordEvents = generateChordEvents(chordSteps, rhythmDie);
    const melodyEvents = generateToplineMelody(chordSteps, keyInfo, vibe);
    const bassEvents = generateBassline(chordSteps, bassDie);
    const drumEvents = generateDrumGroove(totalBars, drumDie, bpm);
    const padEvents = generateAmbientPadEvents(chordSteps);

    const title = generateEvocativeTitle(keyInfo.rootName, genreDie);
    const primaryChordNames = chordSteps.slice(0, 4).map(c => c.name).join(' → ');
    const logline = `A dynamic ${keyInfo.rootName} ${keyInfo.mode} sketch built around a ${primaryChordNames} harmonic progression at ${bpm} BPM.`;

    const cleanKey = keyInfo.rootName.replace(/[^a-zA-Z0-9]/g, '');
    const seedCode = `SD-${bpm}BPM-${cleanKey}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    return {
        title_working: title,
        logline,
        key: `${keyInfo.rootName} ${keyInfo.mode.toLowerCase()}`,
        mode: keyInfo.mode,
        bpm,
        time_signature: '4/4',
        swing: tempoDie.toLowerCase().includes('swing') ? 0.15 : 0.08,
        form: ['Hook Loop (8 Bars)'],
        bars_total: totalBars,
        chords: chordEvents,
        melody: melodyEvents,
        bass: bassEvents,
        drums: drumEvents,
        pad: padEvents,
        arrangement_notes: `Layer warm electric piano and Juno pad on chords. Glue low end around 100Hz with kick and sidechain compressor.`,
        hook_reason: `The melody uses stepwise motion anchored on the ${keyInfo.isMinor ? 'minor 3rd' : 'major 3rd'} with an octave leap on bar 2 to create instant emotional payoff.`,
        vocal_range_suggestion: `Comfortable for vocalists (range ${keyInfo.rootName}3 to ${keyInfo.rootName}5). Wide stereo space left in the 1kHz-3kHz vocal pocket.`,
        next_moves: [
            '1. Export Multitrack MIDI and drop onto 4 instrument tracks in your DAW.',
            '2. Record a scratch vocal take over the 8-bar hook topline.',
            '3. Duplicate bars 1-8 to build the verse-chorus arrangement.'
        ],
        scratch_lyric_hook: melodyEvents.filter(e => e.lyric_placeholder).slice(0, 5).map(e => e.lyric_placeholder).join(' '),
        seedCode,
        createdAt: Date.now()
    };
}
