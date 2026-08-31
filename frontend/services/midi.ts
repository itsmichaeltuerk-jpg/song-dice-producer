import { Arrangement, NoteEvent } from '../types';
import { drumPieceToMidiHex, noteNameToMidi } from './hexSequencer';

function writeVLQ(value: number): number[] {
    let buffer = [value & 0x7F];
    while ((value >>= 7)) {
        buffer.push((value & 0x7F) | 0x80);
    }
    return buffer.reverse();
}

function stringToBytes(str: string): number[] {
    return str.split('').map(c => c.charCodeAt(0));
}

interface MidiInternalEvent {
    tick: number;
    type: 'on' | 'off';
    note: number;
    vel: number;
}

function createMidiTrackChunk(
    events: NoteEvent[],
    channel: number,
    trackName: string,
    ticksPerBeat = 96,
    isDrum = false,
    humanizePercent = 0
): number[] {
    const trackData: number[] = [];

    // Track Name Meta Event
    const nameBytes = stringToBytes(trackName);
    trackData.push(0x00, 0xFF, 0x03, nameBytes.length, ...nameBytes);

    const midiEvents: MidiInternalEvent[] = [];

    events.forEach(e => {
        let humanizeDeltaTicks = 0;
        let humanizeVel = 0;
        if (humanizePercent > 0) {
            const maxJitter = (ticksPerBeat * 0.1) * (humanizePercent / 100);
            humanizeDeltaTicks = Math.round((Math.random() * 2 - 1) * maxJitter);
            humanizeVel = Math.round((Math.random() * 2 - 1) * (humanizePercent * 0.5));
        }

        const barIdx = Math.max(1, e.bar || 1) - 1;
        const beatVal = Math.max(1.0, e.beat || 1.0);
        const startTick = Math.max(0, Math.round((barIdx * 4 + (beatVal - 1.0)) * ticksPerBeat) + humanizeDeltaTicks);
        const durationTicks = Math.max(12, Math.round((e.duration_beats || 1.0) * ticksPerBeat));
        const endTick = startTick + durationTicks;
        const vel = Math.max(1, Math.min(127, (e.velocity || 100) + humanizeVel));

        if (isDrum && e.piece) {
            const drumNote = drumPieceToMidiHex(e.piece);
            midiEvents.push({ tick: startTick, type: 'on', note: drumNote, vel });
            midiEvents.push({ tick: endTick, type: 'off', note: drumNote, vel: 0 });
        } else if (e.chord_notes && e.chord_notes.length > 0) {
            e.chord_notes.forEach(cn => {
                const noteNum = noteNameToMidi(cn);
                midiEvents.push({ tick: startTick, type: 'on', note: noteNum, vel });
                midiEvents.push({ tick: endTick, type: 'off', note: noteNum, vel: 0 });
            });
        } else if (e.note) {
            const noteNum = noteNameToMidi(e.note);
            midiEvents.push({ tick: startTick, type: 'on', note: noteNum, vel });
            midiEvents.push({ tick: endTick, type: 'off', note: noteNum, vel: 0 });
        }
    });

    midiEvents.sort((a, b) => {
        if (a.tick !== b.tick) return a.tick - b.tick;
        return a.type === 'off' ? -1 : 1;
    });

    let lastTick = 0;
    midiEvents.forEach(ev => {
        const delta = Math.max(0, ev.tick - lastTick);
        const status = (ev.type === 'on' ? 0x90 : 0x80) | (channel & 0x0F);
        trackData.push(...writeVLQ(delta));
        trackData.push(status, ev.note & 0x7F, ev.vel & 0x7F);
        lastTick = ev.tick;
    });

    // End of Track Meta Event: 0x00, 0xFF, 0x2F, 0x00
    trackData.push(0x00, 0xFF, 0x2F, 0x00);

    const trackHeader = [
        ...stringToBytes('MTrk'),
        (trackData.length >> 24) & 0xFF,
        (trackData.length >> 16) & 0xFF,
        (trackData.length >> 8) & 0xFF,
        trackData.length & 0xFF
    ];

    return [...trackHeader, ...trackData];
}

