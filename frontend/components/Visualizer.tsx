import React, { useState } from 'react';
import { Arrangement } from '../types';
import { FileText, Activity, Lightbulb, ArrowRight, Grid3X3 } from 'lucide-react';

interface VisualizerProps {
    arrangement: Arrangement | null;
    isPlaying: boolean;
    currentBeat: number;
}

// Helper to render a mini step sequencer row
const StepRow = ({ label, stepString }: { label: string, stepString: string }) => {
    if (!stepString) return null;
    const steps = stepString.trim().split(/\s+/).slice(0, 16); // Show first bar only for UI brevity
    
    return (
        <div className="flex items-center gap-2 mb-1">
            <div className="w-10 text-[10px] text-studio-500 font-mono uppercase text-right">{label}</div>
            <div className="flex gap-1 flex-1">
                {steps.map((step, i) => (
                    <div 
                        key={i} 
                        className={`flex-1 h-4 rounded-sm border ${
                            step === 'X' || (step !== '-' && step !== '.') 
                                ? 'bg-studio-amber border-studio-amber shadow-[0_0_5px_rgba(245,158,11,0.5)]' 
                                : step === '.' 
                                    ? 'bg-studio-amber/30 border-studio-amber/20'
                                    : 'bg-studio-950 border-studio-800'
                        } ${i % 4 === 0 ? 'ml-1' : ''}`} // Group by beats
                    />
                ))}
            </div>
        </div>
    );
};

export const Visualizer: React.FC<VisualizerProps> = ({ arrangement, isPlaying, currentBeat }) => {
    const [activeTab, setActiveTab] = useState<'preview' | 'brief'>('preview');

    if (!arrangement) {
        return (
            <div className="w-full h-64 bg-studio-900 rounded-xl border border-studio-800 flex flex-col items-center justify-center text-studio-500 font-mono text-sm gap-4">
                <Activity size={32} className="opacity-20" />
                Roll dice to generate arrangement
            </div>
        );
    }

    return (
        <div className="w-full bg-studio-900 rounded-xl border border-studio-800 overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-studio-800 bg-studio-950/50">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="text-white font-bold text-lg">{arrangement.title_working}</h3>
                        <p className="text-studio-400 text-xs italic">"{arrangement.logline}"</p>
                    </div>
                    <div className="text-right font-mono text-xs text-studio-amber bg-studio-amber/10 px-2 py-1 rounded">
                        {arrangement.bpm} BPM | {arrangement.key}
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-4 mt-4 border-b border-studio-800">
                    <button 
                        onClick={() => setActiveTab('preview')}
                        className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'preview' ? 'text-studio-amber border-b-2 border-studio-amber' : 'text-studio-500 hover:text-studio-300'}`}
                    >
                        <span className="flex items-center gap-1"><Activity size={14} /> Preview</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('brief')}
                        className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'brief' ? 'text-studio-amber border-b-2 border-studio-amber' : 'text-studio-500 hover:text-studio-300'}`}
                    >
                        <span className="flex items-center gap-1"><FileText size={14} /> Producer Brief</span>
                    </button>
                </div>
            </div>
            
            {/* Content Area */}
            <div className="p-4 flex-1 overflow-y-auto">
                {activeTab === 'preview' ? (
                    <div className="flex flex-col gap-6 h-full justify-start pt-2">
                        {/* Beat Visualizer */}
                        <div className="flex gap-2 h-12 items-end justify-center mb-4">
                            {[1, 2, 3, 4].map(beat => (
                                <div 
                                    key={beat}
                                    className={`w-12 rounded-t-md transition-all duration-75 ${
                                        isPlaying && currentBeat === beat 
                                            ? 'h-full bg-studio-amber shadow-[0_0_15px_rgba(245,158,11,0.6)]' 
                                            : 'h-2 bg-studio-800'
                                    }`}
                                />
                            ))}
                        </div>
                        
                        {/* Chord Chart */}
                        <div className="text-center mb-4">
                            <div className="text-xs text-studio-500 font-mono uppercase tracking-widest mb-2">Progression</div>
                            <div className="font-mono text-lg text-white bg-studio-950 py-3 px-4 rounded-lg border border-studio-800 inline-block">
                                {arrangement.chord_progression_text || "No chords specified"}
                            </div>
                        </div>

                        {/* Mini Step Sequencer (Bar 1) */}
                        <div className="bg-studio-950 p-3 rounded-lg border border-studio-800">
                            <div className="text-[10px] text-studio-500 font-mono uppercase tracking-widest mb-3 flex items-center gap-1">
                                <Grid3X3 size={12} /> Pattern (Bar 1)
                            </div>
                            <StepRow label="HAT" stepString={arrangement.step_drums_hat} />
                            <StepRow label="SNR" stepString={arrangement.step_drums_snare} />
                            <StepRow label="KCK" stepString={arrangement.step_drums_kick} />
                            <div className="h-2"></div>
                            <StepRow label="BASS" stepString={arrangement.step_bass} />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 text-sm">
                        {/* Producer Notes */}
                        <section>
                            <h4 className="text-studio-300 font-bold mb-2 flex items-center gap-2">
                                <Lightbulb size={16} className="text-studio-amber" /> 
                                Arrangement Notes
                            </h4>
                            <p className="text-studio-400 leading-relaxed">
                                {arrangement.arrangement_notes}
                            </p>
                        </section>

                        {/* Hook Reason */}
                        {arrangement.hook_reason && (
                            <section>
                                <h4 className="text-studio-300 font-bold mb-2">Why it works</h4>
                                <p className="text-studio-400 leading-relaxed">
                                    {arrangement.hook_reason}
                                </p>
                            </section>
                        )}

                        {/* Next Moves */}
                        {arrangement.next_moves && arrangement.next_moves.length > 0 && (
                            <section>
                                <h4 className="text-studio-300 font-bold mb-2">Next Moves in DAW</h4>
                                <ul className="space-y-2">
                                    {arrangement.next_moves.map((move, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-studio-400">
                                            <ArrowRight size={14} className="text-studio-600 mt-1 shrink-0" />
                                            <span>{move}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
