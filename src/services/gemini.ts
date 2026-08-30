import { Arrangement, DieState } from '../types';
import { createProceduralArrangement } from './fallbackGenerator';

export interface GenerateResult {
    arrangement: Arrangement;
    geminiError: string | null;
    isFallback: boolean;
}

export async function generateArrangement(dice: DieState[]): Promise<GenerateResult> {
    let geminiError: string | null = null;

    try {
        const response = await fetch('/api/generate-arrangement', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ dice }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            geminiError = errorData.error || `Server responded with status ${response.status}`;
        } else {
            const arrangement = (await response.json()) as Arrangement;
            if (arrangement && arrangement.step_drums_kick) {
                if (!arrangement.bars_total || arrangement.bars_total <= 0) {
                    const kickTokens = arrangement.step_drums_kick.trim().split(/\s+/).length;
                    arrangement.bars_total = Math.max(1, Math.round(kickTokens / 16));
                }
                return {
                    arrangement,
                    geminiError: null,
                    isFallback: false
                };
            } else {
                geminiError = "Invalid arrangement data received from Gemini API.";
            }
        }
    } catch (err: any) {
        geminiError = err?.message || String(err) || "Failed to reach Gemini API endpoint.";
    }

    // If we reached here, Gemini API failed -> invoke built-in procedural arrangement generator
    try {
        const fallbackArrangement = createProceduralArrangement(dice);
        return {
            arrangement: fallbackArrangement,
            geminiError: geminiError || "Gemini API unavailable.",
            isFallback: true
        };
    } catch (fallbackErr: any) {
        throw new Error(`Gemini Error: ${geminiError} | Fallback Generator Failed: ${fallbackErr?.message || fallbackErr}`);
    }
}
