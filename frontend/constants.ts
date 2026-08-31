import { DieState, Arrangement } from './types';

export const DEFAULT_DICE_CONFIG: Array<{
    category: DieState['category'];
    shortLabel: string;
    description: string;
    options: string[];
    defaultIndex: number;
}> = [
    {
        category: 'Key / Mode',
        shortLabel: 'KEY',
        description: 'Harmonic center & scale mood',
        defaultIndex: 1,
        options: [
            'A Minor / Aeolian',
            'C Major / Ionian',
            'E Minor / Natural',
            'G Major / Uplifting',
            'D Dorian / Soulful',
            'F Lydian / Dreamy',
            'Bb Minor / Dark R&B',
            'C# Minor / Melancholy',
            'A Mixolydian / Bluesy Lift',
            'B Minor / Cinematic',
            'Eb Major / Warm Pop',
            'F# Minor / Nostalgic'
        ]
    },
    {
        category: 'Tempo & Feel',
        shortLabel: 'TEMPO',
        description: 'BPM & groove swing personality',
        defaultIndex: 2,
        options: [
            '94 BPM • Mid Hip-Hop (Light Swing)',
            '72 BPM • Ballad / Slow Burn (Straight)',
            '86 BPM • Boom-Bap Soul (Heavy Swing)',
            '102 BPM • Pop Groove (Straight)',
            '118 BPM • Four-on-the-Floor Push',
            '128 BPM • Club Dance (Tight Grid)',
            '140 BPM • Trap & Drill (Aggressive 16ths)',
            '160 BPM • Hyperpop / Fast Indie',
            '80 BPM • Lo-fi Lazy Dotted Swing'
        ]
    },
    {
        category: 'Structure',
        shortLabel: 'FORM',
        description: 'Arrangement framework & section bars',
        defaultIndex: 0,
        options: [
            '8-bar Hook Loop (Focus Sketch)',
            '16-bar Verse + Hook (A/B)',
            'Verse – Chorus – Verse',
            'Intro – Hook – Breakdown (Drop)',
            'Verse – Pre-Chorus – Chorus',
            'AABA Classic Songwriting',
            'Minimal 4-bar Loop with 8-bar Variation'
        ]
    },
    {
        category: 'Chord Progression',
        shortLabel: 'CHORDS',
        description: 'Harmonic sequence & emotion',
        defaultIndex: 1,
        options: [
            'vi – IV – I – V (Emotional Anthem)',
            'I – V – vi – IV (Timeless Pop)',
            'ii – V – I – VI (Smooth Neo-Soul / Jazz)',
            'i – bVI – bVII (Cinematic Dark Minor)',
            'i – iv – v (Gritty Vintage Minor)',
            'I – bVII – IV – I (Classic Rock & Indie Lift)',
            'I – iii – IV – V (Bright Bittersweet)',
            'Pedal-Tone Bass + Changing Lush Color Triads'
        ]
    },
    {
        category: 'Chord Rhythm',
        shortLabel: 'RHYTHM',
        description: 'Keyboard & guitar playing articulation',
        defaultIndex: 1,
        options: [
            'Syncopated 8th-note Stabs & Pushes',
            'Whole-note Warm Ambient Pads',
            'Half-note Heavy Downbeat Pushes',
            'Arpeggiated 16th Synth Movement',
            'Offbeat Reggae / Ska Skank',
            'House Gated Choppy Chords',
            'Trap Sparse Accent Hits on "2 & 4"',
            'Held Drone with Tension Color Hits'
        ]
    },
    {
        category: 'Bassline',
        shortLabel: 'BASS',
        description: 'Low-end motion & anchor',
        defaultIndex: 2,
        options: [
            'Syncopated Pop Pocket (Locks with Kick)',
            'Root-note 8th-note Pump',
            'Deep 808 Sub Slides & Glides',
            'Smooth Walking Counter-Melody',
            'Ostinato Repeating Riff',
            'Octave Jumps & Funky Slaps',
            'Minimal Sub Drops on Beat 1 Only'
        ]
    },
    {
        category: 'Drum Groove',
        shortLabel: 'DRUMS',
        description: 'Rhythm kit & beat family',
        defaultIndex: 0,
        options: [
            'Boom-Bap Dusty Vinyl Pocket',
            'Modern Trap Snare + Rolling Hats',
            'Four-on-the-Floor Driving Kick + Shaker',
            'Crisp Breakbeat / Jungle Lite',
            'Lo-Fi Acoustic Brush & Rimshot',
            'Indie Garage Rock Kit with Open Hats',
            'Latin Baile / Clave-Inspired Syncopation',
            'Minimal Bedroom Click, Finger-snap & Sub-thud'
        ]
    }
];

