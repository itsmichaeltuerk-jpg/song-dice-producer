import React from 'react';
import { SlidersHorizontal, Sparkles, Moon, Mic, Zap, RefreshCw, Drum } from 'lucide-react';
import { VibeSettings } from '../types';

interface VibeControlsProps {
    vibe: VibeSettings;
    onChangeVibe: (updated: VibeSettings) => void;
    onRefine: (instruction: string) => void;
    isRolling: boolean;
}

export const VibeControls: React.FC<VibeControlsProps> = ({
    vibe,
    onChangeVibe,
    onRefine,
    isRolling
}) => {
    const handleSlider = (field: keyof VibeSettings, val: number) => {
        onChangeVibe({ ...vibe, [field]: val });
    };

    return (
        <div className="bg-studio-900/80 border border-studio-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 backdrop-blur-md">
            
            <div className="flex items-center justify-between border-b border-studio-800 pb-2.5">
                <div className="flex items-center gap-2">
                    <SlidersHorizontal size={16} className="text-studio-amber" />
                    <h4 className="text-xs font-mono uppercase tracking-widest font-bold text-studio-200">
                        Producer Vibe & Refinements
                    </h4>
                </div>
                <span className="text-[11px] font-mono text-studio-500">Biases Gemini arrangement engine</span>
            </div>

            {/* Vibe Sliders Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                
                {/* Catchiness */}
                <div className="bg-studio-950 p-3 rounded-xl border border-studio-800/80 flex flex-col gap-1.5">
                    <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-studio-300 font-bold">Earworm Catchiness</span>
                        <span className="text-studio-amber font-bold">{vibe.catchiness}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={vibe.catchiness}
                        onChange={(e) => handleSlider('catchiness', parseInt(e.target.value, 10))}
                        className="w-full accent-studio-amber h-1.5 bg-studio-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[9px] text-studio-500 font-mono">Short motifs & repetition</span>
                </div>

                {/* Darkness */}
                <div className="bg-studio-950 p-3 rounded-xl border border-studio-800/80 flex flex-col gap-1.5">
                    <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-studio-300 font-bold">Dark / Moody Tone</span>
                        <span className="text-studio-amber font-bold">{vibe.darkness}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={vibe.darkness}
                        onChange={(e) => handleSlider('darkness', parseInt(e.target.value, 10))}
                        className="w-full accent-studio-amber h-1.5 bg-studio-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[9px] text-studio-500 font-mono">Minor extensions & tension</span>
                </div>

                {/* Space / Breathing Room */}
                <div className="bg-studio-950 p-3 rounded-xl border border-studio-800/80 flex flex-col gap-1.5">
                    <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-studio-300 font-bold">Vocal Space</span>
                        <span className="text-studio-amber font-bold">{vibe.space}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={vibe.space}
                        onChange={(e) => handleSlider('space', parseInt(e.target.value, 10))}
                        className="w-full accent-studio-amber h-1.5 bg-studio-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[9px] text-studio-500 font-mono">Leaves room for topline vocal</span>
                </div>

                {/* Complexity */}
                <div className="bg-studio-950 p-3 rounded-xl border border-studio-800/80 flex flex-col gap-1.5">
                    <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-studio-300 font-bold">Harmonic Colors</span>
                        <span className="text-studio-amber font-bold">{vibe.complexity}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={vibe.complexity}
                        onChange={(e) => handleSlider('complexity', parseInt(e.target.value, 10))}
                        className="w-full accent-studio-amber h-1.5 bg-studio-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[9px] text-studio-500 font-mono">7ths, 9ths & voice leading</span>
                </div>
            </div>

            {/* Quick Refinement Action Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-studio-800/60">
                <span className="text-[11px] font-mono text-studio-500 uppercase tracking-wider mr-1">
                    Quick Refine:
                </span>

                <button
                    type="button"
                    disabled={isRolling}
                    onClick={() => onRefine("Make the topline melody significantly catchier with a memorable 2-bar repeating motif and higher emotional payoff.")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-studio-850 hover:bg-studio-800 border border-studio-750 text-xs text-studio-200 hover:text-studio-amber transition-colors disabled:opacity-50"
                >
                    <Sparkles size={13} className="text-studio-amber" />
                    <span>⚡ Make it Catchier</span>
                </button>

                <button
                    type="button"
                    disabled={isRolling}
                    onClick={() => onRefine("Make the harmony darker and moodier. Use deeper minor extensions, slow filter sweeps on chords, and heavier sub bass pocket.")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-studio-850 hover:bg-studio-800 border border-studio-750 text-xs text-studio-200 hover:text-studio-amber transition-colors disabled:opacity-50"
                >
                    <Moon size={13} className="text-studio-ledPurple" />
                    <span>🌙 Make it Darker</span>
                </button>

                <button
                    type="button"
                    disabled={isRolling}
                    onClick={() => onRefine("Simplify the lead melody and chord rhythm so there is maximum open breathing room for a singer to record a vocal over it.")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-studio-850 hover:bg-studio-800 border border-studio-750 text-xs text-studio-200 hover:text-studio-amber transition-colors disabled:opacity-50"
                >
                    <Mic size={13} className="text-studio-ledCyan" />
                    <span>🎙️ Simplify for Vocals</span>
                </button>

                <button
                    type="button"
                    disabled={isRolling}
                    onClick={() => onRefine("Reroll and produce exclusively new Drum Groove and Bassline patterns while keeping the chords and key rock solid.")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-studio-850 hover:bg-studio-800 border border-studio-750 text-xs text-studio-200 hover:text-studio-amber transition-colors disabled:opacity-50"
                >
                    <Drum size={13} className="text-studio-ledGreen" />
                    <span>🥁 Reroll Drums & Bass</span>
                </button>
            </div>
        </div>
    );
};
