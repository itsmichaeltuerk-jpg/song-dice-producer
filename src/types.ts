export type DieCategory = 'Key' | 'Tempo' | 'Form' | 'Chords' | 'Rhythm' | 'Bass' | 'Drums';

export interface DieState {
    id: string;
    category: DieCategory;
    value: string;
    isLocked: boolean;
    options: string[];
}

export interface Arrangement {
    title_working: string;
    logline: string;
    key: string;
    bpm: number;
    bars_total: number;
    chord_progression_text: string;
    
    // STEP SEQUENCER FORMAT (64 steps = 4 bars of 16th notes)
    // Format: Space-separated. 
    // 'X' = Drum hit, 'C4' = Note, 'Am' = Chord, '.' = Sustain/Hold, '-' = Rest
    step_chords: string;
    step_melody: string;
    step_bass: string;
    step_drums_kick: string;
    step_drums_snare: string;
    step_drums_hat: string;
    
    arrangement_notes: string;
    hook_reason: string;
    next_moves: string[];
}

// Internal type used by the audio/midi engines after parsing the step strings
export interface ParsedStepEvent {
    step: number; // 0 to 63
    note: string; // 'X', 'C4', 'Am', etc.
    duration_steps: number;
}