function createTempoTrack(bpm: number, ticksPerBeat = 96): number[] {
    const trackData: number[] = [];
    const nameBytes = stringToBytes('Song Dice Conductor Track');
    trackData.push(0x00, 0xFF, 0x03, nameBytes.length, ...nameBytes);

    const microsecondsPerQuarter = Math.round(60000000 / (bpm || 94));
    trackData.push(
        0x00, 0xFF, 0x51, 0x03,
        (microsecondsPerQuarter >> 16) & 0xFF,
        (microsecondsPerQuarter >> 8) & 0xFF,
        microsecondsPerQuarter & 0xFF
    );

    // Time Signature: 4/4
    trackData.push(0x00, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);
    trackData.push(0x00, 0xFF, 0x2F, 0x00);

    const trackHeader = [
        ...stringToBytes('MTrk'),
        (trackData.length >> 24) & 0xFF,
        (trackData.length >> 16) & 0xFF,
        (trackData.length >> 8) & 0xFF,
        trackData.length & 0xFF
    ];

    return [...trackHeader, ...trackData];
}

export function generateMultiTrackMidi(arrangement: Arrangement, humanizePercent = 0): Uint8Array {
    const ticksPerBeat = 96;
    const tracksList: number[][] = [];

    // Track 0: Master Tempo
    tracksList.push(createTempoTrack(arrangement.bpm, ticksPerBeat));

    // Track 1: Melody (Channel 0 / 1)
    if (arrangement.melody && arrangement.melody.length > 0) {
        tracksList.push(createMidiTrackChunk(arrangement.melody, 0, '1-Melody Topline', ticksPerBeat, false, humanizePercent));
    }

    // Track 2: Chords (Channel 1 / 2)
    if (arrangement.chords && arrangement.chords.length > 0) {
        tracksList.push(createMidiTrackChunk(arrangement.chords, 1, '2-Chords Keys', ticksPerBeat, false, humanizePercent));
    }

    // Track 3: Bass (Channel 2 / 3)
    if (arrangement.bass && arrangement.bass.length > 0) {
        tracksList.push(createMidiTrackChunk(arrangement.bass, 2, '3-Bass Sub', ticksPerBeat, false, humanizePercent));
    }

    // Track 4: Pad (Channel 3 / 4)
    if (arrangement.pad && arrangement.pad.length > 0) {
        tracksList.push(createMidiTrackChunk(arrangement.pad, 3, '4-Atmosphere Pad', ticksPerBeat, false, humanizePercent));
    }

    // Track 5: Drums GM Channel 10 (Channel 9)
    if (arrangement.drums && arrangement.drums.length > 0) {
        tracksList.push(createMidiTrackChunk(arrangement.drums, 9, '10-Drums GM', ticksPerBeat, true, humanizePercent));
    }

    const numTracks = tracksList.length;

    const header = [
        ...stringToBytes('MThd'),
        0, 0, 0, 6,
        0, 1, // Format 1
        (numTracks >> 8) & 0xFF, numTracks & 0xFF,
        (ticksPerBeat >> 8) & 0xFF, ticksPerBeat & 0xFF
    ];

    const allBytes: number[] = [...header];
    tracksList.forEach(t => allBytes.push(...t));

    return new Uint8Array(allBytes);
}

export function generateSingleStemMidi(
    events: NoteEvent[],
    trackName: string,
    channel: number,
    bpm: number,
    isDrum = false,
    humanizePercent = 0
): Uint8Array {
    const ticksPerBeat = 96;
    const tracksList: number[][] = [
        createTempoTrack(bpm, ticksPerBeat),
        createMidiTrackChunk(events, channel, trackName, ticksPerBeat, isDrum, humanizePercent)
    ];

    const numTracks = tracksList.length;
    const header = [
        ...stringToBytes('MThd'),
        0, 0, 0, 6,
        0, 1,
        (numTracks >> 8) & 0xFF, numTracks & 0xFF,
        (ticksPerBeat >> 8) & 0xFF, ticksPerBeat & 0xFF
    ];

    const allBytes: number[] = [...header];
    tracksList.forEach(t => allBytes.push(...t));
    return new Uint8Array(allBytes);
}

