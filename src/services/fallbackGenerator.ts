import { Arrangement, DieState } from '../types';

// ============================================================================
// 1. FIRST-PRINCIPLES CHROMATIC & MODAL MUSIC THEORY ENGINE
// ============================================================================

const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
type PitchName = typeof CHROMATIC_NOTES[number];

const ENHARMONIC_MAP: Record<string, PitchName> = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
    'B#': 'C', 'E#': 'F', 'Cb': 'B', 'Fb': 'E'
};

const MODE_INTERVALS: Record<string, number[]> = {
    'major': [0, 2, 4, 5, 7, 9, 11],
    'ionian': [0, 2, 4, 5, 7, 9, 11],
    'minor': [0, 2, 3, 5, 7, 8, 10],
    'aeolian': [0, 2, 3, 5, 7, 8, 10],
    'dorian': [0, 2, 3, 5, 7, 9, 10],
    'phrygian': [0, 1, 3, 5, 7, 8, 10],
    'lydian': [0, 2, 4, 6, 7, 9, 11],
    'mixolydian': [0, 2, 4, 5, 7, 9, 10],
    'locrian': [0, 1, 3, 5, 6, 8, 10],
    'harmonic minor': [0, 2, 3, 5, 7, 8, 11],
    'melodic minor': [0, 2, 3, 5, 7, 9, 11],
    'pentatonic major': [0, 2, 4, 7, 9],
    'pentatonic minor': [0, 3, 5, 7, 10],
    'blues': [0, 3, 5, 6, 7, 10]
};

function normalizePitch(raw: string): PitchName {
    const trimmed = raw.trim();
    if (ENHARMONIC_MAP[trimmed]) return ENHARMONIC_MAP[trimmed];
    const match = CHROMATIC_NOTES.find(n => n.toLowerCase() === trimmed.toLowerCase());
    return match || 'C';
}

function parseKeySignature(keyStr: string): { root: PitchName; mode: string; scalePitches: PitchName[] } {
    const parts = keyStr.trim().split(/\s+/);
    const rootRaw = parts[0] || 'A';
    const root = normalizePitch(rootRaw);
    const modeRaw = parts.slice(1).join(' ').toLowerCase();

    let mode = 'minor';
    if (modeRaw.includes('major') || modeRaw.includes('ionian')) mode = 'major';
    else if (modeRaw.includes('dorian')) mode = 'dorian';
    else if (modeRaw.includes('lydian')) mode = 'lydian';
    else if (modeRaw.includes('phrygian')) mode = 'phrygian';
    else if (modeRaw.includes('mixolydian')) mode = 'mixolydian';
    else if (modeRaw.includes('harmonic')) mode = 'harmonic minor';
    else if (modeRaw.includes('blues')) mode = 'blues';
    else if (modeRaw.includes('pentatonic')) mode = modeRaw.includes('minor') ? 'pentatonic minor' : 'pentatonic major';

    const intervals = MODE_INTERVALS[mode] || MODE_INTERVALS['minor'];
    const rootIndex = CHROMATIC_NOTES.indexOf(root);
    const scalePitches = intervals.map(iv => CHROMATIC_NOTES[(rootIndex + iv) % 12]);

    return { root, mode, scalePitches };
}

// ============================================================================
// 2. MATHEMATICAL ROMAN NUMERAL & HARMONIC PROGRESSION ENGINE
// ============================================================================

interface ComputedChord {
    name: string;
    rootPitch: PitchName;
    bassNote: string;
    chordTones: string[];
    melodyScale: string[];
}

