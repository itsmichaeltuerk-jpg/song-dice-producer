import { Arrangement, NoteEvent, StemTrack, DieState, VibeSettings } from '../types';

/**
 * ═════════════════════════════════════════════════════════════════════════
 * HEXADECIMAL MUSIC SEQUENCER ARCHITECTURE
 * ═════════════════════════════════════════════════════════════════════════
 *
 * 1. COMPACT HEX EVENT PACKET (4 Bytes):
 *    [Byte 0: STEP_HEX (0x00 to 0x7F -> 0 to 127 sixteenth notes / 8 bars)]
 *    [Byte 1: PITCH_HEX (0x00 to 0x7F -> MIDI note number in Hex, e.g. 0x3C = 60 / C4)]
 *    [Byte 2: DUR_HEX (0x01 to 0x40 -> duration in 16th-note ticks, e.g. 0x04 = 1 beat)]
 *    [Byte 3: VEL_HEX (0x01 to 0x7F -> MIDI velocity in Hex, e.g. 0x64 = 100)]
 *
 * 2. GM DRUM MIDI CODES IN HEX:
 *    0x24 = 36 (Bass Drum 1 / Kick)
 *    0x26 = 38 (Snare Drum)
 *    0x27 = 39 (Hand Clap)
 *    0x2A = 42 (Closed Hi-Hat)
 *    0x2E = 46 (Open Hi-Hat)
 *    0x31 = 49 (Crash Cymbal 1)
 *    0x2D = 45 (Mid Tom)
 *    0x2B = 43 (Low Tom)
 *
 * 3. TOKEN EFFICIENCY:
 *    Instead of 25+ tokens per JSON event object, each event in hex string stream
 *    is `STEP:PITCH:DUR:VEL` (e.g. "00:3C:04:70") which is only ~3 tokens!
 * ═════════════════════════════════════════════════════════════════════════
 */

export const EVENT_BYTE_SIZE = 4;
export const TOTAL_LOOP_STEPS_8_BARS = 128; // 8 bars * 16 sixteenths = 0x80 steps

export interface HexTrackPattern {
    track: StemTrack;
    channelId: number; // 0: Melody, 1: Chords, 2: Bass, 3: Pad, 9: Drums
    eventCount: number;
    buffer: Uint8Array;
}

export interface HexArrangementMemory {
    totalSteps: number;
    tracks: Record<StemTrack, HexTrackPattern>;
    hexSignature: string;
    byteSize: number;
}

