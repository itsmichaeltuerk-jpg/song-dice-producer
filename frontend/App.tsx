import React, { useState, useCallback, useEffect } from 'react';
import { INITIAL_DICE, DEMO_ARRANGEMENT } from './constants';
import { DieState, Arrangement, MixerState, VibeSettings, SavedSession, ProducerEngine } from './types';
import { generateArrangementWithGemini } from './services/gemini';
import { audioEngine } from './services/audio';
import { downloadMidiFile } from './services/midi';
import { Die } from './components/Die';
import { Visualizer } from './components/Visualizer';
import { Mixer } from './components/Mixer';
import { VibeControls } from './components/VibeControls';
import { ProducerBriefModal } from './components/ProducerBriefModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { DiePickerModal } from './components/DiePickerModal';
import { OnboardingModal } from './components/OnboardingModal';
import { 
    Play, Square, Download, Dices, Loader2, History, 
    Sparkles, Plus, Check, HelpCircle, SlidersHorizontal, 
    Cpu, Bot, Zap, Copy, Code, ChevronDown, ChevronUp, Lock, Eye, EyeOff
} from 'lucide-react';

export default function App() {
    const [dice, setDice] = useState<DieState[]>(INITIAL_DICE);
    const [isRolling, setIsRolling] = useState(false);
    const [arrangement, setArrangement] = useState<Arrangement | null>(DEMO_ARRANGEMENT);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentBeat, setCurrentBeat] = useState(1);
    const [currentBar, setCurrentBar] = useState(1);
    const [isDownbeatPulse, setIsDownbeatPulse] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedSeed, setCopiedSeed] = useState(false);

    // Collapsible Sections State for Fluid Workflow
    const [isDiceTableOpen, setIsDiceTableOpen] = useState(true);
    const [isSequencerOpen, setIsSequencerOpen] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Engine Selection: 'gemini' vs 'procedural'
    const [producerEngine, setProducerEngine] = useState<ProducerEngine>('gemini');

    // Tabbed Studio Sidebar: 'mixer' or 'vibe'
    const [studioTab, setStudioTab] = useState<'mixer' | 'vibe'>('mixer');

    // Modals & Drawers
    const [isBriefOpen, setIsBriefOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
    const [editingDie, setEditingDie] = useState<DieState | null>(null);

    // Vibe Biases
    const [vibe, setVibe] = useState<VibeSettings>({
        darkness: 35,
        catchiness: 85,
        complexity: 40,
        space: 50,
        vocalRange: 'any',
        humanizePercent: 8
    });

    // Stem Mixer State
    const [mixer, setMixer] = useState<MixerState>({
        melody: { volume: 0.85, muted: false, solo: false },
        chords: { volume: 0.8, muted: false, solo: false },
        bass: { volume: 0.85, muted: false, solo: false },
        drums: { volume: 0.9, muted: false, solo: false },
        pad: { volume: 0.65, muted: false, solo: false },
        metronome: false,
        masterVolume: 0.85
    });

    // Session History
    const [history, setHistory] = useState<SavedSession[]>(() => {
        try {
            const saved = localStorage.getItem('songdice_history');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const handleToggleLock = useCallback((id: string) => {
        setDice(prev => prev.map(d => d.id === id ? { ...d, isLocked: !d.isLocked } : d));
    }, []);

    const handleSelectFaceValue = useCallback((dieId: string, newValue: string) => {
        setDice(prev => prev.map(d => d.id === dieId ? { ...d, value: newValue, isLocked: true } : d));
    }, []);

    const handleToggleOptionalDie = (id: string) => {
        setDice(prev => prev.map(d => d.id === id ? { ...d, isEnabled: !d.isEnabled } : d));
    };

    const recordHistoryItem = (arr: Arrangement, diceState: DieState[]) => {
        const item: SavedSession = {
            id: `session-${Date.now()}`,
            name: arr.title_working || 'Untitled Sketch',
            seedCode: arr.seedCode,
            timestamp: Date.now(),
            isFavorite: false,
            diceState: [...diceState],
            arrangement: arr
        };

        setHistory(prev => {
            const updated = [item, ...prev.slice(0, 19)];
            try {
                localStorage.setItem('songdice_history', JSON.stringify(updated));
            } catch {}
            return updated;
        });
    };

    const handleRoll = async (refinePrompt?: string) => {
        if (isRolling) return;

        setError(null);
        setIsRolling(true);
        audioEngine.stop();
        setIsPlaying(false);

        const newDice = dice.map(d => {
            if (d.isLocked || d.isEnabled === false) return d;
            const randomValue = d.options[Math.floor(Math.random() * d.options.length)];
            return { ...d, value: randomValue };
        });

        setDice(newDice);

        try {
            const newArrangement = await generateArrangementWithGemini(
                newDice, 
                vibe, 
                refinePrompt, 
                producerEngine
            );
            setArrangement(newArrangement);
            recordHistoryItem(newArrangement, newDice);
        } catch (err) {
            console.error("Roll generation error:", err);
            setError("Producer engine encountered an issue. Please try rolling again.");
        } finally {
            setIsRolling(false);
        }
    };

    const togglePlayback = useCallback(() => {
        if (isPlaying) {
            audioEngine.stop();
            setIsPlaying(false);
            setCurrentBeat(1);
            setCurrentBar(1);
        } else if (arrangement) {
            audioEngine.play(
                arrangement,
                mixer,
                (beat, bar) => {
                    setCurrentBeat(beat);
                    setCurrentBar(bar);
                    if (beat === 1) {
                        setIsDownbeatPulse(true);
                        setTimeout(() => setIsDownbeatPulse(false), 90);
                    }
                },
                () => {
                    setIsPlaying(false);
                    setCurrentBeat(1);
                    setCurrentBar(1);
                }
            );
            setIsPlaying(true);
        }
    }, [isPlaying, arrangement, mixer]);

    const handleRestoreSession = (session: SavedSession) => {
        setDice(session.diceState);
        setArrangement(session.arrangement);
        if (session.arrangement.engineUsed) {
            setProducerEngine(session.arrangement.engineUsed);
        }
        audioEngine.stop();
        setIsPlaying(false);
    };

    const handleToggleFavorite = (id: string) => {
        setHistory(prev => {
            const updated = prev.map(item => item.id === id ? { ...item, isFavorite: !item.isFavorite } : item);
            try { localStorage.setItem('songdice_history', JSON.stringify(updated)); } catch {}
            return updated;
        });
    };

    const handleLoadSeedCode = (seed: string) => {
        const found = history.find(h => h.seedCode.toLowerCase() === seed.toLowerCase());
        if (found) {
            handleRestoreSession(found);
        } else {
            handleRoll(`Match mood and key from hex seed: ${seed}`);
        }
    };

    const handleCopyHexSeed = () => {
        if (arrangement?.seedCode) {
            navigator.clipboard.writeText(arrangement.seedCode);
            setCopiedSeed(true);
            setTimeout(() => setCopiedSeed(false), 2000);
        }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (e.code === 'Space') {
                e.preventDefault();
                togglePlayback();
            } else if (e.code === 'KeyR' && !isRolling) {
                e.preventDefault();
                handleRoll();
            } else if (e.code === 'KeyE') {
                e.preventDefault();
                setIsBriefOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlayback, isRolling, dice, vibe, producerEngine]);

    useEffect(() => {
        audioEngine.updateMixer(mixer);
    }, [mixer]);

    const activeCoreDice = dice.filter(d => !d.isOptional);
    const optionalDice = dice.filter(d => d.isOptional);

    const lockedCount = dice.filter(d => d.isLocked).length;

    return (
        <div className="min-h-screen bg-studio-950 text-studio-200 font-sans flex flex-col antialiased">
            
            {/* Top Studio Header Bar with Global Sticky Roll & Transport Controls */}
            <header className="p-3 sm:p-4 border-b border-studio-800 flex flex-wrap justify-between items-center bg-studio-950/95 backdrop-blur-md sticky top-0 z-30 gap-2.5 sm:gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-studio-amber text-studio-950 flex items-center justify-center font-black shadow-[0_0_16px_rgba(245,158,11,0.4)]">
                        <Dices size={20} className="sm:w-[22px] sm:h-[22px]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base sm:text-xl font-black tracking-tighter text-white font-display">
                                SONG DICE
                            </h1>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-wider flex items-center gap-1 ${
                                isRolling 
                                    ? 'bg-red-500 text-white animate-on-air-pulse' 
                                    : 'bg-studio-850 text-studio-400 border border-studio-750'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isRolling ? 'bg-white' : 'bg-studio-500'}`} />
                                {isRolling ? 'PRODUCING' : 'READY'}
                            </span>
                        </div>
                        <p className="text-[10px] text-studio-400 font-mono hidden md:block">
                            Roll a starting point. Export the MIDI. Finish the song.
                        </p>
                    </div>
                </div>

                {/* Primary Global Controls: Sticky Header Roll + Play + Export + Engine Pill */}
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                    
                    {/* PRIMARY ROLL UNLOCKED ACTION BUTTON */}
                    <button
                        onClick={() => handleRoll()}
                        disabled={isRolling}
                        className="bg-studio-amber text-studio-950 px-3.5 sm:px-5 py-2 rounded-xl font-black text-xs sm:text-sm tracking-wider hover:bg-amber-400 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 shadow-amber-glow ring-1 ring-studio-amberGlow/50"
                        title="Roll Unlocked Dice (Keyboard shortcut: R)"
                    >
                        {isRolling ? (
                            <>
                                <Loader2 className="animate-spin" size={15} />
                                <span className="hidden sm:inline">PRODUCING...</span>
                                <span className="sm:hidden">ROLLING</span>
                            </>
                        ) : (
                            <>
                                <Dices size={16} />
                                <span>ROLL UNLOCKED</span>
                            </>
                        )}
                    </button>

                    {/* PLAY / STOP */}
                    <button
                        onClick={togglePlayback}
                        disabled={!arrangement || isRolling}
                        className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl font-black text-xs tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            isPlaying
                                ? 'bg-studio-amber text-studio-950 shadow-amber-glow ring-2 ring-studio-amberGlow'
                                : 'bg-studio-800 text-white hover:bg-studio-750 border border-studio-700'
                        }`}
                        title="Spacebar to Play/Stop"
                    >
                        {isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                        <span>{isPlaying ? 'STOP' : 'PLAY'}</span>
                    </button>

                    {/* EXPORT MIDI */}
                    <button
                        onClick={() => setIsBriefOpen(true)}
                        disabled={!arrangement || isRolling}
                        className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl font-bold text-xs bg-studio-800 text-white hover:bg-studio-750 border border-studio-700 disabled:opacity-50 transition-colors"
                        title="Export MIDI & Producer Brief (Keyboard shortcut: E)"
                    >
                        <Download size={14} />
                        <span className="hidden sm:inline">EXPORT MIDI</span>
                        <span className="sm:hidden">MIDI</span>
                    </button>

                    {/* ENGINE SWITCHER TOGGLE PILL */}
                    <div className="hidden lg:flex items-center p-0.5 bg-studio-900 border border-studio-750 rounded-xl font-mono text-[11px]">
                        <button
                            type="button"
                            onClick={() => setProducerEngine('gemini')}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
                                producerEngine === 'gemini'
                                    ? 'bg-studio-800 text-studio-amber font-bold shadow-sm'
                                    : 'text-studio-500 hover:text-studio-300'
                            }`}
                            title="Gemini 2.5 Flash Hex Stream AI Engine"
                        >
                            <Bot size={13} />
                            <span>AI Engine</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setProducerEngine('procedural')}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
                                producerEngine === 'procedural'
                                    ? 'bg-studio-800 text-studio-ledCyan font-bold shadow-sm'
                                    : 'text-studio-500 hover:text-studio-300'
                            }`}
                            title="Instant Local Procedural Theory Engine (0ms latency)"
                        >
                            <Cpu size={13} />
                            <span>Procedural</span>
                        </button>
                    </div>

                    {/* SESSION HISTORY */}
                    <button
                        onClick={() => setIsHistoryOpen(true)}
                        className="p-2 rounded-xl bg-studio-850 text-studio-300 hover:text-white hover:bg-studio-750 border border-studio-750 transition-colors relative"
                        title="Session History"
                    >
                        <History size={16} />
                        {history.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-studio-amber text-studio-950 font-mono font-bold text-[8px] flex items-center justify-center">
                                {history.length}
                            </span>
                        )}
                    </button>

                    {/* HELP / TOUR */}
                    <button
                        onClick={() => setIsOnboardingOpen(true)}
                        className="p-2 rounded-xl bg-studio-850 text-studio-400 hover:text-studio-amber hover:bg-studio-800 transition-colors"
                        title="How to Use"
                    >
                        <HelpCircle size={16} />
                    </button>
                </div>
            </header>

            {/* Main Application Flow */}
            <main className="flex-1 p-3.5 sm:p-5 max-w-7xl mx-auto w-full flex flex-col gap-5">
                
                {/* ═════════════════════════════════════════════════════════════
                    SECTION 1: THE STUDIO TABLE (COLLAPSIBLE DICE SECTION)
                    ═════════════════════════════════════════════════════════════ */}
                <div className="bg-studio-900/60 border border-studio-800/80 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 backdrop-blur-md transition-all">
                    
                    {/* Collapsible Section Header Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div 
                            onClick={() => setIsDiceTableOpen(!isDiceTableOpen)}
                            className="flex items-center gap-2 cursor-pointer select-none group"
                        >
                            <div className="p-1 rounded-lg bg-studio-850 border border-studio-750 text-studio-400 group-hover:text-studio-amber group-hover:border-studio-amber/50 transition-colors">
                                {isDiceTableOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xs font-mono text-studio-300 group-hover:text-white uppercase tracking-widest font-bold flex items-center gap-1.5 transition-colors">
                                        <Sparkles size={14} className="text-studio-amber" />
                                        The Studio Dice Table
                                    </h2>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-studio-850 border border-studio-750 text-studio-400">
                                        {lockedCount} of 7 Locked
                                    </span>
                                </div>
                                <p className="text-[11px] text-studio-500 font-mono mt-0.5">
                                    {isDiceTableOpen 
                                        ? "Click any die to lock/unlock. Tap edit to pick a specific face."
                                        : "Dice Table minimized. Click to expand full 3D studio dice."}
                                </p>
                            </div>
                        </div>

                        {/* Collapsed Compact Summary Chips */}
                        {!isDiceTableOpen && (
                            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-1">
                                {activeCoreDice.map(die => (
                                    <div 
                                        key={die.id}
                                        onClick={() => handleToggleLock(die.id)}
                                        className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer select-none transition-all ${
                                            die.isLocked
                                                ? 'bg-studio-amber/20 border-studio-amber text-studio-amber shadow-sm'
                                                : 'bg-studio-950 border-studio-800 text-studio-400 hover:text-white'
                                        }`}
                                        title={`Click to ${die.isLocked ? 'unlock' : 'lock'} ${die.category}`}
                                    >
                                        {die.isLocked && <Lock size={10} />}
                                        <span className="text-studio-500">{die.shortLabel}:</span>
                                        <span className="text-white truncate max-w-[80px]">{die.value.split('•')[0].trim()}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Quick Roll Button */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleRoll()}
                                disabled={isRolling}
                                className="bg-studio-amber text-studio-950 px-4 sm:px-6 py-2 rounded-xl font-black text-xs sm:text-sm tracking-wider hover:bg-amber-400 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-amber-glow"
                            >
                                {isRolling ? (
                                    <>
                                        <Loader2 className="animate-spin" size={15} />
                                        <span>PRODUCING...</span>
                                    </>
                                ) : (
                                    <>
                                        <Dices size={15} />
                                        <span>ROLL</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Expanded 3D Dice Matrix & Tray */}
                    {isDiceTableOpen && (
                        <div className="flex flex-col gap-4 pt-1 animate-fade-in">
                            {/* 7 Tactile 3D Physical Dice */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3 justify-items-center">
                                {activeCoreDice.map(die => (
                                    <Die
                                        key={die.id}
                                        die={die}
                                        onToggleLock={handleToggleLock}
                                        onOpenEdit={setEditingDie}
                                        isRolling={isRolling}
                                        isDownbeatPulse={isDownbeatPulse}
                                    />
                                ))}
                            </div>

                            {/* Extra Dice Tray & Session Hex Seed Chip */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-studio-800/70 text-xs font-mono">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] text-studio-500 uppercase tracking-wider mr-1">
                                        Extra Tray:
                                    </span>
                                    {optionalDice.map(die => (
                                        <button
                                            key={die.id}
                                            type="button"
                                            onClick={() => handleToggleOptionalDie(die.id)}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                                                die.isEnabled
                                                    ? 'bg-studio-amber/20 border border-studio-amber text-studio-amber'
                                                    : 'bg-studio-850 border border-studio-750 text-studio-400 hover:text-white'
                                            }`}
                                        >
                                            {die.isEnabled ? <Check size={11} /> : <Plus size={11} />}
                                            <span>{die.category} ({die.value.split('•')[0].trim()})</span>
                                        </button>
                                    ))}
                                </div>

                                {arrangement?.seedCode && (
                                    <div className="flex items-center gap-2 bg-studio-950 px-2.5 py-1 rounded-lg border border-studio-800">
                                        <Code size={13} className="text-studio-amber" />
                                        <span className="text-[10px] text-studio-400 truncate max-w-[140px] sm:max-w-xs">{arrangement.seedCode}</span>
                                        <button
                                            type="button"
                                            onClick={handleCopyHexSeed}
                                            className="text-studio-500 hover:text-studio-amber transition-colors"
                                            title="Copy Shareable Hex Seed"
                                        >
                                            {copiedSeed ? <Check size={12} className="text-studio-amber" /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-900/20 border border-red-900/50 text-red-400 rounded-xl text-xs font-mono flex items-center justify-between">
                            <span>{error}</span>
                            <button
                                onClick={() => {
                                    setProducerEngine('procedural');
                                    handleRoll();
                                }}
                                className="underline font-bold hover:text-white ml-2"
                            >
                                Switch to Procedural Engine
                            </button>
                        </div>
                    )}
                </div>

                {/* ═════════════════════════════════════════════════════════════
                    SECTION 2: PRODUCER WORKSPACE (COLLAPSIBLE PIANO ROLL & MIXER)
                    ═════════════════════════════════════════════════════════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    
                    {/* Left: Visualizer & Piano Roll (Expandable/Collapsible) */}
                    <div className={`${isSidebarOpen ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col gap-4 transition-all`}>
                        <div className="relative">
                            {/* Collapse Toggle for Visualizer */}
                            <button
                                type="button"
                                onClick={() => setIsSequencerOpen(!isSequencerOpen)}
                                className="absolute top-4 right-4 z-20 p-1.5 rounded-lg bg-studio-850/80 border border-studio-750 text-studio-400 hover:text-studio-amber hover:bg-studio-800 transition-colors flex items-center gap-1 text-[10px] font-mono"
                                title={isSequencerOpen ? "Collapse Sequencer" : "Expand Sequencer"}
                            >
                                {isSequencerOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                <span className="hidden sm:inline">{isSequencerOpen ? 'Collapse' : 'Expand'}</span>
                            </button>

                            {isSequencerOpen ? (
                                <Visualizer
                                    arrangement={arrangement}
                                    isPlaying={isPlaying}
                                    currentBeat={currentBeat}
                                    currentBar={currentBar}
                                    onTogglePlay={togglePlayback}
                                />
                            ) : (
                                /* Minimized Playback Strip */
                                <div className="p-4 bg-studio-900/90 border border-studio-800 rounded-2xl flex items-center justify-between gap-3 shadow-xl">
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={togglePlayback}
                                            className={`p-2.5 rounded-xl font-bold text-xs transition-all ${
                                                isPlaying ? 'bg-studio-amber text-studio-950 shadow-amber-glow' : 'bg-studio-800 text-white hover:bg-studio-700'
                                            }`}
                                        >
                                            {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                                        </button>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white text-sm">{arrangement?.title_working || 'Song Dice Loop'}</span>
                                                <span className="text-xs font-mono text-studio-amber font-bold">{arrangement?.bpm} BPM</span>
                                                <span className="text-xs font-mono text-studio-300 font-bold">{arrangement?.key}</span>
                                            </div>
                                            <p className="text-[11px] text-studio-400 font-mono mt-0.5">
                                                {isPlaying ? `Playing Bar ${currentBar}.${Math.floor(currentBeat)}` : 'Playback Paused'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsSequencerOpen(true)}
                                        className="text-xs font-mono text-studio-amber hover:underline flex items-center gap-1"
                                    >
                                        <span>Show Piano Roll</span>
                                        <ChevronDown size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Tabbed Mixer / Vibe Controls (Collapsible) */}
                    {isSidebarOpen && (
                        <div className="lg:col-span-4 flex flex-col gap-3">
                            
                            {/* Tab Switcher & Collapse Button */}
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 flex p-1 bg-studio-900 border border-studio-800 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setStudioTab('mixer')}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
                                            studioTab === 'mixer'
                                                ? 'bg-studio-800 text-studio-amber shadow-sm'
                                                : 'text-studio-400 hover:text-white'
                                        }`}
                                    >
                                        <SlidersHorizontal size={13} />
                                        <span>Stem Mixer</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStudioTab('vibe')}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
                                            studioTab === 'vibe'
                                                ? 'bg-studio-800 text-studio-amber shadow-sm'
                                                : 'text-studio-400 hover:text-white'
                                        }`}
                                    >
                                        <SlidersHorizontal size={13} />
                                        <span>Vibe & Refine</span>
                                    </button>
                                </div>
                            </div>

                            {/* Active Panel */}
                            {studioTab === 'mixer' ? (
                                <Mixer
                                    mixer={mixer}
                                    onChangeMixer={setMixer}
                                />
                            ) : (
                                <VibeControls
                                    vibe={vibe}
                                    onChangeVibe={setVibe}
                                    onRefine={(instruction) => handleRoll(instruction)}
                                    isRolling={isRolling}
                                />
                            )}

                            {/* Producer Engine Status Box */}
                            <div className="bg-studio-950/70 rounded-xl p-3 border border-studio-850 flex flex-col gap-1.5 text-xs font-mono">
                                <div className="flex items-center justify-between text-studio-400">
                                    <span className="flex items-center gap-1.5">
                                        <Zap size={13} className="text-studio-amber" />
                                        Active Engine:
                                    </span>
                                    <span className="text-white font-bold">
                                        {producerEngine === 'gemini' ? 'Gemini Hex AI (0x80 steps)' : 'Procedural Music Theory'}
                                    </span>
                                </div>
                                <p className="text-[10px] text-studio-500 leading-normal">
                                    {producerEngine === 'gemini' 
                                        ? 'High-speed hex-encoded generative AI arrangement model with zero GC lag.' 
                                        : 'Instant deterministic 0ms composer using scale modes and voice leading.'}
                                </p>
                            </div>

                            {/* Shortcuts */}
                            <div className="bg-studio-950/60 rounded-xl p-3 border border-studio-850 text-[11px] font-mono text-studio-400 flex justify-between items-center">
                                <span><kbd className="px-1.5 py-0.5 rounded bg-studio-800 text-studio-amber font-bold">Space</kbd> Play</span>
                                <span><kbd className="px-1.5 py-0.5 rounded bg-studio-800 text-studio-amber font-bold">R</kbd> Roll</span>
                                <span><kbd className="px-1.5 py-0.5 rounded bg-studio-800 text-studio-amber font-bold">E</kbd> Export</span>
                            </div>
                        </div>
                    )}

                </div>

            </main>

            {/* Modals & Drawers */}
            <ProducerBriefModal
                arrangement={arrangement}
                isOpen={isBriefOpen}
                onClose={() => setIsBriefOpen(false)}
                humanizePercent={vibe.humanizePercent}
                onChangeHumanize={(p) => setVibe(v => ({ ...v, humanizePercent: p }))}
            />

            <HistoryDrawer
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                history={history}
                onRestoreSession={handleRestoreSession}
                onToggleFavorite={handleToggleFavorite}
                onClearHistory={() => {
                    setHistory([]);
                    try { localStorage.removeItem('songdice_history'); } catch {}
                }}
                onLoadSeedCode={handleLoadSeedCode}
            />

            <DiePickerModal
                die={editingDie}
                isOpen={editingDie !== null}
                onClose={() => setEditingDie(null)}
                onSelectValue={handleSelectFaceValue}
            />

            <OnboardingModal
                isOpen={isOnboardingOpen}
                onClose={() => setIsOnboardingOpen(false)}
            />
        </div>
    );
}