export const EXTRA_DICE_CONFIG: Array<{
    category: DieState['category'];
    shortLabel: string;
    description: string;
    options: string[];
    defaultIndex: number;
}> = [
    {
        category: 'Melody Contour',
        shortLabel: 'MELODY',
        description: 'Topline vocal/lead shape',
        defaultIndex: 0,
        options: [
            'Stepwise Catchy Hook (Small intervals)',
            'Leap-and-Return Dramatic Hook',
            'Call-and-Response 2-bar Phrasing',
            'Pentatonic Vocal Riff',
            'Motif & Ascending Sequence',
            'Sparse Staccato Earworm Stabs'
        ]
    },
    {
        category: 'Vibe / Genre',
        shortLabel: 'GENRE',
        description: 'Production mood flavor',
        defaultIndex: 0,
        options: [
            'Bedroom Indie Pop',
            'Late-Night Alt R&B',
            'Dusty Nostalgic Lo-fi',
            'Warm Melodic Deep House',
            '90s Grunge / Bedroom Indie Rock',
            'Cinematic Ambient Dream-pop',
            'Afrobeat-Influenced Bounce',
            'Intimate Singer-Songwriter Acoustic'
        ]
    },
    {
        category: 'Arrangement Density',
        shortLabel: 'DENSITY',
        description: 'Instrumentation thickness',
        defaultIndex: 1,
        options: [
            'Intimate & Sparse (Plenty of room for vocals)',
            'Balanced Producer Sketch (Hook ready)',
            'Full Wall-of-Sound Stacked Layers',
            'Bass & Drum Heavy Club Grid'
        ]
    }
];

export const INITIAL_DICE: DieState[] = [
    ...DEFAULT_DICE_CONFIG.map((cfg, idx) => ({
        id: `die-core-${idx}`,
        category: cfg.category,
        shortLabel: cfg.shortLabel,
        description: cfg.description,
        value: cfg.options[cfg.defaultIndex],
        isLocked: false,
        isOptional: false,
        isEnabled: true,
        options: cfg.options
    })),
    ...EXTRA_DICE_CONFIG.map((cfg, idx) => ({
        id: `die-extra-${idx}`,
        category: cfg.category,
        shortLabel: cfg.shortLabel,
        description: cfg.description,
        value: cfg.options[cfg.defaultIndex],
        isLocked: false,
        isOptional: true,
        isEnabled: false,
        options: cfg.options
    }))
];