export function downloadMidiFile(arrangement: Arrangement, humanizePercent = 0) {
    const midiBytes = generateMultiTrackMidi(arrangement, humanizePercent);
    const blob = new Blob([midiBytes], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanTitle = (arrangement.title_working || 'Song_Dice_Sketch').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${cleanTitle}_${arrangement.bpm}BPM_${arrangement.key.replace(/\s+/g, '')}.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function downloadStemMidi(
    events: NoteEvent[],
    stemName: string,
    channel: number,
    arrangement: Arrangement,
    isDrum = false
) {
    const midiBytes = generateSingleStemMidi(events, stemName, channel, arrangement.bpm, isDrum);
    const blob = new Blob([midiBytes], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanTitle = (arrangement.title_working || 'Song_Dice_Sketch').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${cleanTitle}_Stem_${stemName}.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function generateProducerBriefText(arrangement: Arrangement): string {
    const chordBars = buildChordProgressionBarChart(arrangement.chords, arrangement.bars_total || 8);

    return `# 🎙️ SONG DICE PRODUCER BRIEF
## **${arrangement.title_working}**
*"${arrangement.logline}"*

---
### 📌 SONG SPECIFICATIONS
- **Key / Mode:** ${arrangement.key} (${arrangement.mode || 'Natural'})
- **BPM:** ${arrangement.bpm}
- **Time Signature:** ${arrangement.time_signature || '4/4'}
- **Suggested Swing:** ${Math.round((arrangement.swing || 0.1) * 100)}%
- **Song Structure:** ${(arrangement.form || ['8-bar Hook Loop']).join(' → ')}
- **Session Hex Seed:** \`${arrangement.seedCode}\`

---
### 🎹 CHORD CHART (Bar-by-Bar)
\`\`\`
${chordBars}
\`\`\`

---
### 🎤 SCRATCH LYRIC HOOK
> **"${arrangement.scratch_lyric_hook || 'Late night melody on replay...'}"**
*Vocal Recommendation:* ${arrangement.vocal_range_suggestion || 'Fits standard vocal range.'}

---
### 💡 HOOK & ARRANGEMENT ANALYSIS
**Why This Hook Works:**
${arrangement.hook_reason}

**Mix & Sound Design Notes:**
${arrangement.arrangement_notes}

---
### 🚀 DAW NEXT MOVES (Ableton / FL Studio / Logic):
${(arrangement.next_moves || []).map((m, i) => `${i + 1}. ${m}`).join('\n')}

---
*Generated with Song Dice — Roll a starting point. Export the MIDI. Finish the song.*
`;
}

export function buildChordProgressionBarChart(chords: NoteEvent[], totalBars = 8): string {
    if (!chords || chords.length === 0) return "| Am | F | C | G |";

    const barMap: Record<number, string[]> = {};
    for (let b = 1; b <= totalBars; b++) barMap[b] = [];

    chords.forEach(c => {
        const chordName = c.note || (c.chord_notes ? c.chord_notes[0] : 'C');
        if (barMap[c.bar] && !barMap[c.bar].includes(chordName)) {
            barMap[c.bar].push(chordName);
        }
    });

    const lines: string[] = [];
    let currentLine = "| ";
    for (let b = 1; b <= totalBars; b++) {
        const chordsInBar = barMap[b].length > 0 ? barMap[b].join(' - ') : '%';
        currentLine += `Bar ${b}: ${chordsInBar} | `;
        if (b % 4 === 0 || b === totalBars) {
            lines.push(currentLine);
            currentLine = "| ";
        }
    }
    return lines.join('\n');
}
