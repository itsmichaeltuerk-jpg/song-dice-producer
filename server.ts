import 'dotenv/config';
import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '5mb' }));

const arrangementSchema = {
  type: Type.OBJECT,
  properties: {
    title_working: { type: Type.STRING },
    logline: { type: Type.STRING },
    key: { type: Type.STRING },
    bpm: { type: Type.INTEGER },
    bars_total: { type: Type.INTEGER, description: "Total number of bars matching the Form die (e.g., 8, 16, 12, 4)" },
    chord_progression_text: { type: Type.STRING },
    step_chords: { type: Type.STRING, description: "Space-separated steps (bars_total * 16 tokens). Use chord names (Am), '.' to sustain, '-' to rest." },
    step_melody: { type: Type.STRING, description: "Space-separated steps (bars_total * 16 tokens). Use notes (C4), '.' to sustain, '-' to rest." },
    step_bass: { type: Type.STRING, description: "Space-separated steps (bars_total * 16 tokens). Use notes (C2), '.' to sustain, '-' to rest." },
    step_drums_kick: { type: Type.STRING, description: "Space-separated steps (bars_total * 16 tokens). Use 'X' for hit, '-' for rest." },
    step_drums_snare: { type: Type.STRING, description: "Space-separated steps (bars_total * 16 tokens). Use 'X' for hit, '-' for rest." },
    step_drums_hat: { type: Type.STRING, description: "Space-separated steps (bars_total * 16 tokens). Use 'X' for hit, '-' for rest." },
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

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("Warning: GEMINI_API_KEY environment variable is not set.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/generate-arrangement', async (req, res) => {
  try {
    const { dice } = req.body;
    if (!dice || !Array.isArray(dice)) {
      return res.status(400).json({ error: 'Invalid dice configuration provided.' });
    }

    const formDie = dice.find((d: any) => d.category?.toLowerCase() === 'form');
    const formVal = (formDie?.value || '').toLowerCase();
    let requestedBars = 8;
    const match = formVal.match(/(\d+)\s*-?\s*bar/);
    if (match) {
      requestedBars = parseInt(match[1], 10) || 8;
    } else if (formVal.includes('16-bar') || formVal.includes('verse-chorus') || formVal.includes('aaba')) {
      requestedBars = 16;
    } else if (formVal.includes('intro') || formVal.includes('breakdown')) {
      requestedBars = 12;
    } else if (formVal.includes('4-bar')) {
      requestedBars = 4;
    }

    const totalStepsExpected = requestedBars * 16;

    const ai = getGeminiClient();
    const prompt = `
You are an expert music producer. Generate a ${requestedBars}-BAR ARRANGEMENT (${formDie?.value || '8-bar loop'}) based on these parameters:
${dice.map((d: any) => `- ${d.category}: ${d.value}`).join('\n')}

CRITICAL INSTRUCTIONS FOR STEP SEQUENCING (${totalStepsExpected} STEPS TOTAL):
We use a 16th-note step sequencer format. ${requestedBars} bars * 16 steps = EXACTLY ${totalStepsExpected} space-separated tokens per track.
- bars_total MUST be set to ${requestedBars}.
- For DRUMS: Use 'X' for a hit, '-' for a rest. 
  Example Kick: X - - - X - - - X - - - X - - - ... (must be exactly ${totalStepsExpected} tokens)
- For BASS/MELODY: Use Note names (e.g., C2, G4), '.' to sustain the previous note, '-' to rest.
  Example Bass: C2 . . . - - - - G2 . . . - - - - ... (must be exactly ${totalStepsExpected} tokens)
- For CHORDS: Use Chord names (e.g., Am, Gmaj7), '.' to sustain, '-' to rest.

Ensure functional harmony, a tight groove, and EXACTLY ${totalStepsExpected} space-separated items per step string.
Keep text fields (logline, notes) under 15 words for speed.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: arrangementSchema,
        temperature: 0.7,
      }
    });

    if (!response.text) {
      return res.status(500).json({ error: 'Empty response received from Gemini.' });
    }

    const arrangement = JSON.parse(response.text);
    if (!arrangement.bars_total || arrangement.bars_total <= 0) {
      arrangement.bars_total = requestedBars;
    }
    return res.json(arrangement);
  } catch (error: any) {
    console.error('Error generating arrangement:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate arrangement.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
