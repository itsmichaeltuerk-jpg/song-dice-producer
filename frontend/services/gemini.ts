import { GoogleGenAI, Type } from '@google/genai';
import { Arrangement, DieState, VibeSettings, NoteEvent, ProducerEngine } from '../types';
import { 
    parseHexMelodyOrBassStream, 
    parseHexChordsStream, 
    parseHexDrumsStream, 
    parseHexPadStream, 
    buildHexArrangementMemory,
    encodeSessionToHexSeed
} from './hexSequencer';
import { composeProceduralArrangement, parseKeyAndMode, midiToPitchName, pitchNameToMidi } from './proceduralComposer';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

// ═════════════════════════════════════════════════════════════════════════
// COMPACT HEXADECIMAL ARRANGEMENT SCHEMA (~280 - 380 tokens output total)
// ═════════════════════════════════════════════════════════════════════════
const hexPromptArrangementSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "Catchy working title" },
        logline: { type: Type.STRING, description: "One sentence vibe description" },
        key: { type: Type.STRING, description: "e.g. A minor, C major, D Dorian" },
        mode: { type: Type.STRING, description: "e.g. Aeolian, Ionian, Dorian" },
        bpm: { type: Type.INTEGER, description: "BPM integer (e.g. 94)" },
        swing: { type: Type.NUMBER, description: "Swing factor 0.0 to 0.2" },
        bars_total: { type: Type.INTEGER, description: "Always 8" },
        // HEX STREAMS: STEP_HEX:PITCH_HEX:DUR_HEX:VEL_HEX
        melody_hex: { 
            type: Type.STRING, 
            description: "Pipe-separated hex events covering ALL 8 BARS (0x00 to 0x7F). Format 'STEP_HEX:PITCH_HEX:DUR_HEX:VEL_HEX'. E.g. '00:40:04:70|04:43:04:75|08:45:08:7F|20:40:04:70...'" 
        },
        chords_hex: { 
            type: Type.STRING, 
            description: "Pipe-separated hex chords covering ALL 8 BARS (0x00 to 0x7F). Format 'STEP_HEX:NAME:PITCH1_HEX,PITCH2_HEX,PITCH3_HEX:DUR_HEX:VEL_HEX'. E.g. '00:Am:39,3C,40:08:58|08:F:35,39,3C:08:5A|10:C:30,34,37:08:60|18:G:37,3B,3E:08:58...'" 
        },
        bass_hex: { 
            type: Type.STRING, 
            description: "Pipe-separated hex bass covering ALL 8 BARS. Format 'STEP_HEX:PITCH_HEX:DUR_HEX:VEL_HEX'. MIDI in octaves 1-2 (0x21 to 0x34). E.g. '00:21:06:7F|06:21:02:68|08:21:04:74...'" 
        },
        drums_hex: { 
            type: Type.STRING, 
            description: "Pipe-separated hex drum hits covering ALL 8 BARS. Format 'STEP_HEX:DRUM_HEX:VEL_HEX'. Drum hex: 24=Kick, 26=Snare, 27=Clap, 2A=ClosedHat, 2E=OpenHat, 31=Crash. E.g. '00:24:78|00:2A:50|02:2A:44|04:26:70|06:2A:44|08:24:78...'" 
        },
        pad_hex: { 
            type: Type.STRING, 
            description: "Pipe-separated hex pad chords covering ALL 8 BARS. Format 'STEP_HEX:PITCH1_HEX,PITCH2_HEX,PITCH3_HEX:DUR_HEX:VEL_HEX'. E.g. '00:2D,34,39,3C:10:45|10:29,30,35,39:10:48...'" 
        },
        scratch_hook: { type: Type.STRING, description: "Catchy 4-8 word vocal lyric hook" },
        hook_why: { type: Type.STRING, description: "Why this hook works" },
        mix_tip: { type: Type.STRING, description: "DAW production and mixing tip" },
        next_moves: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: [
        "title",
        "logline",
        "key",
        "bpm",
        "bars_total",
        "melody_hex",
        "chords_hex",
        "bass_hex",
        "drums_hex",
        "scratch_hook",
        "hook_why",
        "mix_tip"
    ]
};

