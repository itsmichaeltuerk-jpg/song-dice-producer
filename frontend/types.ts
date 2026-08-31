export type DieCategory = 
    | 'Key / Mode'
    | 'Tempo & Feel'
    | 'Structure'
    | 'Chord Progression'
    | 'Chord Rhythm'
    | 'Bassline'
    | 'Drum Groove'
    | 'Melody Contour'
    | 'Vibe / Genre'
    | 'Arrangement Density';

export type ProducerEngine = 'gemini' | 'procedural';

export interface DieOption {
    value: string;
    description?: string;
    meta?: string;
}

export interface DieState {
    id: string;
    category: DieCategory;
    shortLabel: string;
    value: string;
    isLocked: boolean;
    isOptional?: boolean;
    isEnabled?: boolean;
    options: string[];
    description?: string;
}

export interface NoteEvent {
    bar: number;           // 1-indexed bar
    beat: number;          // 1.0 to 4.0 in 4/4 (supports fractions like 1.5, 2.75 for 8ths & 16ths)
    note?: string;         // Scientific pitch notation e.g. "C4", "A#3", "E5" or chord name "Am7"
    chord_notes?: string[]; // Polyphonic breakdown e.g. ["A3", "C4", "E4", "G4"]
    duration_beats: number; // e.g. 0.5 (8th), 1.0 (quarter), 2.0 (half), 4.0 (whole)
    velocity?: number;     // 0-127
    piece?: 'kick' | 'snare' | 'clap' | 'hat' | 'openhat' | 'tom' | 'crash' | 'shaker';
    lyric_placeholder?: string;
}

export interface Arrangement {
    title_working: string;
    logline: string;
    key: string;
    mode: string;
    bpm: number;
    time_signature: string;
    swing: number; // 0.0 to 0.5
    form: string[];
    bars_total: number;
    chords: NoteEvent[];
    melody: NoteEvent[];
    bass: NoteEvent[];
    drums: NoteEvent[];
    pad?: NoteEvent[];
    arrangement_notes: string;
    hook_reason: string;
    vocal_range_suggestion: string;
    next_moves: string[];
    scratch_lyric_hook?: string;
    seedCode: string;
    createdAt: number;
    engineUsed?: ProducerEngine;
}

export type StemTrack = 'melody' | 'chords' | 'bass' | 'drums' | 'pad';

export interface MixerTrackState {
    volume: number; // 0.0 to 1.0
    muted: boolean;
    solo: boolean;
}

export interface MixerState {
    melody: MixerTrackState;
    chords: MixerTrackState;
    bass: MixerTrackState;
    drums: MixerTrackState;
    pad: MixerTrackState;
    metronome: boolean;
    masterVolume: number;
}

export interface VibeSettings {
    darkness: number;    // 0 = Bright/Uplifting, 100 = Dark/Moody
    catchiness: number;  // 0 = Ambient/Complex, 100 = Pure Pop Earworm
    complexity: number;  // 0 = Simple & Direct, 100 = Jazz/Sophisticated
    space: number;       // 0 = Dense/Wall of Sound, 100 = Sparse/Vocal breathing room
    vocalRange: 'any' | 'male' | 'female' | 'falsetto' | 'instrumental';
    humanizePercent: number; // 0 to 20%
}

export interface SavedSession {
    id: string;
    name: string;
    seedCode: string;
    timestamp: number;
    isFavorite: boolean;
    diceState: DieState[];
    arrangement: Arrangement;
}