const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function noteNameToMidi(note: string): number {
    const m = note.trim().match(/^([A-Ga-g][#b]?)(\d+)$/);
    if (!m) return 60;
    const name = m[1].toUpperCase();
    const clean = name === 'BB' ? 'A#' : name === 'EB' ? 'D#' : name === 'AB' ? 'G#' : name === 'DB' ? 'C#' : name === 'GB' ? 'F#' : name;
    const oct = parseInt(m[2], 10);
    const idx = PITCH_NAMES.indexOf(clean);
    if (idx === -1) return 60;
    return (oct + 1) * 12 + idx;
}

export function midiToNoteName(midi: number): string {
    const note = PITCH_NAMES[midi % 12];
    const oct = Math.floor(midi / 12) - 1;
    return `${note}${oct}`;
}

export function drumPieceToMidiHex(piece: string): number {
    const p = piece.toLowerCase();
    if (p.includes('kick')) return 0x24;      // 36
    if (p.includes('snare')) return 0x26;     // 38
    if (p.includes('clap')) return 0x27;      // 39
    if (p.includes('open')) return 0x2E;      // 46
    if (p.includes('hat') || p.includes('shaker')) return 0x2A; // 42
    if (p.includes('crash')) return 0x31;     // 49
    return 0x26;
}

export function midiToDrumPieceName(midi: number): string {
    switch (midi) {
        case 36:
        case 0x24:
            return 'KICK';
        case 38:
        case 0x26:
            return 'SNARE';
        case 39:
        case 0x27:
            return 'CLAP';
        case 42:
        case 0x2A:
            return 'C.HAT';
        case 46:
        case 0x2E:
            return 'O.HAT';
        case 49:
        case 0x31:
            return 'CRASH';
        default:
            return 'PERC';
    }
}

// Alias for backwards-compatibility
export const midiHexToDrumPieceName = midiToDrumPieceName;

export function toHex2(val: number): string {
    return (val & 0xFF).toString(16).padStart(2, '0').toUpperCase();
}

export function parseHexInt(hexStr: string, defaultVal = 0): number {
    if (!hexStr) return defaultVal;
    const clean = hexStr.trim().replace(/^0x/i, '');
    const num = parseInt(clean, 16);
    return isNaN(num) ? defaultVal : num;
}

// =========================================================================
// PARSERS: Convert Gemini Hex Stream Strings into NoteEvent arrays
// =========================================================================

/**
 * Parses melody or bass stream: "STEP:PITCH:DUR:VEL|STEP:PITCH:DUR:VEL"
 * e.g. "00:40:04:70|04:43:04:78|08:45:08:7F"
 */
export function parseHexMelodyOrBassStream(stream: string | undefined): NoteEvent[] {
    if (!stream) return [];
    const events: NoteEvent[] = [];
    const tokens = stream.split('|');

    for (const token of tokens) {
        if (!token.trim()) continue;
        const parts = token.trim().split(':');
        if (parts.length >= 3) {
            const step = parseHexInt(parts[0], 0); // 0x00 to 0x7F
            const midi = parseHexInt(parts[1], 60);
            const durTicks = parseHexInt(parts[2], 4);
            const vel = parts.length >= 4 ? parseHexInt(parts[3], 100) : 100;

            const bar = Math.floor(step / 16) + 1;
            const beat = ((step % 16) / 4) + 1.0;
            const duration_beats = Math.max(0.25, durTicks / 4);

            events.push({
                bar: Math.max(1, Math.min(8, bar)),
                beat: Math.max(1.0, Math.min(4.75, beat)),
                note: midiToNoteName(midi),
                duration_beats,
                velocity: Math.max(1, Math.min(127, vel))
            });
        }
    }
    return events;
}

/**
 * Parses chords stream: "STEP:NAME:PITCH1,PITCH2,PITCH3:DUR:VEL"
 * e.g. "00:Am:39,3C,40:08:58|08:F:35,39,3C:08:5A|10:C:30,34,37:08:60"
 */
export function parseHexChordsStream(stream: string | undefined): NoteEvent[] {
    if (!stream) return [];
    const events: NoteEvent[] = [];
    const tokens = stream.split('|');

    for (const token of tokens) {
        if (!token.trim()) continue;
        const parts = token.trim().split(':');
        if (parts.length >= 4) {
            const step = parseHexInt(parts[0], 0);
            const chordName = parts[1] || 'Am';
            const midiHexPitches = parts[2].split(',').map(h => parseHexInt(h, 60));
            const durTicks = parseHexInt(parts[3], 8);
            const vel = parts.length >= 5 ? parseHexInt(parts[4], 90) : 90;

            const bar = Math.floor(step / 16) + 1;
            const beat = ((step % 16) / 4) + 1.0;
            const duration_beats = Math.max(0.5, durTicks / 4);

            events.push({
                bar: Math.max(1, Math.min(8, bar)),
                beat: Math.max(1.0, Math.min(4.75, beat)),
                note: chordName,
                chord_notes: midiHexPitches.map(m => midiToNoteName(m)),
                duration_beats,
                velocity: Math.max(1, Math.min(127, vel))
            });
        }
    }
    return events;
}

/**
 * Parses drum stream: "STEP:DRUM_HEX:VEL_HEX"
 * e.g. "00:24:78|00:2A:50|02:2A:44|04:26:70|08:24:78"
 */
export function parseHexDrumsStream(stream: string | undefined): NoteEvent[] {
    if (!stream) return [];
    const events: NoteEvent[] = [];
    const tokens = stream.split('|');

    for (const token of tokens) {
        if (!token.trim()) continue;
        const parts = token.trim().split(':');
        if (parts.length >= 2) {
            const step = parseHexInt(parts[0], 0);
            const drumMidiHex = parseHexInt(parts[1], 0x26);
            const vel = parts.length >= 3 ? parseHexInt(parts[2], 100) : 100;

            const bar = Math.floor(step / 16) + 1;
            const beat = ((step % 16) / 4) + 1.0;

            let pieceName: NoteEvent['piece'] = 'snare';
            if (drumMidiHex === 0x24 || drumMidiHex === 36) pieceName = 'kick';
            else if (drumMidiHex === 0x26 || drumMidiHex === 38) pieceName = 'snare';
            else if (drumMidiHex === 0x27 || drumMidiHex === 39) pieceName = 'clap';
            else if (drumMidiHex === 0x2A || drumMidiHex === 42) pieceName = 'hat';
            else if (drumMidiHex === 0x2E || drumMidiHex === 46) pieceName = 'openhat';
            else if (drumMidiHex === 0x31 || drumMidiHex === 49) pieceName = 'crash';

            events.push({
                bar: Math.max(1, Math.min(8, bar)),
                beat: Math.max(1.0, Math.min(4.75, beat)),
                piece: pieceName,
                duration_beats: pieceName === 'openhat' || pieceName === 'crash' ? 1.0 : 0.5,
                velocity: Math.max(1, Math.min(127, vel))
            });
        }
    }
    return events;
}

/**
 * Parses pad stream: "STEP:PITCH1,PITCH2,PITCH3:DUR:VEL"
 * e.g. "00:2D,34,39,3C:10:45|10:29,30,35,39:10:48"
 */
export function parseHexPadStream(stream: string | undefined): NoteEvent[] {
    if (!stream) return [];
    const events: NoteEvent[] = [];
    const tokens = stream.split('|');

    for (const token of tokens) {
        if (!token.trim()) continue;
        const parts = token.trim().split(':');
        if (parts.length >= 3) {
            const step = parseHexInt(parts[0], 0);
            const midiHexPitches = parts[1].split(',').map(h => parseHexInt(h, 48));
            const durTicks = parseHexInt(parts[2], 16);
            const vel = parts.length >= 4 ? parseHexInt(parts[3], 65) : 65;

            const bar = Math.floor(step / 16) + 1;
            const beat = ((step % 16) / 4) + 1.0;

            events.push({
                bar: Math.max(1, Math.min(8, bar)),
                beat: Math.max(1.0, Math.min(4.75, beat)),
                note: midiHexPitches.length > 0 ? midiToNoteName(midiHexPitches[0]) : 'C3',
                chord_notes: midiHexPitches.map(m => midiToNoteName(m)),
                duration_beats: Math.max(1.0, durTicks / 4),
                velocity: Math.max(1, Math.min(127, vel))
            });
        }
    }
    return events;
}

// =========================================================================
// ENCODERS: Pack NoteEvents to contiguous Uint8Array Hex Memory Buffer
// =========================================================================

export function encodeTrackToHex(events: NoteEvent[] | undefined, isDrum = false): HexTrackPattern {
    if (!events || events.length === 0) {
        return {
            track: isDrum ? 'drums' : 'melody',
            channelId: isDrum ? 9 : 0,
            eventCount: 0,
            buffer: new Uint8Array(0)
        };
    }

    const flatItems: Array<{ step: number; midi: number; durTicks: number; vel: number }> = [];

    events.forEach(ev => {
        const barIdx = Math.max(1, Math.min(8, ev.bar || 1)) - 1;
        const beatVal = Math.max(1.0, Math.min(4.75, ev.beat || 1.0));
        const step = Math.min(127, Math.max(0, (barIdx * 16) + Math.round((beatVal - 1.0) * 4)));
        const durTicks = Math.min(64, Math.max(1, Math.round((ev.duration_beats || 1.0) * 4)));
        const vel = Math.min(127, Math.max(1, ev.velocity || 100));

        if (isDrum && ev.piece) {
            flatItems.push({
                step,
                midi: drumPieceToMidiHex(ev.piece),
                durTicks,
                vel
            });
        } else if (ev.chord_notes && ev.chord_notes.length > 0) {
            ev.chord_notes.forEach(cn => {
                flatItems.push({
                    step,
                    midi: noteNameToMidi(cn),
                    durTicks,
                    vel
                });
            });
        } else if (ev.note) {
            flatItems.push({
                step,
                midi: noteNameToMidi(ev.note),
                durTicks,
                vel
            });
        }
    });

    flatItems.sort((a, b) => a.step - b.step);

    const buffer = new Uint8Array(flatItems.length * EVENT_BYTE_SIZE);
    flatItems.forEach((item, idx) => {
        const offset = idx * EVENT_BYTE_SIZE;
        buffer[offset] = item.step & 0x7F;
        buffer[offset + 1] = item.midi & 0x7F;
        buffer[offset + 2] = item.durTicks & 0x7F;
        buffer[offset + 3] = item.vel & 0x7F;
    });

    return {
        track: isDrum ? 'drums' : 'melody',
        channelId: isDrum ? 9 : 0,
        eventCount: flatItems.length,
        buffer
    };
}

export function buildHexArrangementMemory(arrangement: Arrangement): HexArrangementMemory {
    const totalBars = arrangement.bars_total || 8;
    const totalSteps = totalBars * 16;

    const melodyPattern = encodeTrackToHex(arrangement.melody, false);
    melodyPattern.track = 'melody';
    melodyPattern.channelId = 0;

    const chordsPattern = encodeTrackToHex(arrangement.chords, false);
    chordsPattern.track = 'chords';
    chordsPattern.channelId = 1;

    const bassPattern = encodeTrackToHex(arrangement.bass, false);
    bassPattern.track = 'bass';
    bassPattern.channelId = 2;

    const drumsPattern = encodeTrackToHex(arrangement.drums, true);
    drumsPattern.track = 'drums';
    drumsPattern.channelId = 9;

    const padPattern = encodeTrackToHex(arrangement.pad, false);
    padPattern.track = 'pad';
    padPattern.channelId = 3;

    let totalByteSize = 0;
    const hexParts: string[] = [];

    const appendHexDump = (pattern: HexTrackPattern) => {
        totalByteSize += pattern.buffer.length;
        for (let i = 0; i < Math.min(8, pattern.buffer.length); i++) {
            hexParts.push(toHex2(pattern.buffer[i]));
        }
    };

    appendHexDump(bassPattern);
    appendHexDump(drumsPattern);
    appendHexDump(chordsPattern);
    appendHexDump(melodyPattern);

    return {
        totalSteps,
        tracks: {
            melody: melodyPattern,
            chords: chordsPattern,
            bass: bassPattern,
            drums: drumsPattern,
            pad: padPattern
        },
        hexSignature: hexParts.join(' '),
        byteSize: totalByteSize
    };
}

// =========================================================================
// HEX SESSION SEED COMPRESSOR (Sub-Kilobyte Shareable URLs & State)
// =========================================================================

export function encodeSessionToHexSeed(dice: DieState[], bpm: number, key: string, vibe: VibeSettings): string {
    const bytes: number[] = [];
    
    // Byte 0: BPM (e.g. 94 = 0x5E)
    bytes.push(Math.max(40, Math.min(220, bpm)) & 0xFF);

    // Byte 1: Key root index 0-11 + major/minor bit (bit 7)
    const isMinor = key.toLowerCase().includes('minor') || key.toLowerCase().includes('dorian');
    const rootName = key.split(' ')[0].replace(/m/i, '');
    const cleanRoot = rootName === 'Bb' ? 'A#' : rootName === 'Eb' ? 'D#' : rootName;
    const rootIdx = Math.max(0, PITCH_NAMES.indexOf(cleanRoot));
    bytes.push((rootIdx & 0x0F) | (isMinor ? 0x80 : 0x00));

    // Byte 2: Locked dice bitmask (7 bits)
    let lockMask = 0;
    dice.slice(0, 7).forEach((d, idx) => {
        if (d.isLocked) lockMask |= (1 << idx);
    });
    bytes.push(lockMask & 0x7F);

    // Bytes 3-9: Dice face indices (7 dice)
    dice.slice(0, 7).forEach(d => {
        const optionIdx = Math.max(0, d.options.indexOf(d.value));
        bytes.push(optionIdx & 0xFF);
    });

    // Bytes 10-11: Packed Vibe sliders (Darkness, Catchiness, Space)
    bytes.push(((Math.round(vibe.darkness / 10) & 0x0F) << 4) | (Math.round(vibe.catchiness / 10) & 0x0F));
    bytes.push(((Math.round(vibe.space / 10) & 0x0F) << 4) | (Math.round(vibe.complexity / 10) & 0x0F));

    const hexString = bytes.map(b => toHex2(b)).join('');
    return `SDHEX-${hexString}`;
}