// =========================================================================
// NORMALIZER & AUTO-REPAIR ENGINE: Guarantees full 8-bar loop playback
// =========================================================================
export function normalizeAndRepairHexArrangement(
    parsed: any,
    dice: DieState[],
    vibe: VibeSettings
): Arrangement {
    const totalBars = 8;
    const keyStr = parsed.key || dice.find(d => d.category === 'Key / Mode')?.value || 'A Minor / Aeolian';
    const keyInfo = parseKeyAndMode(keyStr);
    const bpmVal = parsed.bpm || parseInt(dice.find(d => d.category === 'Tempo & Feel')?.value || '94', 10) || 94;

    // Decode Hex streams directly into NoteEvent structures
    let chords = parseHexChordsStream(parsed.chords_hex);
    let melody = parseHexMelodyOrBassStream(parsed.melody_hex);
    let bass = parseHexMelodyOrBassStream(parsed.bass_hex);
    let drums = parseHexDrumsStream(parsed.drums_hex);
    let pad = parsed.pad_hex ? parseHexPadStream(parsed.pad_hex) : undefined;

    // Auto-repair if any track is truncated before bar 8
    const ensure8Bars = (events: NoteEvent[], trackType: 'chords' | 'melody' | 'bass' | 'drums' | 'pad'): NoteEvent[] => {
        if (!events || events.length === 0) {
            const fallback = composeProceduralArrangement(dice, vibe);
            return fallback[trackType] || [];
        }

        const maxBar = events.reduce((m, e) => Math.max(m, e.bar || 1), 1);
        if (maxBar >= 7 && events.some(e => e.bar >= 5)) {
            return events;
        }

        // Extend bars 1-4 into bars 5-8 with lift
        const result = [...events.filter(e => e.bar <= 4)];
        const bar1to4 = events.filter(e => e.bar <= 4);

        bar1to4.forEach(ev => {
            const newBar = ev.bar + 4;
            const newEvent: NoteEvent = { ...ev, bar: newBar };
            if (trackType === 'melody' && ev.bar === 4 && ev.note) {
                const rootMidi = 60 + keyInfo.rootIndex;
                newEvent.note = midiToPitchName(rootMidi);
                newEvent.duration_beats = 3.0;
            }
            result.push(newEvent);
        });

        if (trackType === 'drums') {
            result.push({ bar: 8, beat: 4.5, piece: 'crash', duration_beats: 1.0, velocity: 115 });
        }

        return result;
    };

    chords = ensure8Bars(chords, 'chords');
    melody = ensure8Bars(melody, 'melody');
    bass = ensure8Bars(bass, 'bass');
    drums = ensure8Bars(drums, 'drums');
    if (pad) pad = ensure8Bars(pad, 'pad');

    const seedCode = encodeSessionToHexSeed(dice, bpmVal, keyInfo.rootName, vibe);

    return {
        title_working: parsed.title || "Midnight Tape Reel",
        logline: parsed.logline || `Catchy 8-bar loop in ${keyInfo.rootName} ${keyInfo.mode} (${bpmVal} BPM)`,
        key: `${keyInfo.rootName} ${keyInfo.mode.toLowerCase()}`,
        mode: keyInfo.mode,
        bpm: bpmVal,
        time_signature: "4/4",
        swing: parsed.swing || 0.10,
        form: ["Hook Loop (8 Bars)"],
        bars_total: totalBars,
        chords,
        melody,
        bass,
        drums,
        pad,
        arrangement_notes: parsed.mix_tip || "Produced with tight transient drums and warm analog synth layering.",
        hook_reason: parsed.hook_why || "Short repetitive melodic motif with strong voice leading.",
        vocal_range_suggestion: `Comfortable for vocal range (${keyInfo.rootName}3 to ${keyInfo.rootName}5). Vocal pocket carved between 1kHz and 3kHz.`,
        next_moves: parsed.next_moves || [
            "1. Drop multitrack MIDI directly into your DAW.",
            "2. Record a scratch vocal take over the hook loop.",
            "3. Apply tape saturation to chord bus."
        ],
        scratch_lyric_hook: parsed.scratch_hook || "Late night glow on tape... spin it slow now",
        seedCode,
        createdAt: Date.now()
    };
}

export async function generateArrangementWithGemini(
    dice: DieState[],
    vibe: VibeSettings,
    refinementInstruction?: string,
    engine: ProducerEngine = 'gemini'
): Promise<Arrangement> {
    if (engine === 'procedural') {
        const procedural = composeProceduralArrangement(dice, vibe, refinementInstruction);
        procedural.engineUsed = 'procedural';
        return procedural;
    }

    const activeDice = dice.filter(d => d.isEnabled !== false);
    const diceSummary = activeDice.map(d => `- ${d.category}: ${d.value}`).join('\n');

    // Token-optimized Hex-Prompting instructions
    const prompt = `You are a platinum record producer composing an 8-BAR DAW HOOK LOOP sketch.

DICE PARAMETERS:
${diceSummary}

VIBE: Darkness ${vibe.darkness}%, Catchiness ${vibe.catchiness}%, Vocal Space ${vibe.space}%.
${refinementInstruction ? `REFINEMENT: ${refinementInstruction}` : ''}

HEX SEQUENCING SPECIFICATION:
1. 16th-Note Steps in HEX: 0x00 to 0x7F (Step 0 = Bar 1 Beat 1, Step 16 = Bar 2 Beat 1 ... Step 112 = Bar 8 Beat 1).
2. MUST COVER ALL 8 BARS (0x00 to 0x7F).
3. MIDI PITCH IN HEX:
   - Melody: Octaves 4-5 (0x3C to 0x54). 2-4 catchy notes per bar.
   - Chords: Triad/7th voicings in octave 3 (0x30 to 0x48).
   - Bass: Octaves 1-2 (0x21 to 0x34). Locked with kick on downbeats.
   - Drums: 24=Kick, 26=Snare, 27=Clap, 2A=ClosedHat, 2E=OpenHat, 31=Crash.
4. Output strict JSON with compact pipe-separated hex strings.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 0 },
                responseMimeType: 'application/json',
                responseSchema: hexPromptArrangementSchema,
                systemInstruction: "You are an elite music arrangement engine. Output lightning-fast, ultra-compact hexadecimal sequence JSON representing full 8-bar DAW song sketches.",
                temperature: 0.65
            }
        });

        const rawText = response.text;
        if (!rawText) throw new Error("Empty response from Gemini");

        const parsed = JSON.parse(rawText);
        const arrangement = normalizeAndRepairHexArrangement(parsed, dice, vibe);
        arrangement.engineUsed = 'gemini';
        return arrangement;
    } catch (error) {
        console.info("Gemini call fell back to procedural composer:", error);
        const fallback = composeProceduralArrangement(dice, vibe, refinementInstruction);
        fallback.engineUsed = 'procedural';
        return fallback;
    }
}