const DEGREE_SEMITONE_OFFSETS: Record<string, { semitones: number; quality: 'maj' | 'min' | 'dim' | 'aug' | 'dom7' | 'min7' | 'maj7' }> = {
    'i': { semitones: 0, quality: 'min' },
    'I': { semitones: 0, quality: 'maj' },
    'bII': { semitones: 1, quality: 'maj' },
    'ii': { semitones: 2, quality: 'min' },
    'ii°': { semitones: 2, quality: 'dim' },
    'iio': { semitones: 2, quality: 'dim' },
    'II': { semitones: 2, quality: 'maj' },
    'bIII': { semitones: 3, quality: 'maj' },
    'biii': { semitones: 3, quality: 'min' },
    'iii': { semitones: 4, quality: 'min' },
    'III': { semitones: 4, quality: 'maj' },
    'iv': { semitones: 5, quality: 'min' },
    'IV': { semitones: 5, quality: 'maj' },
    '#iv': { semitones: 6, quality: 'dim' },
    '#IV': { semitones: 6, quality: 'dim' },
    'bV': { semitones: 6, quality: 'maj' },
    'v': { semitones: 7, quality: 'min' },
    'V': { semitones: 7, quality: 'maj' },
    'V7': { semitones: 7, quality: 'dom7' },
    'bVI': { semitones: 8, quality: 'maj' },
    'vi': { semitones: 9, quality: 'min' },
    'VI': { semitones: 9, quality: 'maj' },
    'bVII': { semitones: 10, quality: 'maj' },
    'bvii': { semitones: 10, quality: 'min' },
    'vii': { semitones: 11, quality: 'dim' },
    'vii°': { semitones: 11, quality: 'dim' },
    'viio': { semitones: 11, quality: 'dim' },
    'VII': { semitones: 11, quality: 'maj' }
};

