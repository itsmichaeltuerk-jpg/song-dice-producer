import React, { useState, useCallback, useEffect } from 'react';
import { INITIAL_DICE } from './constants';
import { DieState, Arrangement } from './types';
import { generateArrangement } from './services/gemini';
import { audio } from './services/audio';
import { downloadMidi } from './services/midi';
import { Die } from './components/Die';
import { Visualizer } from './components/Visualizer';
import { Play, Square, Download, Dices, Loader2, Sparkles, Info, Sliders, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const LOADING_PHRASES = [
    "Patching cables...",
    "Warming up tubes...",
    "Writing bassline...",
    "Tuning the snare...",
    "Finding the pocket...",
    "Bouncing stems..."
];

export default function App() {
    const [dice, setDice] = useState<DieState[]>(INITIAL_DICE);
    const [isRolling, setIsRolling] = useState(false);
    const [loadingText, setLoadingText] = useState(LOADING_PHRASES[0]);
    const [arrangement, setArrangement] = useState<Arrangement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentBeat, setCurrentBeat] = useState(0);
    const [currentBar, setCurrentBar] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [geminiError, setGeminiError] = useState<string | null>(null);
    const [fallbackSuccess, setFallbackSuccess] = useState<boolean>(false);
    const [isErrorExpanded, setIsErrorExpanded] = useState<boolean>(false);
    
    // FX State
    const [reverb, setReverb] = useState(0.2);
    const [delay, setDelay] = useState(0.1);

    const handleToggleLock = useCallback((id: string) => {
        setDice(prev => prev.map(d => d.id === id ? { ...d, isLocked: !d.isLocked } : d));
    }, []);

    // Cycle loading text to make the wait feel shorter
    useEffect(() => {
        let interval: number;
        if (isRolling) {
            let i = 0;
            interval = window.setInterval(() => {
                i = (i + 1) % LOADING_PHRASES.length;
                setLoadingText(LOADING_PHRASES[i]);
            }, 800);
        }
        return () => clearInterval(interval);
    }, [isRolling]);

    // Update Audio Engine FX
    useEffect(() => {
        audio.setReverbLevel(reverb);
    }, [reverb]);

    useEffect(() => {
        audio.setDelayLevel(delay);
    }, [delay]);

    const handleRoll = async () => {
        if (isRolling) return;
        
        setError(null);
        setGeminiError(null);
        setFallbackSuccess(false);
        setIsRolling(true);
        setLoadingText(LOADING_PHRASES[0]);
        audio.stop();
        setIsPlaying(false);

        const newDice = dice.map(d => {
            if (d.isLocked) return d;
            const randomValue = d.options[Math.floor(Math.random() * d.options.length)];
            return { ...d, value: randomValue };
        });
        
        setDice(newDice);

        try {
            const result = await generateArrangement(newDice);
            setArrangement(result.arrangement);
            if (result.isFallback) {
                setGeminiError(result.geminiError);
                setFallbackSuccess(true);
            } else {
                setGeminiError(null);
                setFallbackSuccess(false);
            }
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Failed to generate arrangement. Try rolling again.");
            setFallbackSuccess(false);
        } finally {
            setIsRolling(false);
        }
    };

    const togglePlayback = () => {
        if (isPlaying) {
            audio.stop();
            setIsPlaying(false);
            setCurrentBeat(0);
            setCurrentBar(1);
        } else if (arrangement) {
            audio.play(
                arrangement, 
                (beat, bar) => {
                    setCurrentBeat(beat);
                    setCurrentBar(bar);
                },
                () => { 
                    setIsPlaying(false); 
                    setCurrentBeat(0);
                    setCurrentBar(1);
                }
            );
            setIsPlaying(true);
        }
    };

    const handleExport = () => {
        if (arrangement) {
            downloadMidi(arrangement);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                togglePlayback();
            } else if (e.code === 'KeyR' && !isRolling) {
                handleRoll();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, arrangement, isRolling, dice]);

    return (
        <div className="min-h-screen bg-studio-950 text-studio-200 font-sans selection:bg-studio-amber/30 flex flex-col relative overflow-hidden">
            {/* Subtle noise texture overlay for that vinyl/dust feel */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

            {/* Header */}
            <header className="p-4 sm:p-6 border-b border-studio-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-studio-950/90 backdrop-blur-xl sticky top-0 z-10 shadow-lg">
                <div>
                    <h1 className="text-2xl font-black tracking-tighter text-white flex items-center gap-2 drop-shadow-md">
                        <Dices className="text-studio-amber" />
                        SONG DICE
                    </h1>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-studio-500 font-mono">Roll a starting point. Export the MIDI.</p>
                        
                        <div className="group relative flex items-center gap-1 text-[10px] bg-studio-800/50 text-studio-400 px-2 py-0.5 rounded-full border border-studio-700/50 cursor-help transition-colors hover:bg-studio-800">
                            <Sparkles size={10} className="text-studio-amber" />
                            Fast Mode Active
                            <Info size={10} className="ml-1 opacity-50" />
                            
                            <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-studio-800 border border-studio-700 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-xs text-studio-300 normal-case font-sans">
                                <strong className="text-white block mb-1">Speed Optimization:</strong>
                                Powered by Gemini with local procedural matrix fallback. The AI uses an efficient step-sequencer format to compose 4-bar arrangements with immediate playback and MIDI export.
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Transport Controls */}
                <div className="flex gap-3 w-full sm:w-auto">
                    <button 
                        id="play-button"
                        onClick={togglePlayback}
                        disabled={!arrangement || isRolling}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-bold transition-all shadow-md ${
                            isPlaying 
                                ? 'bg-studio-800 text-studio-amber border border-studio-amber/50 playing-pulse' 
                                : 'bg-gradient-to-b from-studio-700 to-studio-800 text-white hover:from-studio-600 hover:to-studio-700 border border-studio-600/50 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                    >
                        {isPlaying ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                        {isPlaying ? 'STOP' : 'PLAY'}
                    </button>
                    
                    <button 
                        id="export-midi-button"
                        onClick={handleExport}
                        disabled={!arrangement || isRolling}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-bold bg-gradient-to-b from-studio-800 to-studio-900 text-white hover:from-studio-700 hover:to-studio-800 border border-studio-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                    >
                        <Download size={18} />
                        MIDI
                    </button>
                </div>
            </header>

            <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full flex flex-col xl:flex-row gap-8 relative z-0">
                
                {/* Left Column: Dice Table & FX */}
                <div className="flex-1 flex flex-col gap-6">
                    <div className="flex justify-between items-end">
                        <h2 className="text-sm font-mono text-studio-400 uppercase tracking-widest">The Table</h2>
                        <button 
                            id="roll-dice-button"
                            onClick={handleRoll}
                            disabled={isRolling}
                            className="bg-gradient-to-b from-amber-400 to-studio-amber text-studio-950 px-6 py-3 rounded-xl font-black tracking-wide hover:from-amber-300 hover:to-amber-500 active:scale-95 transition-all disabled:opacity-80 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)] border border-amber-300/50 min-w-[200px] justify-center"
                        >
                            {isRolling ? <Loader2 className="animate-spin" size={20} /> : <Dices size={20} />}
                            {isRolling ? loadingText : 'ROLL UNLOCKED'}
                        </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 justify-center xl:justify-start">
                        {dice.map(die => (
                            <Die 
                                key={die.id} 
                                die={die} 
                                onToggleLock={handleToggleLock} 
                                isRolling={isRolling} 
                            />
                        ))}
                    </div>

                    {/* Studio FX Panel */}
                    <div className="bg-studio-900/50 p-5 rounded-xl border border-studio-800/50 mt-2 max-w-md">
                        <h3 className="text-xs font-mono text-studio-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                            <Sliders size={14} /> Studio FX
                        </h3>
                        <div className="space-y-5">
                            <div>
                                <div className="flex justify-between text-xs mb-2 text-studio-300 font-mono">
                                    <span>Reverb Send</span>
                                    <span className="text-studio-amber">{Math.round(reverb * 100)}%</span>
                                </div>
                                <input 
                                    id="reverb-slider"
                                    type="range" 
                                    min="0" max="1" step="0.01" 
                                    value={reverb} 
                                    onChange={(e) => setReverb(parseFloat(e.target.value))} 
                                />
                            </div>
                            <div>
                                <div className="flex justify-between text-xs mb-2 text-studio-300 font-mono">
                                    <span>Delay Send (Dotted 8th)</span>
                                    <span className="text-studio-amber">{Math.round(delay * 100)}%</span>
                                </div>
                                <input 
                                    id="delay-slider"
                                    type="range" 
                                    min="0" max="1" step="0.01" 
                                    value={delay} 
                                    onChange={(e) => setDelay(parseFloat(e.target.value))} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Gemini Error & Fallback Status Panel (Collapsible to save room) */}
                    {geminiError && (
                        <div id="gemini-error-panel" className="bg-red-950/40 border border-red-800/60 rounded-xl backdrop-blur-sm shadow-lg overflow-hidden transition-all">
                            {/* Header Toggle */}
                            <button
                                id="toggle-gemini-error-button"
                                onClick={() => setIsErrorExpanded(!isErrorExpanded)}
                                className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-red-900/20 transition-colors"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <AlertTriangle className="text-red-400 shrink-0" size={16} />
                                    <span className="text-xs font-bold font-mono text-red-300 truncate">
                                        Gemini API Notice {fallbackSuccess ? '(Procedural Fallback Active)' : ''}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {fallbackSuccess && (
                                        <span className="text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <CheckCircle2 size={11} /> Active
                                        </span>
                                    )}
                                    {isErrorExpanded ? <ChevronUp size={16} className="text-red-400" /> : <ChevronDown size={16} className="text-red-400" />}
                                </div>
                            </button>

                            {/* Collapsible Content */}
                            {isErrorExpanded && (
                                <div className="p-4 pt-1 border-t border-red-900/50 space-y-2.5">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] uppercase tracking-wider text-red-400 font-bold font-mono">Raw API Diagnostic:</span>
                                        <p className="text-xs text-red-200/90 font-mono break-words leading-relaxed bg-red-950/70 p-2.5 rounded-lg border border-red-900/60 max-h-40 overflow-y-auto">
                                            {geminiError}
                                        </p>
                                    </div>

                                    {fallbackSuccess && (
                                        <div id="fallback-success-indicator" className="pt-2 border-t border-red-900/40 flex items-center gap-2 text-emerald-400 font-bold text-xs tracking-wide">
                                            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                                            <span>Procedural Music Theory Fallback Successful</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {error && !fallbackSuccess && (
                        <div id="fatal-error-panel" className="p-4 bg-red-900/30 border border-red-800/60 text-red-300 rounded-xl text-sm font-mono backdrop-blur-sm">
                            {error}
                        </div>
                    )}
                </div>

                {/* Right Column: Visualizer & Info */}
                <div className="w-full xl:w-[450px] flex flex-col gap-6 h-[600px]">
                    <h2 className="text-sm font-mono text-studio-400 uppercase tracking-widest">Output</h2>
                    <Visualizer 
                        arrangement={arrangement} 
                        isPlaying={isPlaying} 
                        currentBeat={currentBeat} 
                        currentBar={currentBar}
                    />
                </div>

            </main>
        </div>
    );
}
