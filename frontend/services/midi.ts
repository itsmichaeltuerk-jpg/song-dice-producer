import { Arrangement, ParsedStepEvent } from '../types';

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

function noteToMidi(note: string): number {
    if (!note || note === 'X' || note === '-' || note === '.') return 60;
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const match = note.match(/([A-G]#?)(\d)/);
    if (!match) return 60;
    const n = notes.indexOf(match[1]);
    const octave = parseInt(match[2], 10);
    return octave * 12 + n + 12;
}

function parseStepString(stepString: string): ParsedStepEvent[] {
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

function createTrack(events: ParsedStepEvent[], channel: number, ticksPerBeat: number, drumNoteNum?: number): number[] {
    let trackData: number[] = [];
    const ticksPerStep = ticksPerBeat / 4; // 16th notes
    
    interface MidiEvent { tick: number; type: 'on' | 'off'; note: number; vel: number; }
    let midiEvents: MidiEvent[] = [];

    events.forEach(e => {
        const startTick = Math.round(e.step * ticksPerStep);
        const endTick = startTick + Math.round(e.duration_steps * ticksPerStep);
        const vel = 100;
        
        let noteNum = 60;
        if (drumNoteNum) {
            noteNum = drumNoteNum;
        } else if (e.note) {
            if (e.note.length > 3) { 
                 noteNum = noteToMidi(e.note.substring(0, 2).replace(/m|M/, '3')); 
            } else {
                noteNum = noteToMidi(e.note);
            }
        }

        midiEvents.push({ tick: startTick, type: 'on', note: noteNum, vel });
        midiEvents.push({ tick: endTick, type: 'off', note: noteNum, vel: 0 });
    });

    midiEvents.sort((a, b) => a.tick - b.tick);

    let lastTick = 0;
    midiEvents.forEach(ev => {
        const delta = ev.tick - lastTick;
        const status = (ev.type === 'on' ? 0x90 : 0x80) | channel;
        trackData.push(...writeVLQ(delta));
        trackData.push(status, ev.note, ev.vel);
        lastTick = ev.tick;
    });

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

export function generateMidi(arrangement: Arrangement): Uint8Array {
    const ticksPerBeat = 96;
    
    const melodyEvents = parseStepString(arrangement.step_melody);
    const chordsEvents = parseStepString(arrangement.step_chords);
    const bassEvents = parseStepString(arrangement.step_bass);
    const kickEvents = parseStepString(arrangement.step_drums_kick);
    const snareEvents = parseStepString(arrangement.step_drums_snare);
    const hatEvents = parseStepString(arrangement.step_drums_hat);

    let numTracks = 0;
    if (melodyEvents.length) numTracks++;
    if (chordsEvents.length) numTracks++;
    if (bassEvents.length) numTracks++;
    if (kickEvents.length) numTracks++;
    if (snareEvents.length) numTracks++;
    if (hatEvents.length) numTracks++;

    const header = [
        ...stringToBytes('MThd'),
        0, 0, 0, 6, 
        0, 1, 
        0, numTracks, 
        (ticksPerBeat >> 8) & 0xFF, ticksPerBeat & 0xFF 
    ];

    let tracks: number[] = [];
    
    if (melodyEvents.length) tracks.push(...createTrack(melodyEvents, 0, ticksPerBeat));
    if (chordsEvents.length) tracks.push(...createTrack(chordsEvents, 1, ticksPerBeat));
    if (bassEvents.length) tracks.push(...createTrack(bassEvents, 2, ticksPerBeat));
    
    // Drums on Channel 10 (index 9)
    if (kickEvents.length) tracks.push(...createTrack(kickEvents, 9, ticksPerBeat, 36));
    if (snareEvents.length) tracks.push(...createTrack(snareEvents, 9, ticksPerBeat, 38));
    if (hatEvents.length) tracks.push(...createTrack(hatEvents, 9, ticksPerBeat, 42));

    return new Uint8Array([...header, ...tracks]);
}

export function downloadMidi(arrangement: Arrangement) {
    try {
        const midiBytes = generateMidi(arrangement);
        const blob = new Blob([midiBytes], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${arrangement.title_working.replace(/\s+/g, '_') || 'song_dice'}.mid`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Failed to generate MIDI", e);
        alert("Could not generate MIDI file. Check console for details.");
    }
}
