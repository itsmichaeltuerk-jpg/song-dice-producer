import { GoogleGenAI, Type } from '@google/genai';
import { Arrangement, DieState } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

const arrangementSchema = {
    type: Type.OBJECT,
    properties: {
        title_working: { type: Type.STRING },
        logline: { type: Type.STRING },
        key: { type: Type.STRING },
        bpm: { type: Type.INTEGER },
        bars_total: { type: Type.INTEGER, description: "Must be exactly 4" },
        chord_progression_text: { type: Type.STRING },
        
        // Step sequencer strings
        step_chords: { type: Type.STRING, description: "64 space-separated steps. Use chord names (Am), '.' to sustain, '-' to rest." },
        step_melody: { type: Type.STRING, description: "64 space-separated steps. Use notes (C4), '.' to sustain, '-' to rest." },
        step_bass: { type: Type.STRING, description: "64 space-separated steps. Use notes (C2), '.' to sustain, '-' to rest." },
        step_drums_kick: { type: Type.STRING, description: "64 space-separated steps. Use 'X' for hit, '-' for rest." },
        step_drums_snare: { type: Type.STRING, description: "64 space-separated steps. Use 'X' for hit, '-' for rest." },
        step_drums_hat: { type: Type.STRING, description: "64 space-separated steps. Use 'X' for hit, '-' for rest." },
        
        arrangement_notes: { type: Type.STRING },
        hook_reason: { type: Type.STRING },
        next_moves: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: [
        "title_working", "key", "bpm", "bars_total", "chord_progression_text", 
        "step_chords", "step_melody", "step_bass", "step_drums_kick", "step_drums_snare", "step_drums_hat",
        "arrangement_notes"
    ]
};

export async function generateArrangement(dice: DieState[]): Promise<Arrangement> {
    // SPEED & QUALITY OPTIMIZATION:
    // To answer the user's question: Yes, Hexadecimal (e.g., F000) is highly token efficient. 
    // HOWEVER, LLMs struggle with binary-to-hex math in zero-shot generation, leading to hallucinated rhythms.
    // The best compromise for SPEED + ACCURACY is a space-separated ASCII step sequencer (e.g., "X - - - X - - -").
    // This reduces a 4-bar drum pattern from ~300 tokens (JSON objects) down to ~20 tokens (String),
    // allowing us to generate a high-quality 4-BAR arrangement almost instantly without repeating a 2-bar loop.

    const prompt = `
You are an expert music producer. Generate a 4-BAR LOOP based on these parameters:
${dice.map(d => `- ${d.category}: ${d.value}`).join('\n')}

CRITICAL INSTRUCTIONS FOR STEP SEQUENCING (64 STEPS TOTAL):
We use a 16th-note step sequencer format. 4 bars * 16 steps = EXACTLY 64 space-separated tokens per track.
- For DRUMS: Use 'X' for a hit, '-' for a rest. 
  Example Kick (4-on-floor): X - - - X - - - X - - - X - - - ... (must be 64 total)
- For BASS/MELODY: Use Note names (e.g., C2, G4), '.' to sustain the previous note, '-' to rest.
  Example Bass: C2 . . . - - - - G2 . . . - - - - ... (must be 64 total)
- For CHORDS: Use Chord names (e.g., Am, Gmaj7), '.' to sustain, '-' to rest.

Ensure functional harmony, a tight groove, and EXACTLY 64 space-separated items per step string.
Keep text fields (logline, notes) under 15 words for speed.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: arrangementSchema,
                temperature: 0.7,
                thinkingConfig: { thinkingBudget: 0 } // Keep thinking off for max speed
            }
        });

        if (!response.text) {
            throw new Error("Empty response from Gemini");
        }

        const arrangement = JSON.parse(response.text) as Arrangement;
        arrangement.bars_total = 4; // Enforce 4 bars
        return arrangement;
    } catch (error) {
        console.error("Error generating arrangement:", error);
        throw error;
    }
}
