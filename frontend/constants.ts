import { DieState } from './types';

export const DICE_CONFIG: Omit<DieState, 'id' | 'value' | 'isLocked'>[] = [
    {
        category: 'Key',
        options: ['C Major', 'A Minor', 'G Major', 'E Minor', 'D Dorian', 'F Lydian', 'Bb Minor', 'C# Minor']
    },
    {
        category: 'Tempo',
        options: ['72 Ballad', '86 Boom-Bap', '94 Mid Hip-Hop', '102 Pop Groove', '118 Four-on-Floor', '128 Dance', '140 Trap Energy']
    },
    {
        category: 'Form',
        options: ['8-bar Loop', '16-bar Verse', 'Verse-Chorus', 'AABA', 'Intro-Hook-Breakdown']
    },
    {
        category: 'Chords',
        options: ['I-V-vi-IV Pop', 'vi-IV-I-V Emotional', 'ii-V-I Jazz', 'i-bVI-bVII Cinematic', 'i-iv-v Dark', 'Pedal-tone Colors']
    },
    {
        category: 'Rhythm',
        options: ['Whole-note Pads', 'Half-note Pushes', 'Syncopated Stabs', 'Arpeggiated 16ths', 'House Gated', 'Sparse Hits']
    },
    {
        category: 'Bass',
        options: ['Root-note Pump', 'Walking Line', 'Syncopated Pocket', '808 Slides', 'Ostinato Riff', 'Minimal']
    },
    {
        category: 'Drums',
        options: ['Boom-Bap', 'Trap Hats+Snare', 'Four-on-the-Floor', 'Breakbeat', 'Lo-fi Dusty', 'Minimal Click+Clap']
    }
];

export const INITIAL_DICE: DieState[] = DICE_CONFIG.map((config, index) => ({
    id: `die-${index}`,
    category: config.category,
    value: config.options[Math.floor(Math.random() * config.options.length)],
    isLocked: false,
    options: config.options
}));
