import React, { useState, useEffect } from 'react';
import { Arrangement } from '../types';
import { FileText, Activity, Lightbulb, ArrowRight, Grid3X3, Music } from 'lucide-react';

interface VisualizerProps {
    arrangement: Arrangement | null;
    isPlaying: boolean;
    currentBeat: number;
    currentBar?: number;
}

// Helper to render a mini step sequencer row for any selected bar
const StepRow = ({ label, stepString, barIndex = 0 }: { label: string; stepString: string; barIndex?: number }) => {
    if (!stepString) return null;
    const allSteps = stepString.trim().split(/\s+/);
    const start = barIndex * 16;
    let steps = allSteps.slice(start, start + 16);
    if (steps.length < 16) {
        steps = allSteps.slice(0, 16);
    }
    
    return (
        <div className="flex items-center gap-2 mb-1">
            <div className="w-10 text-[10px] text-studio-500 font-mono uppercase text-right shrink-0">{label}</div>
            <div className="flex gap-1 flex-1">
                {steps.map((step, i) => (
                    <div 
                        key={i} 
                        className={`flex-1 h-4 rounded-sm border transition-colors duration-75 ${
                            step === 'X' || (step !== '-' && step !== '.') 
                                ? 'bg-studio-amber border-studio-amber shadow-[0_0_5px_rgba(245,158,11,0.5)]' 
                                : step === '.' 
                                    ? 'bg-studio-amber/30 border-studio-amber/20'
                                    : 'bg-studio-950 border-studio-800'
                        } ${i % 4 === 0 && i > 0 ? 'ml-1' : ''}`} // Group by beats
                    />
                ))}
            </div>
        </div>
    );
};