// Punchy starter demo arrangement with audibility calibrated across all listening environments
export const DEMO_ARRANGEMENT: Arrangement = {
    title_working: "Velvet Tape Loop",
    logline: "Nostalgic bedroom indie-pop hook with a warm syncopated pocket and bouncy topline",
    key: "A minor",
    mode: "Aeolian",
    bpm: 94,
    time_signature: "4/4",
    swing: 0.12,
    form: ["Hook Loop (8 Bars)", "Verse Sketch (8 Bars)"],
    bars_total: 8,
    chords: [
        { bar: 1, beat: 1, note: "Am", chord_notes: ["A3", "C4", "E4"], duration_beats: 2, velocity: 88 },
        { bar: 1, beat: 3, note: "Am", chord_notes: ["A3", "C4", "E4"], duration_beats: 1.5, velocity: 84 },
        { bar: 2, beat: 1, note: "F", chord_notes: ["F3", "A3", "C4"], duration_beats: 2, velocity: 90 },
        { bar: 2, beat: 3, note: "F", chord_notes: ["F3", "A3", "C4"], duration_beats: 1.5, velocity: 86 },
        { bar: 3, beat: 1, note: "C", chord_notes: ["C3", "E3", "G3"], duration_beats: 2, velocity: 92 },
        { bar: 3, beat: 3, note: "C", chord_notes: ["C3", "E3", "G3"], duration_beats: 1.5, velocity: 84 },
        { bar: 4, beat: 1, note: "G", chord_notes: ["G3", "B3", "D4"], duration_beats: 2, velocity: 88 },
        { bar: 4, beat: 3, note: "G", chord_notes: ["G3", "B3", "D4"], duration_beats: 1.5, velocity: 80 },
        { bar: 5, beat: 1, note: "Am", chord_notes: ["A3", "C4", "E4"], duration_beats: 2, velocity: 90 },
        { bar: 5, beat: 3, note: "Am", chord_notes: ["A3", "C4", "E4"], duration_beats: 1.5, velocity: 85 },
        { bar: 6, beat: 1, note: "F", chord_notes: ["F3", "A3", "C4"], duration_beats: 2, velocity: 92 },
        { bar: 6, beat: 3, note: "F", chord_notes: ["F3", "A3", "C4"], duration_beats: 1.5, velocity: 88 },
        { bar: 7, beat: 1, note: "C", chord_notes: ["C3", "E3", "G3"], duration_beats: 2, velocity: 94 },
        { bar: 7, beat: 3, note: "C", chord_notes: ["C3", "E3", "G3"], duration_beats: 1.5, velocity: 86 },
        { bar: 8, beat: 1, note: "Em", chord_notes: ["E3", "G3", "B3"], duration_beats: 2, velocity: 88 },
        { bar: 8, beat: 3, note: "G", chord_notes: ["G3", "B3", "D4"], duration_beats: 2, velocity: 92 }
    ],
    melody: [
        { bar: 1, beat: 1, note: "E4", duration_beats: 0.75, velocity: 104, lyric_placeholder: "Late" },
        { bar: 1, beat: 2, note: "G4", duration_beats: 0.75, velocity: 108, lyric_placeholder: "night" },
        { bar: 1, beat: 3, note: "A4", duration_beats: 1.5, velocity: 114, lyric_placeholder: "glow" },
        { bar: 2, beat: 1, note: "C5", duration_beats: 1.0, velocity: 110, lyric_placeholder: "on" },
        { bar: 2, beat: 2.5, note: "A4", duration_beats: 1.5, velocity: 106, lyric_placeholder: "tape" },
        { bar: 3, beat: 1, note: "G4", duration_beats: 1.0, velocity: 102, lyric_placeholder: "spin" },
        { bar: 3, beat: 2.5, note: "E4", duration_beats: 1.0, velocity: 96, lyric_placeholder: "it" },
        { bar: 3, beat: 4, note: "D4", duration_beats: 0.5, velocity: 92, lyric_placeholder: "slow" },
        { bar: 4, beat: 1, note: "E4", duration_beats: 2.0, velocity: 98, lyric_placeholder: "now" },
        { bar: 5, beat: 1, note: "E4", duration_beats: 0.75, velocity: 104, lyric_placeholder: "Late" },
        { bar: 5, beat: 2, note: "G4", duration_beats: 0.75, velocity: 110, lyric_placeholder: "night" },
        { bar: 5, beat: 3, note: "C5", duration_beats: 1.5, velocity: 116, lyric_placeholder: "call" },
        { bar: 6, beat: 1, note: "B4", duration_beats: 0.75, velocity: 108, lyric_placeholder: "feel" },
        { bar: 6, beat: 2.5, note: "A4", duration_beats: 1.5, velocity: 106, lyric_placeholder: "it" },
        { bar: 7, beat: 1, note: "G4", duration_beats: 1.0, velocity: 100, lyric_placeholder: "all" },
        { bar: 7, beat: 2.5, note: "E4", duration_beats: 1.5, velocity: 96, lyric_placeholder: "fade" },
        { bar: 8, beat: 1, note: "A4", duration_beats: 3.0, velocity: 110, lyric_placeholder: "out" }
    ],
    bass: [
        { bar: 1, beat: 1, note: "A2", duration_beats: 1.5, velocity: 125 },
        { bar: 1, beat: 3, note: "A2", duration_beats: 1.0, velocity: 118 },
        { bar: 1, beat: 4.5, note: "E3", duration_beats: 0.5, velocity: 112 },
        { bar: 2, beat: 1, note: "F2", duration_beats: 1.5, velocity: 125 },
        { bar: 2, beat: 3, note: "F2", duration_beats: 1.0, velocity: 118 },
        { bar: 3, beat: 1, note: "C2", duration_beats: 1.5, velocity: 125 },
        { bar: 3, beat: 3, note: "C2", duration_beats: 1.0, velocity: 116 },
        { bar: 4, beat: 1, note: "G2", duration_beats: 1.5, velocity: 125 },
        { bar: 4, beat: 3.5, note: "B2", duration_beats: 0.5, velocity: 112 },
        { bar: 5, beat: 1, note: "A2", duration_beats: 1.5, velocity: 125 },
        { bar: 5, beat: 3, note: "A2", duration_beats: 1.0, velocity: 118 },
        { bar: 6, beat: 1, note: "F2", duration_beats: 1.5, velocity: 125 },
        { bar: 6, beat: 3, note: "F2", duration_beats: 1.0, velocity: 118 },
        { bar: 7, beat: 1, note: "C2", duration_beats: 1.5, velocity: 125 },
        { bar: 7, beat: 3, note: "C2", duration_beats: 1.0, velocity: 116 },
        { bar: 8, beat: 1, note: "E2", duration_beats: 2.0, velocity: 125 },
        { bar: 8, beat: 3.5, note: "G2", duration_beats: 0.5, velocity: 115 }
    ],
    drums: [
        { bar: 1, beat: 1, piece: "kick", duration_beats: 0.5, velocity: 120 },
        { bar: 1, beat: 1, piece: "hat", duration_beats: 0.25, velocity: 75 },
        { bar: 1, beat: 1.5, piece: "hat", duration_beats: 0.25, velocity: 60 },
        { bar: 1, beat: 2, piece: "snare", duration_beats: 0.5, velocity: 110 },
        { bar: 1, beat: 2, piece: "hat", duration_beats: 0.25, velocity: 80 },
        { bar: 1, beat: 2.5, piece: "hat", duration_beats: 0.25, velocity: 65 },
        { bar: 1, beat: 3, piece: "kick", duration_beats: 0.5, velocity: 115 },
        { bar: 1, beat: 3, piece: "hat", duration_beats: 0.25, velocity: 75 },
        { bar: 1, beat: 3.5, piece: "kick", duration_beats: 0.5, velocity: 95 },
        { bar: 1, beat: 4, piece: "snare", duration_beats: 0.5, velocity: 110 },
        { bar: 1, beat: 4.5, piece: "openhat", duration_beats: 0.5, velocity: 70 },
        { bar: 2, beat: 1, piece: "kick", duration_beats: 0.5, velocity: 120 },
        { bar: 2, beat: 2, piece: "snare", duration_beats: 0.5, velocity: 110 },
        { bar: 2, beat: 2.5, piece: "kick", duration_beats: 0.5, velocity: 95 },
        { bar: 2, beat: 4, piece: "snare", duration_beats: 0.5, velocity: 112 },
        { bar: 3, beat: 1, piece: "kick", duration_beats: 0.5, velocity: 120 },
        { bar: 3, beat: 2, piece: "snare", duration_beats: 0.5, velocity: 110 },
        { bar: 3, beat: 3, piece: "kick", duration_beats: 0.5, velocity: 115 },
        { bar: 3, beat: 4, piece: "snare", duration_beats: 0.5, velocity: 110 },
        { bar: 4, beat: 1, piece: "kick", duration_beats: 0.5, velocity: 120 },
        { bar: 4, beat: 2, piece: "snare", duration_beats: 0.5, velocity: 110 },
        { bar: 4, beat: 4, piece: "snare", duration_beats: 0.5, velocity: 115 },
        { bar: 5, beat: 1, piece: "kick", duration_beats: 0.5, velocity: 120 },
        { bar: 5, beat: 2, piece: "snare", duration_beats: 0.5, velocity: 110 },
        { bar: 5, beat: 3, piece: "kick", duration_beats: 0.5, velocity: 115 },
        { bar: 5, beat: 4, piece: "snare", duration_beats: 0.5, velocity: 110 },
        { bar: 6, beat: 1, piece: "kick", duration_beats: 0.5, velocity: 120 },
        { bar: 6, beat: 2, piece: "snare", duration_beats: 0.5, velocity: 110 },
        { bar: 7, beat: 1, piece: "kick", duration_beats: 0.5, velocity: 120 },
        { bar: 7, beat: 2, piece: "snare", duration_beats: 0.5, velocity: 110 },
        { bar: 8, beat: 1, piece: "kick", duration_beats: 0.5, velocity: 120 },
        { bar: 8, beat: 2, piece: "snare", duration_beats: 0.5, velocity: 110 },
        { bar: 8, beat: 4, piece: "snare", duration_beats: 0.5, velocity: 120 },
        { bar: 8, beat: 4.5, piece: "crash", duration_beats: 1.0, velocity: 115 }
    ],
    pad: [
        { bar: 1, beat: 1, note: "Am", chord_notes: ["A2", "E3", "A3", "C4"], duration_beats: 4, velocity: 65 },
        { bar: 2, beat: 1, note: "F", chord_notes: ["F2", "C3", "F3", "A3"], duration_beats: 4, velocity: 68 },
        { bar: 3, beat: 1, note: "C", chord_notes: ["C2", "G2", "E3", "G3"], duration_beats: 4, velocity: 70 },
        { bar: 4, beat: 1, note: "G", chord_notes: ["G2", "D3", "G3", "B3"], duration_beats: 4, velocity: 65 },
        { bar: 5, beat: 1, note: "Am", chord_notes: ["A2", "E3", "A3", "C4"], duration_beats: 4, velocity: 68 },
        { bar: 6, beat: 1, note: "F", chord_notes: ["F2", "C3", "F3", "A3"], duration_beats: 4, velocity: 70 },
        { bar: 7, beat: 1, note: "C", chord_notes: ["C2", "G2", "E3", "G3"], duration_beats: 4, velocity: 72 },
        { bar: 8, beat: 1, note: "Em", chord_notes: ["E2", "B2", "E3", "G3"], duration_beats: 4, velocity: 65 }
    ],
    arrangement_notes: "Stack acoustic electric piano with a warm low-pass Juno pad. Keep bass round at ~120Hz with a slight tape saturation.",
    hook_reason: "The ascending leap from E4 to C5 on Bar 2 and Bar 5 creates an instant emotional release that invites a vocal harmonizer.",
    vocal_range_suggestion: "Comfortable for Tenor / Alto range (E3 to C5). Falsetto works nicely on bar 2's high C5.",
    next_moves: [
        "1. Drag MIDI stem files directly onto 4 audio instrument tracks in your DAW.",
        "2. Record a scratch vocal phonetics take focusing on the 'Late night glow' rhythm.",
        "3. Route the Juno pad to a sidechain compressor keyed to Track 10 (Kick).",
        "4. Layer an analog shaker on top of the hi-hat track for organic bedroom swing."
    ],
    scratch_lyric_hook: "Late night glow on tape... spin it slow now",
    seedCode: "SD-94BPM-Amin-vi-IV-I-V",
    createdAt: Date.now()
};