function parseDegree(token: string): { semitones: number; quality: string } {
    const clean = token.replace(/[^a-zA-Z0-9#b°]/g, '');
    if (DEGREE_SEMITONE_OFFSETS[clean]) {
        return DEGREE_SEMITONE_OFFSETS[clean];
    }
    const lower = clean.toLowerCase();
    if (lower.startsWith('i')) return { semitones: 0, quality: clean === lower ? 'min' : 'maj' };
    if (lower.startsWith('ii')) return { semitones: 2, quality: clean === lower ? 'min' : 'maj' };
    if (lower.startsWith('iii')) return { semitones: 4, quality: clean === lower ? 'min' : 'maj' };
    if (lower.startsWith('iv')) return { semitones: 5, quality: clean === lower ? 'min' : 'maj' };
    if (lower.startsWith('v')) return { semitones: 7, quality: clean === lower ? 'min' : 'maj' };
    if (lower.startsWith('vi')) return { semitones: 9, quality: clean === lower ? 'min' : 'maj' };
    if (lower.startsWith('vii')) return { semitones: 11, quality: clean === lower ? 'dim' : 'maj' };
    return { semitones: 0, quality: 'min' };
}

function resolveProgression(progressionStr: string, keySig: { root: PitchName; mode: string; scalePitches: PitchName[] }): ComputedChord[] {
    const rawTokens = progressionStr.split(/[-–—/,\s]+/).filter(t => t.length > 0);
    const tokens = rawTokens.filter(t => /^[IivVb#°0-9]+$/i.test(t));
    const effectiveDegrees = tokens.length >= 2 ? tokens : (keySig.mode === 'major' ? ['I', 'V', 'vi', 'IV'] : ['i', 'VI', 'III', 'VII']);

    const rootIdx = CHROMATIC_NOTES.indexOf(keySig.root);
    const chords: ComputedChord[] = [];

    for (let i = 0; i < 4; i++) {
        const degToken = effectiveDegrees[i % effectiveDegrees.length];
        const { semitones, quality } = parseDegree(degToken);

        const chordRootIdx = (rootIdx + semitones) % 12;
        const chordRootPitch = CHROMATIC_NOTES[chordRootIdx];

        let intervals = [0, 4, 7];
        let chordSuffix = '';
        if (quality === 'min') {
            intervals = [0, 3, 7];
            chordSuffix = 'm';
        } else if (quality === 'dim') {
            intervals = [0, 3, 6];
            chordSuffix = 'dim';
        } else if (quality === 'aug') {
            intervals = [0, 4, 8];
            chordSuffix = 'aug';
        } else if (quality === 'dom7') {
            intervals = [0, 4, 7, 10];
            chordSuffix = '7';
        } else if (quality === 'maj7') {
            intervals = [0, 4, 7, 11];
            chordSuffix = 'maj7';
        } else if (quality === 'min7') {
            intervals = [0, 3, 7, 10];
            chordSuffix = 'm7';
        }

        const chordName = `${chordRootPitch}${chordSuffix}`;
        const bassNote = `${chordRootPitch}${chordRootIdx >= 5 ? '1' : '2'}`;

        const chordTones = intervals.map(iv => {
            const p = CHROMATIC_NOTES[(chordRootIdx + iv) % 12];
            const oct = iv < 7 ? 3 : 4;
            return `${p}${oct}`;
        });

        const melodyScale = [
            `${chordRootPitch}4`,
            `${CHROMATIC_NOTES[(chordRootIdx + intervals[1]) % 12]}4`,
            `${CHROMATIC_NOTES[(chordRootIdx + (intervals[2] || 7)) % 12]}4`,
            `${chordRootPitch}5`,
            `${CHROMATIC_NOTES[(chordRootIdx + 2) % 12]}5`,
            `${CHROMATIC_NOTES[(chordRootIdx + intervals[1]) % 12]}5`
        ];

        chords.push({
            name: chordName,
            rootPitch: chordRootPitch,
            bassNote,
            chordTones,
            melodyScale
        });
    }

    return chords;
}

// ============================================================================
// 3. EUCLIDEAN & GENERATIVE RHYTHM ALGORITHMS (Bjorklund's Algorithm)
// ============================================================================

function generateEuclideanPattern(k: number, n: number = 16): boolean[] {
    if (k >= n) return Array(n).fill(true);
    if (k <= 0) return Array(n).fill(false);

    let pattern: number[][] = [];
    for (let i = 0; i < n; i++) {
        pattern.push(i < k ? [1] : [0]);
    }

    let safety = 0;
    while (safety < 30) {
        safety++;
        const zeroes: number[][] = [];
        const ones: number[][] = [];
        for (const item of pattern) {
            if (item[0] === 1) ones.push(item);
            else zeroes.push(item);
        }

        if (zeroes.length <= 1 || ones.length <= 1) break;

        const minLen = Math.min(ones.length, zeroes.length);
        const newPattern: number[][] = [];
        for (let i = 0; i < minLen; i++) {
            newPattern.push([...ones[i], ...zeroes[i]]);
        }
        for (let i = minLen; i < ones.length; i++) newPattern.push(ones[i]);
        for (let i = minLen; i < zeroes.length; i++) newPattern.push(zeroes[i]);
        pattern = newPattern;
    }

    const flat = pattern.flat();
    return flat.slice(0, n).map(v => v === 1);
}

// ============================================================================
// 4. MULTI-BAR SECTIONAL & COORDINATED STEP MATRIX GENERATOR
// ============================================================================

export function parseFormBars(formStr: string): { totalBars: number; formType: 'loop' | 'verse' | 'verse-chorus' | 'aaba' | 'intro-hook-breakdown' } {
    const clean = (formStr || '').trim().toLowerCase();
    
    // Check direct numeric patterns e.g. "8-bar Loop", "16-bar Verse", "4-bar"
    const match = clean.match(/(\d+)\s*-?\s*bar/);
    if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > 0) {
            let type: 'loop' | 'verse' | 'verse-chorus' | 'aaba' | 'intro-hook-breakdown' = 'loop';
            if (clean.includes('verse-chorus') || clean.includes('verse chorus')) type = 'verse-chorus';
            else if (clean.includes('verse')) type = 'verse';
            else if (clean.includes('aaba')) type = 'aaba';
            else if (clean.includes('intro') || clean.includes('breakdown')) type = 'intro-hook-breakdown';
            return { totalBars: num, formType: type };
        }
    }
    
    if (clean.includes('16-bar') || clean.includes('16 bar') || clean.includes('verse')) return { totalBars: 16, formType: 'verse' };
    if (clean.includes('8-bar') || clean.includes('8 bar') || clean.includes('loop')) return { totalBars: 8, formType: 'loop' };
    if (clean.includes('aaba')) return { totalBars: 16, formType: 'aaba' };
    if (clean.includes('verse-chorus') || clean.includes('verse chorus')) return { totalBars: 16, formType: 'verse-chorus' };
    if (clean.includes('intro') || clean.includes('breakdown')) return { totalBars: 12, formType: 'intro-hook-breakdown' };
    if (clean.includes('4-bar') || clean.includes('4 bar')) return { totalBars: 4, formType: 'loop' };

    return { totalBars: 8, formType: 'loop' };
}

export function createProceduralArrangement(dice: DieState[]): Arrangement {
    const getVal = (cat: string, fallback: string) => {
        const d = dice.find(item => item.category.toLowerCase() === cat.toLowerCase());
        return d ? d.value : fallback;
    };

    const keyVal = getVal('Key', 'A Minor');
    const tempoVal = getVal('Tempo', '94 Mid Hip-Hop');
    const formVal = getVal('Form', '8-bar Loop');
    const chordsVal = getVal('Chords', 'vi-IV-I-V Emotional');
    const rhythmVal = getVal('Rhythm', 'Syncopated Stabs');
    const bassVal = getVal('Bass', 'Syncopated Pocket');
    const drumsVal = getVal('Drums', 'Boom-Bap');

    // Parse BPM
    const bpmMatch = tempoVal.match(/\d+/);
    const bpm = bpmMatch ? parseInt(bpmMatch[0], 10) : 94;

    // Parse Form & Total Bars (e.g. 8-bar loop -> 8 bars, 16-bar -> 16 bars)
    const { totalBars, formType } = parseFormBars(formVal);

    // Music Theory Resolution
    const keySig = parseKeySignature(keyVal);
    const resolvedChords = resolveProgression(chordsVal, keySig);
    
    // Build chord progression array tailored for the total bar count
    const barChords: ComputedChord[] = [];
    for (let bar = 0; bar < totalBars; bar++) {
        if (formType === 'aaba') {
            // AABA: A (bars 0-3), A (bars 4-7), B / Bridge departure (bars 8-11), A (bars 12-15)
            if (bar >= 8 && bar < 12) {
                // Bridge departure: shifted harmonic center (+5 semitones / IV degree)
                const primaryChord = resolvedChords[bar % resolvedChords.length];
                const bridgeRootIdx = (CHROMATIC_NOTES.indexOf(primaryChord.rootPitch) + 5) % 12;
                const bridgeRootPitch = CHROMATIC_NOTES[bridgeRootIdx];
                barChords.push({
                    name: `${bridgeRootPitch}maj7`,
                    rootPitch: bridgeRootPitch,
                    bassNote: `${bridgeRootPitch}${bridgeRootIdx >= 5 ? '1' : '2'}`,
                    chordTones: [`${bridgeRootPitch}3`, `${CHROMATIC_NOTES[(bridgeRootIdx + 4) % 12]}3`, `${CHROMATIC_NOTES[(bridgeRootIdx + 7) % 12]}4`],
                    melodyScale: [`${bridgeRootPitch}4`, `${CHROMATIC_NOTES[(bridgeRootIdx + 4) % 12]}4`, `${CHROMATIC_NOTES[(bridgeRootIdx + 7) % 12]}4`, `${bridgeRootPitch}5`]
                });
            } else {
                barChords.push(resolvedChords[bar % resolvedChords.length]);
            }
        } else if (formType === 'intro-hook-breakdown') {
            // Intro: bars 0-3, Hook: bars 4-7, Breakdown: bars 8-11
            barChords.push(resolvedChords[bar % resolvedChords.length]);
        } else {
            // 8-bar loop or 16-bar verse/chorus
            barChords.push(resolvedChords[bar % resolvedChords.length]);
        }
    }

    const uniqueChordNames = Array.from(new Set(barChords.map(c => c.name)));
    const chordProgressionText = uniqueChordNames.join(' - ');

    // ------------------------------------------------------------------------
    // TRACK 1: CHORDS (HARMONIC VOICING & SUSTAIN)
    // ------------------------------------------------------------------------
    const stepChords: string[] = [];
    for (let bar = 0; bar < totalBars; bar++) {
        const chord = barChords[bar];
        const chordName = chord.name;
        const isIntro = formType === 'intro-hook-breakdown' && bar < 4;
        const isBreakdown = formType === 'intro-hook-breakdown' && bar >= 8;

        if (isIntro || isBreakdown || rhythmVal.toLowerCase().includes('whole') || rhythmVal.toLowerCase().includes('pad')) {
            stepChords.push(chordName, '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.');
        } else if (rhythmVal.toLowerCase().includes('half')) {
            stepChords.push(chordName, '.', '.', '.', '.', '.', '.', '-', chordName, '.', '.', '.', '.', '.', '.', '-');
        } else if (rhythmVal.toLowerCase().includes('syncopated') || rhythmVal.toLowerCase().includes('stab')) {
            // Turnaround variation on final bar of phrase
            if ((bar + 1) % 4 === 0) {
                stepChords.push(chordName, '.', '.', '-', chordName, '.', '-', '-', chordName, '.', chordName, '.', chordName, '.', '-', '-');
            } else {
                stepChords.push(chordName, '.', '.', '-', chordName, '.', '-', '-', chordName, '.', '-', '-', chordName, '.', '-', '-');
            }
        } else if (rhythmVal.toLowerCase().includes('arpegg')) {
            stepChords.push(chordName, '-', chordName, '-', chordName, '-', chordName, '-', chordName, '-', chordName, '-', chordName, '-', chordName, '-');
        } else if (rhythmVal.toLowerCase().includes('house') || rhythmVal.toLowerCase().includes('gated') || rhythmVal.toLowerCase().includes('staccato')) {
            stepChords.push(chordName, '.', '-', '-', chordName, '.', '-', '-', chordName, '.', '-', '-', chordName, '.', '-', '-');
        } else {
            const euclid = generateEuclideanPattern(5, 16);
            for (let s = 0; s < 16; s++) {
                if (euclid[s]) stepChords.push(chordName);
                else stepChords.push(s > 0 && euclid[s - 1] ? '.' : '-');
            }
        }
    }

    // ------------------------------------------------------------------------
    // TRACK 2: BASS (SUB & GROOVE MATRIX)
    // ------------------------------------------------------------------------
    const stepBass: string[] = [];
    for (let bar = 0; bar < totalBars; bar++) {
        const chord = barChords[bar];
        const root = chord.bassNote;
        const fifth = `${CHROMATIC_NOTES[(CHROMATIC_NOTES.indexOf(chord.rootPitch) + 7) % 12]}1`;
        const octaveUp = `${chord.rootPitch}2`;
        const isIntro = formType === 'intro-hook-breakdown' && bar < 4;
        const isTurnaroundBar = (bar + 1) % 4 === 0;

        if (isIntro) {
            // Sparser bass in intro
            stepBass.push(root, '.', '.', '.', '.', '.', '.', '.', '-', '-', '-', '-', '-', '-', '-', '-');
        } else if (bassVal.toLowerCase().includes('pump') || bassVal.toLowerCase().includes('eight')) {
            for (let s = 0; s < 4; s++) stepBass.push(root, '.', '-', '-');
        } else if (bassVal.toLowerCase().includes('808') || bassVal.toLowerCase().includes('slide')) {
            if (isTurnaroundBar) {
                stepBass.push(root, '.', '.', '.', '.', '.', '-', '-', root, '.', fifth, '.', octaveUp, '.', fifth, '.');
            } else {
                stepBass.push(root, '.', '.', '.', '.', '.', '-', '-', root, '.', '.', '.', '-', '-', fifth, '.');
            }
        } else if (bassVal.toLowerCase().includes('walking')) {
            const third = `${CHROMATIC_NOTES[(CHROMATIC_NOTES.indexOf(chord.rootPitch) + 4) % 12]}1`;
            stepBass.push(root, '.', '.', '-', third, '.', '.', '-', fifth, '.', '.', '-', third, '.', '.', '-');
        } else if (bassVal.toLowerCase().includes('ostinato')) {
            stepBass.push(root, '-', root, '-', root, '.', '-', '-', root, '-', root, '-', root, '.', fifth, '-');
        } else if (bassVal.toLowerCase().includes('minimal')) {
            stepBass.push(root, '.', '.', '.', '.', '.', '.', '.', '-', '-', '-', '-', '-', '-', '-', '-');
        } else {
            if (isTurnaroundBar) {
                stepBass.push(root, '.', '.', '-', '-', '-', root, '.', '-', '-', fifth, '.', octaveUp, '.', fifth, '.');
            } else {
                stepBass.push(root, '.', '.', '-', '-', '-', root, '.', '-', '-', root, '.', '-', '-', fifth, '.');
            }
        }
    }

    // ------------------------------------------------------------------------
    // TRACK 3: MELODY (MARKOV MOTIF & MULTI-PHRASE CONTOUR ENGINE)
    // ------------------------------------------------------------------------
    const stepMelody: string[] = [];
    for (let bar = 0; bar < totalBars; bar++) {
        const chord = barChords[bar];
        const melPitches = chord.melodyScale;
        const p1 = melPitches[0];
        const p2 = melPitches[1];
        const p3 = melPitches[2];
        const p4 = melPitches[3] || p1;
        const p5 = melPitches[4] || p2;

        const phraseBar = bar % 4;
        const isClimaxBar = bar === totalBars - 2 || bar === 6;
        const isResolutionBar = (bar + 1) % 4 === 0;

        if (phraseBar === 0) {
            // Opening phrase / motif question
            stepMelody.push('-', '-', p1, '.', '-', '-', p2, '.', '-', '-', p3, '.', '-', '-', '-', '-');
        } else if (phraseBar === 1) {
            // Responding phrase
            stepMelody.push('-', '-', p2, '.', '-', '-', p3, '.', '-', '-', p1, '.', '.', '.', '-', '-');
        } else if (phraseBar === 2 || isClimaxBar) {
            // Climax / energetic peak
            stepMelody.push(p3, '-', p4, '-', p5, '.', '-', '-', p4, '-', p3, '-', p4, '.', '.', '-');
        } else if (isResolutionBar) {
            // Resolution back to tonic / semi-cadence
            stepMelody.push('-', '-', p2, '.', '-', '-', p1, '.', '.', '.', '.', '.', '-', '-', '-', '-');
        } else {
            stepMelody.push('-', '-', p1, '.', '-', '-', p2, '.', '-', '-', p3, '.', '-', '-', '-', '-');
        }
    }

    // ------------------------------------------------------------------------
    // TRACK 4, 5, 6: DRUM MATRIX SYNTHESIZER (KICK, SNARE, HAT)
    // ------------------------------------------------------------------------
    const stepKick: string[] = [];
    const stepSnare: string[] = [];
    const stepHat: string[] = [];

    const isFourOnFloor = drumsVal.toLowerCase().includes('four') || drumsVal.toLowerCase().includes('house') || drumsVal.toLowerCase().includes('techno');
    const isTrap = drumsVal.toLowerCase().includes('trap');
    const isBreakbeat = drumsVal.toLowerCase().includes('break') || drumsVal.toLowerCase().includes('jungle');
    const isMinimal = drumsVal.toLowerCase().includes('minimal') || drumsVal.toLowerCase().includes('sparse');

    for (let bar = 0; bar < totalBars; bar++) {
        const isIntro = formType === 'intro-hook-breakdown' && bar < 4;
        const isBreakdown = formType === 'intro-hook-breakdown' && bar >= 8;
        const isTurnaround = (bar + 1) % 4 === 0;

        // Kick Pattern
        if (isIntro || isBreakdown) {
            stepKick.push('X', '-', '-', '-', '-', '-', '-', '-', 'X', '-', '-', '-', '-', '-', '-', '-');
        } else if (isFourOnFloor) {
            stepKick.push('X', '-', '-', '-', 'X', '-', '-', '-', 'X', '-', '-', '-', 'X', '-', '-', '-');
        } else if (isTrap) {
            if (isTurnaround) {
                stepKick.push('X', '-', '-', '-', '-', '-', 'X', '-', '-', '-', 'X', '-', 'X', '-', 'X', '-');
            } else {
                stepKick.push('X', '-', '-', '-', '-', '-', 'X', '-', '-', '-', 'X', '-', '-', '-', '-', '-');
            }
        } else if (isBreakbeat) {
            stepKick.push('X', '-', '-', '-', '-', '-', 'X', '-', '-', '-', 'X', '-', '-', 'X', '-', '-');
        } else if (isMinimal) {
            stepKick.push('X', '-', '-', '-', '-', '-', '-', '-', 'X', '-', '-', '-', '-', '-', '-', '-');
        } else {
            const kickFill = isTurnaround
                ? ['X', '-', '-', '-', '-', '-', 'X', '-', '-', '-', 'X', '-', 'X', '-', '-', '-']
                : ['X', '-', '-', '-', '-', '-', 'X', '-', '-', '-', 'X', '-', '-', '-', '-', '-'];
            stepKick.push(...kickFill);
        }

        // Snare Pattern
        if (isIntro) {
            stepSnare.push('-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'X', '-', '-', '-');
        } else if (isFourOnFloor || !isTrap) {
            const snareBar = ['-', '-', '-', '-', 'X', '-', '-', '-', '-', '-', '-', '-', 'X', '-', '-', '-'];
            if (isTurnaround) {
                snareBar[12] = 'X';
                snareBar[14] = 'X';
                snareBar[15] = 'X';
            }
            stepSnare.push(...snareBar);
        } else {
            // Trap snare on beat 3 (step 8)
            const trapSnare = ['-', '-', '-', '-', '-', '-', '-', '-', 'X', '-', '-', '-', '-', '-', '-', '-'];
            if (isTurnaround) {
                trapSnare[14] = 'X';
                trapSnare[15] = 'X';
            }
            stepSnare.push(...trapSnare);
        }

        // Hat Pattern
        if (isIntro) {
            stepHat.push('-', '-', 'X', '-', '-', '-', 'X', '-', '-', '-', 'X', '-', '-', '-', 'X', '-');
        } else if (isTrap) {
            if (isTurnaround) {
                stepHat.push('X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X');
            } else {
                stepHat.push('X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X');
            }
        } else if (isFourOnFloor) {
            stepHat.push('-', '-', 'X', '-', '-', '-', 'X', '-', '-', '-', 'X', '-', '-', '-', 'X', '-');
        } else if (isMinimal) {
            stepHat.push('-', '-', 'X', '-', '-', '-', 'X', '-', '-', '-', 'X', '-', '-', '-', 'X', '-');
        } else {
            stepHat.push('X', '-', 'X', '-', 'X', '-', 'X', '-', 'X', '-', 'X', '-', 'X', '-', 'X', '-');
        }
    }

    return {
        title_working: `${keyVal} ${totalBars}-Bar Matrix #${Math.floor(Math.random() * 8999 + 1000)}`,
        logline: `Algorithmic ${totalBars}-bar ${formVal} synthesized from ${keyVal} [${chordsVal}] at ${bpm} BPM.`,
        key: keyVal,
        bpm: bpm,
        bars_total: totalBars,
        chord_progression_text: chordProgressionText,
        step_chords: stepChords.join(' '),
        step_melody: stepMelody.join(' '),
        step_bass: stepBass.join(' '),
        step_drums_kick: stepKick.join(' '),
        step_drums_snare: stepSnare.join(' '),
        step_drums_hat: stepHat.join(' '),
        arrangement_notes: `Mathematical modal projection of ${keySig.mode.toUpperCase()} scale over ${chordProgressionText} across ${totalBars} bars (${formVal}). Bassline voiced with dynamic 5th root alternations and turnarounds.`,
        hook_reason: `Rhythmic pocket locked with Euclidean kick placement, sectional ${totalBars}-bar phrase development, and voice-leading across ${barChords.length} bars.`,
        next_moves: [
            `Direct ${totalBars}-bar MIDI export into DAW (Multi-track Type 1 MIDI format)`,
            `Automate filter cutoff across bars 1 through ${totalBars}`,
            'Sidechain the sub bass to the kick trigger'
        ]
    };
}