export const Visualizer: React.FC<VisualizerProps> = ({ arrangement, isPlaying, currentBeat, currentBar = 1 }) => {
    const [activeTab, setActiveTab] = useState<'preview' | 'brief'>('preview');
    const [selectedBar, setSelectedBar] = useState<number>(1);

    const totalBars = arrangement?.bars_total || 8;

    // Follow active playing bar during playback
    useEffect(() => {
        if (isPlaying && currentBar) {
            setSelectedBar(currentBar);
        }
    }, [isPlaying, currentBar]);

    // Reset to bar 1 when arrangement changes
    useEffect(() => {
        setSelectedBar(1);
    }, [arrangement]);

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
                <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="min-w-0">
                        <h3 className="text-white font-bold text-lg truncate">{arrangement.title_working}</h3>
                        <p className="text-studio-400 text-xs italic truncate">"{arrangement.logline}"</p>
                    </div>
                    <div className="text-right font-mono text-xs text-studio-amber bg-studio-amber/10 px-2.5 py-1 rounded border border-studio-amber/20 whitespace-nowrap shrink-0">
                        {arrangement.bpm} BPM | {arrangement.key} | {totalBars} BARS
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-4 mt-4 border-b border-studio-800">
                    <button 
                        id="tab-preview-button"
                        onClick={() => setActiveTab('preview')}
                        className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'preview' ? 'text-studio-amber border-b-2 border-studio-amber' : 'text-studio-500 hover:text-studio-300'}`}
                    >
                        <span className="flex items-center gap-1"><Activity size={14} /> Preview</span>
                    </button>
                    <button 
                        id="tab-brief-button"
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
                    <div className="flex flex-col gap-5 h-full justify-start pt-1">
                        {/* Playhead Status & Beat Visualizer */}
                        <div className="flex flex-col items-center gap-2 mb-1">
                            <div className="flex items-center justify-between w-full font-mono text-xs px-2 text-studio-400">
                                <span className="flex items-center gap-1.5 font-bold">
                                    <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-studio-amber animate-ping' : 'bg-studio-700'}`} />
                                    BAR {isPlaying ? currentBar : selectedBar} / {totalBars}
                                </span>
                                <span className="text-studio-amber font-mono font-bold">
                                    BEAT {isPlaying ? currentBeat : 1} / 4
                                </span>
                            </div>

                            {/* 4 Beat Meters */}
                            <div className="flex gap-2 h-10 items-end justify-center w-full">
                                {[1, 2, 3, 4].map(beat => (
                                    <div 
                                        key={beat}
                                        className={`flex-1 max-w-[70px] rounded-t-md transition-all duration-75 ${
                                            isPlaying && currentBeat === beat 
                                                ? 'h-full bg-studio-amber shadow-[0_0_15px_rgba(245,158,11,0.6)]' 
                                                : 'h-2 bg-studio-800'
                                        }`}
                                    />
                                ))}
                            </div>

                            {/* Bar Step Indicator Pills */}
                            <div className="flex gap-1.5 w-full justify-center mt-1">
                                {Array.from({ length: totalBars }).map((_, barIdx) => {
                                    const barNum = barIdx + 1;
                                    const isCurrentPlaying = isPlaying && currentBar === barNum;
                                    const isSelected = selectedBar === barNum;
                                    return (
                                        <button
                                            key={barNum}
                                            id={`bar-select-${barNum}`}
                                            onClick={() => setSelectedBar(barNum)}
                                            className={`flex-1 h-2 rounded-full transition-all ${
                                                isCurrentPlaying 
                                                    ? 'bg-studio-amber shadow-[0_0_8px_rgba(245,158,11,0.8)] scale-y-125' 
                                                    : isSelected 
                                                        ? 'bg-studio-amber/60' 
                                                        : 'bg-studio-800 hover:bg-studio-700'
                                            }`}
                                            title={`Bar ${barNum}`}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                        
                        {/* Chord Chart */}
                        <div className="text-center">
                            <div className="text-xs text-studio-500 font-mono uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1.5">
                                <Music size={12} /> Harmonic Progression
                            </div>
                            <div className="font-mono text-base sm:text-lg text-white bg-studio-950 py-2.5 px-4 rounded-lg border border-studio-800 inline-block shadow-inner">
                                {arrangement.chord_progression_text || "No chords specified"}
                            </div>
                        </div>

                        {/* Step Sequencer Matrix with Bar Navigation */}
                        <div className="bg-studio-950 p-3.5 rounded-lg border border-studio-800 space-y-2">
                            <div className="flex items-center justify-between text-[10px] text-studio-500 font-mono uppercase tracking-widest mb-2 border-b border-studio-900 pb-2">
                                <div className="flex items-center gap-1">
                                    <Grid3X3 size={12} className="text-studio-amber" /> Pattern Matrix (Bar {selectedBar} of {totalBars})
                                </div>
                                <div className="flex gap-1">
                                    {Array.from({ length: Math.min(totalBars, 8) }).map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedBar(i + 1)}
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                                                selectedBar === i + 1 
                                                    ? 'bg-studio-amber text-studio-950 font-bold' 
                                                    : 'text-studio-400 hover:text-white bg-studio-900'
                                            }`}
                                        >
                                            B{i + 1}
                                        </button>
                                    ))}
                                    {totalBars > 8 && (
                                        <span className="text-studio-600 self-center">...</span>
                                    )}
                                </div>
                            </div>
                            <StepRow label="MEL" stepString={arrangement.step_melody} barIndex={selectedBar - 1} />
                            <StepRow label="CHD" stepString={arrangement.step_chords} barIndex={selectedBar - 1} />
                            <StepRow label="BAS" stepString={arrangement.step_bass} barIndex={selectedBar - 1} />
                            <div className="h-1 border-t border-studio-900/60 my-1"></div>
                            <StepRow label="HAT" stepString={arrangement.step_drums_hat} barIndex={selectedBar - 1} />
                            <StepRow label="SNR" stepString={arrangement.step_drums_snare} barIndex={selectedBar - 1} />
                            <StepRow label="KCK" stepString={arrangement.step_drums_kick} barIndex={selectedBar - 1} />
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
