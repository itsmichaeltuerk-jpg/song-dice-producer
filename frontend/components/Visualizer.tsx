import React, { useState, useMemo } from 'react';
import { 
    Play, Square, Layers, Grid, BarChart2, Sparkles, 
    Mic2, Volume2, Music2, Info, ChevronRight, Activity, Zap, Code
} from 'lucide-react';
import { Arrangement, NoteEvent, StemTrack } from '../types';
import { buildHexArrangementMemory, toHex2, midiToNoteName, midiToDrumPieceName } from '../services/hexSequencer';

interface VisualizerProps {
    arrangement: Arrangement | null;
    isPlaying: boolean;
    currentBeat: number; // 1.0 to 4.0
    currentBar: number;  // 1 to 8/16
    onTogglePlay: () => void;
}

type ViewMode = 'pianoroll' | 'stepgrid' | 'hextracker' | 'chordchart';

export const Visualizer: React.FC<VisualizerProps> = ({
    arrangement,
    isPlaying,
    currentBeat,
    currentBar,
    onTogglePlay
}) => {
    const [viewMode, setViewMode] = useState<ViewMode>('pianoroll');
    const [selectedTrackFilter, setSelectedTrackFilter] = useState<'all' | StemTrack>('all');
    const [hoveredNote, setHoveredNote] = useState<{ label: string; details: string } | null>(null);

    if (!arrangement) {
        return (
            <div className="w-full bg-studio-900/90 border border-studio-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 min-h-[360px] backdrop-blur-md shadow-2xl">
                <div className="p-4 bg-studio-800/80 rounded-2xl text-studio-500 shadow-inner">
                    <Music2 size={36} className="animate-pulse" />
                </div>
                <div>
                    <h3 className="font-bold text-white text-base sm:text-lg">Producer Sequencer Standby</h3>
                    <p className="text-xs text-studio-400 font-mono max-w-sm mt-1">
                        Roll the studio dice above to synthesize a DAW-ready 8-bar arrangement loop.
                    </p>
                </div>
            </div>
        );
    }

    const totalBars = arrangement.bars_total || 8;
    const totalBeats = totalBars * 4;
    const currentGlobalBeat = ((currentBar - 1) * 4) + (currentBeat - 1);
    const progressPercent = isPlaying 
        ? Math.max(0, Math.min(100, (currentGlobalBeat / totalBeats) * 100))
        : 0;

    const barChords = useMemo(() => {
        const map: Record<number, { name: string; notes?: string[] }> = {};
        for (let b = 1; b <= totalBars; b++) {
            map[b] = { name: b % 2 === 1 ? 'Am' : 'F' };
        }
        if (arrangement.chords) {
            arrangement.chords.forEach(c => {
                if (c.bar >= 1 && c.bar <= totalBars) {
                    map[c.bar] = {
                        name: c.note || (c.chord_notes ? c.chord_notes[0] : 'Am'),
                        notes: c.chord_notes
                    };
                }
            });
        }
        return map;
    }, [arrangement, totalBars]);

    const activeChordNow = barChords[currentBar] || { name: arrangement.key };

    return (
        <div className="w-full bg-studio-900/95 border border-studio-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-2xl backdrop-blur-md">
            
            {/* Top Toolbar: Meta + Play/Pause Button + 4 Mode Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-studio-800 pb-3">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onTogglePlay}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs sm:text-sm tracking-wider transition-all select-none shrink-0 ${
                            isPlaying
                                ? 'bg-studio-amber text-studio-950 shadow-amber-glow ring-2 ring-studio-amberGlow active:scale-95'
                                : 'bg-studio-800 text-white hover:bg-studio-700 hover:text-studio-amber border border-studio-700 active:scale-95'
                        }`}
                        title="Click to audition arrangement"
                    >
                        {isPlaying ? <Square size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                        <span>{isPlaying ? 'PAUSE' : 'AUDITION'}</span>
                    </button>

                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-black text-white tracking-tight truncate max-w-[200px] sm:max-w-xs">
                                {arrangement.title_working}
                            </h3>
                            <span className="px-2 py-0.5 rounded bg-studio-800 border border-studio-700 text-studio-amber text-[10px] font-mono font-bold">
                                {arrangement.bpm} BPM
                            </span>
                            <span className="px-2 py-0.5 rounded bg-studio-800 border border-studio-700 text-studio-200 text-[10px] font-mono font-bold hidden sm:inline">
                                {arrangement.key}
                            </span>
                        </div>
                        <p className="text-[11px] text-studio-400 mt-0.5 italic truncate max-w-sm">
                            "{arrangement.logline}"
                        </p>
                    </div>
                </div>

                {/* View Switcher Tabs */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <div className="flex p-1 bg-studio-950 rounded-xl border border-studio-800 text-xs font-mono">
                        <button
                            type="button"
                            onClick={() => setViewMode('pianoroll')}
                            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                                viewMode === 'pianoroll' 
                                    ? 'bg-studio-800 text-studio-amber font-bold shadow-sm' 
                                    : 'text-studio-400 hover:text-white'
                            }`}
                        >
                            <Layers size={13} />
                            <span>Piano Roll</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('stepgrid')}
                            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                                viewMode === 'stepgrid' 
                                    ? 'bg-studio-800 text-studio-amber font-bold shadow-sm' 
                                    : 'text-studio-400 hover:text-white'
                            }`}
                        >
                            <Grid size={13} />
                            <span>Matrix</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('hextracker')}
                            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                                viewMode === 'hextracker' 
                                    ? 'bg-studio-800 text-studio-amber font-bold shadow-sm' 
                                    : 'text-studio-400 hover:text-white'
                            }`}
                            title="Byte Tracker Matrix"
                        >
                            <Code size={13} />
                            <span>Hex Tracker</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('chordchart')}
                            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                                viewMode === 'chordchart' 
                                    ? 'bg-studio-800 text-studio-amber font-bold shadow-sm' 
                                    : 'text-studio-400 hover:text-white'
                            }`}
                        >
                            <BarChart2 size={13} />
                            <span>Chords</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* REAL-TIME CHORD BAR HEADER */}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-studio-400 px-1">
                    <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-studio-300">
                        <Zap size={13} className="text-studio-amber" />
                        Active Progression Bar-by-Bar (8 Full Bars):
                    </span>
                    {isPlaying && (
                        <span className="text-studio-amber font-bold flex items-center gap-1">
                            <span>PLAYING BAR {currentBar}</span>
                            <span className="text-white px-1.5 py-0.2 rounded bg-studio-amber/20 border border-studio-amber/40">
                                {activeChordNow.name}
                            </span>
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {Array.from({ length: totalBars }).map((_, i) => {
                        const barNum = i + 1;
                        const chordInfo = barChords[barNum] || { name: 'Am' };
                        const isBarActive = isPlaying && currentBar === barNum;

                        return (
                            <div
                                key={barNum}
                                className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all ${
                                    isBarActive
                                        ? 'bg-studio-amber/20 border-studio-amber text-studio-amber shadow-amber-glow scale-[1.03] z-10'
                                        : 'bg-studio-950/80 border-studio-800 text-studio-300 hover:border-studio-700'
                                }`}
                            >
                                <div className="flex items-center justify-between w-full text-[9px] font-mono text-studio-500 mb-0.5">
                                    <span>BAR {barNum}</span>
                                    {isBarActive && <span className="w-1.5 h-1.5 rounded-full bg-studio-amber animate-ping" />}
                                </div>
                                <span className={`text-xs sm:text-sm font-black tracking-tight ${isBarActive ? 'text-studio-amber' : 'text-white'}`}>
                                    {chordInfo.name}
                                </span>
                                <span className="text-[8px] font-mono text-studio-500 truncate w-full text-center">
                                    {chordInfo.notes ? chordInfo.notes.join('.') : 'Triad'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Track Filter Layer Selectors */}
            <div className="flex items-center justify-between text-xs font-mono pt-1">
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                    <span className="text-[10px] text-studio-500 uppercase tracking-wider mr-1">Layer:</span>
                    {(['all', 'melody', 'chords', 'bass', 'drums', 'pad'] as const).map((trackKey) => {
                        const isSelected = selectedTrackFilter === trackKey;
                        const labelMap = {
                            all: 'ALL TRACKS',
                            melody: 'LEAD',
                            chords: 'KEYS',
                            bass: 'BASS',
                            drums: 'DRUMS',
                            pad: 'PAD'
                        };
                        const colorMap = {
                            all: 'text-white',
                            melody: 'text-studio-amber',
                            chords: 'text-studio-ledCyan',
                            bass: 'text-purple-400',
                            drums: 'text-studio-ledGreen',
                            pad: 'text-blue-300'
                        };
                        return (
                            <button
                                key={trackKey}
                                type="button"
                                onClick={() => setSelectedTrackFilter(trackKey)}
                                className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-bold transition-colors ${
                                    isSelected
                                        ? 'bg-studio-800 border-studio-600 text-white shadow-sm'
                                        : 'bg-studio-950 border-studio-850 text-studio-500 hover:text-studio-300'
                                }`}
                            >
                                <span className={colorMap[trackKey]}>{labelMap[trackKey]}</span>
                            </button>
                        );
                    })}
                </div>

                {hoveredNote && (
                    <div className="hidden md:flex items-center gap-1.5 text-[11px] text-studio-amber bg-studio-950 px-2 py-0.5 rounded border border-studio-800 truncate">
                        <Info size={12} />
                        <span className="font-bold">{hoveredNote.label}:</span>
                        <span className="text-studio-300">{hoveredNote.details}</span>
                    </div>
                )}
            </div>

            {/* MAIN SEQUENCER DISPLAY AREA */}
            <div className="relative w-full bg-studio-950 rounded-xl border border-studio-800 overflow-hidden select-none">
                
                {/* Moving Playhead Vertical Line */}
                {isPlaying && (
                    <div 
                        className="absolute top-0 bottom-0 w-[2px] bg-studio-amber shadow-[0_0_14px_#f59e0b] z-30 pointer-events-none transition-all duration-75"
                        style={{ left: `${Math.min(99.6, Math.max(0.4, progressPercent))}%` }}
                    >
                        <div className="w-2.5 h-2.5 -ml-[4px] bg-studio-amber rounded-full shadow-[0_0_8px_#f59e0b]" />
                    </div>
                )}

                {/* View Mode 1: Piano Roll View */}
                {viewMode === 'pianoroll' && (
                    <PianoRollView
                        arrangement={arrangement}
                        totalBars={totalBars}
                        selectedTrack={selectedTrackFilter}
                        currentBar={currentBar}
                        currentBeat={currentBeat}
                        isPlaying={isPlaying}
                        onHoverNote={setHoveredNote}
                        barChords={barChords}
                    />
                )}

                {/* View Mode 2: Step Matrix View */}
                {viewMode === 'stepgrid' && (
                    <StepMatrixView
                        arrangement={arrangement}
                        totalBars={totalBars}
                        selectedTrack={selectedTrackFilter}
                        currentBar={currentBar}
                        currentBeat={currentBeat}
                        isPlaying={isPlaying}
                        onHoverNote={setHoveredNote}
                    />
                )}

                {/* View Mode 3: Hex Tracker Matrix View */}
                {viewMode === 'hextracker' && (
                    <HexTrackerView
                        arrangement={arrangement}
                        totalBars={totalBars}
                        currentBar={currentBar}
                        currentBeat={currentBeat}
                        isPlaying={isPlaying}
                    />
                )}

                {/* View Mode 4: Chord Detail View */}
                {viewMode === 'chordchart' && (
                    <ChordTimelineView
                        arrangement={arrangement}
                        totalBars={totalBars}
                        currentBar={currentBar}
                        isPlaying={isPlaying}
                    />
                )}

                {/* Bar Timeline Bottom Grid */}
                <div className="flex justify-between items-center text-[10px] font-mono text-studio-500 py-1.5 px-3 bg-studio-950/90 border-t border-studio-900">
                    {Array.from({ length: totalBars }).map((_, i) => {
                        const barNum = i + 1;
                        const isCurrent = isPlaying && currentBar === barNum;
                        const chordName = barChords[barNum]?.name || '';
                        return (
                            <div 
                                key={barNum} 
                                className={`flex items-center gap-1 transition-colors ${
                                    isCurrent ? 'text-studio-amber font-bold scale-105' : 'text-studio-600'
                                }`}
                            >
                                <span>BAR {barNum}</span>
                                {chordName && <span className="opacity-70 text-[9px]">({chordName})</span>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Hook Lyric Pill & Quick Explainer */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-studio-950/80 rounded-xl border border-studio-850 text-xs">
                {arrangement.scratch_lyric_hook ? (
                    <div className="flex items-center gap-2 truncate">
                        <Mic2 size={14} className="text-studio-amber shrink-0" />
                        <span className="text-studio-500 font-mono text-[11px] uppercase tracking-wider">Topline Hook:</span>
                        <span className="font-bold text-white truncate">"{arrangement.scratch_lyric_hook}"</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-studio-400">
                        <Sparkles size={14} className="text-studio-amber" />
                        <span>{arrangement.hook_reason}</span>
                    </div>
                )}
                
                <span className="text-[11px] font-mono text-studio-400 shrink-0">
                    {arrangement.form ? arrangement.form.join(' → ') : '8-Bar Hook Loop'}
                </span>
            </div>

        </div>
    );
};

/* =========================================================================
   PIANO ROLL VIEW COMPONENT
   ========================================================================= */
interface PianoRollViewProps {
    arrangement: Arrangement;
    totalBars: number;
    selectedTrack: 'all' | StemTrack;
    currentBar: number;
    currentBeat: number;
    isPlaying: boolean;
    onHoverNote: (info: { label: string; details: string } | null) => void;
    barChords: Record<number, { name: string; notes?: string[] }>;
}

const PianoRollView: React.FC<PianoRollViewProps> = ({
    arrangement,
    totalBars,
    selectedTrack,
    currentBar,
    currentBeat,
    isPlaying,
    onHoverNote,
    barChords
}) => {
    const allEvents = useMemo(() => {
        const eventsList: Array<{
            id: string;
            track: StemTrack;
            bar: number;
            beat: number;
            pitchName: string;
            midiNum: number;
            durationBeats: number;
            velocity: number;
            colorClass: string;
            label: string;
        }> = [];

        const pitchToMidi = (noteStr: string): number => {
            const noteMap: Record<string, number> = {
                'C': 0, 'C#': 1, 'DB': 1, 'D': 2, 'D#': 3, 'EB': 3,
                'E': 4, 'F': 5, 'F#': 6, 'GB': 6, 'G': 7, 'G#': 8,
                'AB': 8, 'A': 9, 'A#': 10, 'BB': 10, 'B': 11
            };
            const m = noteStr.trim().match(/^([A-Ga-g][#b]?)(\d+)$/);
            if (!m) return 60;
            const p = m[1].toUpperCase();
            const oct = parseInt(m[2], 10);
            return (oct + 1) * 12 + (noteMap[p] ?? 0);
        };

        if ((selectedTrack === 'all' || selectedTrack === 'melody') && arrangement.melody) {
            arrangement.melody.forEach((e, idx) => {
                if (e.note) {
                    eventsList.push({
                        id: `mel-${idx}`,
                        track: 'melody',
                        bar: e.bar,
                        beat: e.beat,
                        pitchName: e.note,
                        midiNum: pitchToMidi(e.note),
                        durationBeats: e.duration_beats || 1,
                        velocity: e.velocity || 100,
                        colorClass: 'bg-studio-amber border-studio-amberGlow text-studio-950 font-bold',
                        label: e.lyric_placeholder ? `${e.note} "${e.lyric_placeholder}"` : e.note
                    });
                }
            });
        }

        if ((selectedTrack === 'all' || selectedTrack === 'chords') && arrangement.chords) {
            arrangement.chords.forEach((e, idx) => {
                if (e.chord_notes && e.chord_notes.length > 0) {
                    e.chord_notes.forEach((cn, cIdx) => {
                        eventsList.push({
                            id: `chord-${idx}-${cIdx}`,
                            track: 'chords',
                            bar: e.bar,
                            beat: e.beat,
                            pitchName: cn,
                            midiNum: pitchToMidi(cn),
                            durationBeats: e.duration_beats || 2,
                            velocity: e.velocity || 85,
                            colorClass: 'bg-studio-ledCyan/90 border-cyan-300 text-studio-950 font-semibold',
                            label: `${e.note || 'Chord'} (${cn})`
                        });
                    });
                } else if (e.note) {
                    eventsList.push({
                        id: `chord-${idx}`,
                        track: 'chords',
                        bar: e.bar,
                        beat: e.beat,
                        pitchName: e.note,
                        midiNum: pitchToMidi(e.note),
                        durationBeats: e.duration_beats || 2,
                        velocity: e.velocity || 85,
                        colorClass: 'bg-studio-ledCyan/90 border-cyan-300 text-studio-950 font-semibold',
                        label: e.note
                    });
                }
            });
        }

        if ((selectedTrack === 'all' || selectedTrack === 'bass') && arrangement.bass) {
            arrangement.bass.forEach((e, idx) => {
                if (e.note) {
                    eventsList.push({
                        id: `bass-${idx}`,
                        track: 'bass',
                        bar: e.bar,
                        beat: e.beat,
                        pitchName: e.note,
                        midiNum: pitchToMidi(e.note),
                        durationBeats: e.duration_beats || 1.5,
                        velocity: e.velocity || 115,
                        colorClass: 'bg-purple-500 border-purple-300 text-white font-bold',
                        label: `Bass ${e.note}`
                    });
                }
            });
        }

        if ((selectedTrack === 'all' || selectedTrack === 'drums') && arrangement.drums) {
            arrangement.drums.forEach((e, idx) => {
                if (e.piece) {
                    const drumMidiMap: Record<string, { midi: number; label: string }> = {
                        kick: { midi: 36, label: 'Kick' },
                        snare: { midi: 38, label: 'Snare' },
                        clap: { midi: 39, label: 'Clap' },
                        hat: { midi: 42, label: 'Cl. Hat' },
                        openhat: { midi: 46, label: 'Op. Hat' },
                        crash: { midi: 49, label: 'Crash' }
                    };
                    const match = drumMidiMap[e.piece.toLowerCase()] || { midi: 40, label: e.piece };
                    eventsList.push({
                        id: `drum-${idx}`,
                        track: 'drums',
                        bar: e.bar,
                        beat: e.beat,
                        pitchName: match.label,
                        midiNum: match.midi,
                        durationBeats: e.duration_beats || 0.5,
                        velocity: e.velocity || 110,
                        colorClass: 'bg-studio-ledGreen border-emerald-300 text-studio-950 font-bold',
                        label: `Drum: ${match.label}`
                    });
                }
            });
        }

        if ((selectedTrack === 'all' || selectedTrack === 'pad') && arrangement.pad) {
            arrangement.pad.forEach((e, idx) => {
                if (e.chord_notes) {
                    e.chord_notes.forEach((pn, pIdx) => {
                        eventsList.push({
                            id: `pad-${idx}-${pIdx}`,
                            track: 'pad',
                            bar: e.bar,
                            beat: e.beat,
                            pitchName: pn,
                            midiNum: pitchToMidi(pn),
                            durationBeats: e.duration_beats || 4,
                            velocity: e.velocity || 65,
                            colorClass: 'bg-blue-500/60 border-blue-300 text-white text-[9px]',
                            label: `Pad (${pn})`
                        });
                    });
                }
            });
        }

        return eventsList;
    }, [arrangement, selectedTrack]);

    const { minMidi, maxMidi } = useMemo(() => {
        if (allEvents.length === 0) return { minMidi: 36, maxMidi: 76 };
        let min = 127;
        let max = 0;
        allEvents.forEach(e => {
            if (e.midiNum < min) min = e.midiNum;
            if (e.midiNum > max) max = e.midiNum;
        });
        return {
            minMidi: Math.max(24, min - 2),
            maxMidi: Math.min(96, Math.max(min + 16, max + 2))
        };
    }, [allEvents]);

    const totalBeats = totalBars * 4;
    const midiPitchRange = Math.max(12, maxMidi - minMidi + 1);

    return (
        <div className="relative w-full h-60 sm:h-72 bg-studio-950 p-2 overflow-hidden flex flex-col justify-between">
            <div className="absolute inset-0 grid grid-cols-4 sm:grid-cols-8 divide-x divide-studio-900 pointer-events-none">
                {Array.from({ length: totalBars }).map((_, barIdx) => {
                    const barNum = barIdx + 1;
                    const chord = barChords[barNum]?.name;
                    const isBarActive = isPlaying && currentBar === barNum;

                    return (
                        <div key={barIdx} className="h-full relative flex flex-col justify-between p-1">
                            <span className={`text-[11px] font-mono font-black select-none transition-opacity ${
                                isBarActive ? 'text-studio-amber/40 scale-110' : 'text-studio-700/25'
                            }`}>
                                {chord}
                            </span>
                            <div className="absolute inset-0 grid grid-cols-4 divide-x divide-studio-900/40" />
                            {isBarActive && (
                                <div className="absolute inset-0 bg-studio-amber/5" />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="relative w-full h-full">
                {allEvents.map((note) => {
                    const startBeat = (note.bar - 1) * 4 + (note.beat - 1);
                    const leftPercent = (startBeat / totalBeats) * 100;
                    const widthPercent = Math.max(1.8, (note.durationBeats / totalBeats) * 100);
                    
                    const yPos = 100 - (((note.midiNum - minMidi) / midiPitchRange) * 100);
                    const isNoteActive = isPlaying && currentBar === note.bar && Math.abs(currentBeat - note.beat) < (note.durationBeats || 1);

                    return (
                        <div
                            key={note.id}
                            onMouseEnter={() => onHoverNote({
                                label: note.label,
                                details: `Bar ${note.bar}, Beat ${note.beat.toFixed(1)} | Dur: ${note.durationBeats}b | Vel: ${note.velocity}`
                            })}
                            onMouseLeave={() => onHoverNote(null)}
                            className={`absolute h-4 sm:h-5 rounded-[4px] border px-1 flex items-center text-[9px] sm:text-[10px] leading-none truncate shadow-sm transition-transform cursor-pointer ${
                                note.colorClass
                            } ${
                                isNoteActive ? 'scale-105 brightness-125 ring-2 ring-white z-20 shadow-amber-glow' : 'hover:scale-105 z-10'
                            }`}
                            style={{
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`,
                                top: `${Math.min(88, Math.max(2, yPos))}%`,
                                minWidth: '18px'
                            }}
                        >
                            <span className="truncate select-none pointer-events-none">
                                {note.pitchName}
                            </span>
                        </div>
                    );
                })}
            </div>

            <div className="absolute bottom-1 right-2 text-[9px] font-mono text-studio-600 pointer-events-none">
                MIDI {minMidi} - {maxMidi} ({allEvents.length} Notes)
            </div>
        </div>
    );
};

/* =========================================================================
   STEP MATRIX VIEW
   ========================================================================= */
interface StepMatrixViewProps {
    arrangement: Arrangement;
    totalBars: number;
    selectedTrack: 'all' | StemTrack;
    currentBar: number;
    currentBeat: number;
    isPlaying: boolean;
    onHoverNote: (info: { label: string; details: string } | null) => void;
}

const StepMatrixView: React.FC<StepMatrixViewProps> = ({
    arrangement,
    totalBars,
    selectedTrack,
    currentBar,
    currentBeat,
    isPlaying,
    onHoverNote
}) => {
    const totalSteps = totalBars * 4;

    const tracksList: Array<{
        key: StemTrack;
        label: string;
        events: NoteEvent[];
        colorActive: string;
    }> = [
        { key: 'melody', label: 'LEAD', events: arrangement.melody || [], colorActive: 'bg-studio-amber shadow-[0_0_8px_#f59e0b]' },
        { key: 'chords', label: 'KEYS', events: arrangement.chords || [], colorActive: 'bg-studio-ledCyan shadow-[0_0_8px_#06b6d4]' },
        { key: 'bass', label: 'BASS', events: arrangement.bass || [], colorActive: 'bg-purple-500 shadow-[0_0_8px_#a855f7]' },
        { key: 'drums', label: 'DRUMS', events: arrangement.drums || [], colorActive: 'bg-studio-ledGreen shadow-[0_0_8px_#10b981]' },
        { key: 'pad', label: 'PAD', events: arrangement.pad || [], colorActive: 'bg-blue-400 shadow-[0_0_8px_#60a5fa]' },
    ];

    const visibleTracks = selectedTrack === 'all' 
        ? tracksList 
        : tracksList.filter(t => t.key === selectedTrack);

    return (
        <div className="p-3 bg-studio-950 flex flex-col gap-2.5 overflow-x-auto">
            {visibleTracks.map(track => (
                <div key={track.key} className="flex items-center gap-2">
                    <span className="w-14 text-[10px] font-mono font-bold text-studio-400 uppercase shrink-0 truncate">
                        {track.label}
                    </span>
                    
                    <div 
                        className="flex-1 grid gap-[2px] h-6 bg-studio-900 rounded-lg p-1 items-center"
                        style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}
                    >
                        {Array.from({ length: totalSteps }).map((_, stepIdx) => {
                            const barNum = Math.floor(stepIdx / 4) + 1;
                            const beatInBar = (stepIdx % 4) + 1;

                            const matchingEvent = track.events.find(e => e.bar === barNum && Math.abs(e.beat - beatInBar) < 0.5);
                            const hasHit = !!matchingEvent;
                            const isCurrentStep = isPlaying && currentBar === barNum && Math.floor(currentBeat) === beatInBar;

                            return (
                                <div
                                    key={stepIdx}
                                    onMouseEnter={() => {
                                        if (matchingEvent) {
                                            const detailStr = matchingEvent.note || matchingEvent.piece || (matchingEvent.chord_notes ? matchingEvent.chord_notes.join(', ') : 'Hit');
                                            onHoverNote({
                                                label: `${track.label} Step`,
                                                details: `Bar ${barNum}, Beat ${beatInBar} | ${detailStr} | Vel: ${matchingEvent.velocity || 100}`
                                            });
                                        }
                                    }}
                                    onMouseLeave={() => onHoverNote(null)}
                                    className={`h-full rounded-[2px] transition-all cursor-pointer ${
                                        hasHit
                                            ? isCurrentStep 
                                                ? `${track.colorActive} scale-110 brightness-125 ring-1 ring-white z-10` 
                                                : `${track.colorActive} opacity-85`
                                            : isCurrentStep
                                                ? 'bg-studio-700'
                                                : (stepIdx % 4 === 0 ? 'bg-studio-850' : 'bg-studio-950')
                                    }`}
                                />
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

/* =========================================================================
   HEX TRACKER MATRIX VIEW (Full 8-bar 128-step display)
   ========================================================================= */
interface HexTrackerViewProps {
    arrangement: Arrangement;
    totalBars: number;
    currentBar: number;
    currentBeat: number;
    isPlaying: boolean;
}

const HexTrackerView: React.FC<HexTrackerViewProps> = ({
    arrangement,
    totalBars,
    currentBar,
    currentBeat,
    isPlaying
}) => {
    const hexMemory = useMemo(() => buildHexArrangementMemory(arrangement), [arrangement]);
    const current16thStep = Math.floor(((currentBar - 1) * 16) + ((currentBeat - 1) * 4));

    const trackerRows = useMemo(() => {
        const rows: Array<{
            stepHex: string;
            stepIdx: number;
            barNum: number;
            beatNum: number;
            melodyHex: string;
            chordsHex: string;
            bassHex: string;
            drumsHex: string;
        }> = [];

        const totalSteps = totalBars * 16;
        for (let s = 0; s < Math.min(128, totalSteps); s++) {
            const barNum = Math.floor(s / 16) + 1;
            const beatNum = ((s % 16) / 4) + 1;

            const findInPattern = (buf: Uint8Array, isDrum = false): string => {
                for (let off = 0; off < buf.length; off += 4) {
                    if (buf[off] === s) {
                        const midi = buf[off + 1];
                        const vel = buf[off + 3];
                        if (isDrum) {
                            return `${midiToDrumPieceName(midi).padEnd(5, ' ')} ${toHex2(vel)}`;
                        }
                        return `${midiToNoteName(midi).padEnd(4, ' ')} ${toHex2(vel)}`;
                    }
                }
                return '.... ..';
            };

            rows.push({
                stepHex: toHex2(s),
                stepIdx: s,
                barNum,
                beatNum,
                melodyHex: findInPattern(hexMemory.tracks.melody.buffer, false),
                chordsHex: findInPattern(hexMemory.tracks.chords.buffer, false),
                bassHex: findInPattern(hexMemory.tracks.bass.buffer, false),
                drumsHex: findInPattern(hexMemory.tracks.drums.buffer, true),
            });
        }

        return rows;
    }, [hexMemory, totalBars]);

    return (
        <div className="bg-black/95 p-3 rounded-xl font-mono text-[11px] overflow-x-auto max-h-72 border border-studio-800">
            <div className="grid grid-cols-6 gap-2 text-studio-500 border-b border-studio-800 pb-1.5 mb-1.5 font-bold text-[10px] tracking-wider uppercase">
                <span>ROW (HEX)</span>
                <span>BAR:BEAT</span>
                <span className="text-studio-amber">00:LEAD</span>
                <span className="text-studio-ledCyan">01:KEYS</span>
                <span className="text-purple-400">02:BASS</span>
                <span className="text-studio-ledGreen">09:DRUM</span>
            </div>

            <div className="space-y-[1px]">
                {trackerRows.map(row => {
                    const isRowActive = isPlaying && current16thStep === row.stepIdx;
                    return (
                        <div
                            key={row.stepHex}
                            className={`grid grid-cols-6 gap-2 py-[2px] px-1 rounded transition-colors ${
                                isRowActive
                                    ? 'bg-studio-amber/20 text-studio-amber font-bold shadow-sm'
                                    : (row.stepIdx % 16 === 0 ? 'text-studio-200 bg-studio-900/60 font-bold' : row.stepIdx % 4 === 0 ? 'text-studio-300 bg-studio-950/60' : 'text-studio-500')
                            }`}
                        >
                            <span className="font-bold text-studio-400">0x{row.stepHex}</span>
                            <span className="text-studio-600">{row.barNum}.{row.beatNum.toFixed(1)}</span>
                            <span className={row.melodyHex !== '.... ..' ? 'text-studio-amber font-bold' : 'text-studio-700'}>{row.melodyHex}</span>
                            <span className={row.chordsHex !== '.... ..' ? 'text-studio-ledCyan font-bold' : 'text-studio-700'}>{row.chordsHex}</span>
                            <span className={row.bassHex !== '.... ..' ? 'text-purple-400 font-bold' : 'text-studio-700'}>{row.bassHex}</span>
                            <span className={row.drumsHex !== '.... ..' ? 'text-studio-ledGreen font-bold' : 'text-studio-700'}>{row.drumsHex}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/* =========================================================================
   CHORD DETAIL VIEW
   ========================================================================= */
interface ChordTimelineViewProps {
    arrangement: Arrangement;
    totalBars: number;
    currentBar: number;
    isPlaying: boolean;
}

const ChordTimelineView: React.FC<ChordTimelineViewProps> = ({
    arrangement,
    totalBars,
    currentBar,
    isPlaying
}) => {
    const barChordsMap = useMemo(() => {
        const map: Record<number, NoteEvent[]> = {};
        for (let b = 1; b <= totalBars; b++) map[b] = [];

        if (arrangement.chords) {
            arrangement.chords.forEach(c => {
                if (map[c.bar]) map[c.bar].push(c);
            });
        }
        return map;
    }, [arrangement, totalBars]);

    return (
        <div className="p-3.5 bg-studio-950 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
            {Array.from({ length: totalBars }).map((_, i) => {
                const barNum = i + 1;
                const chordsInBar = barChordsMap[barNum] || [];
                const isCurrent = isPlaying && currentBar === barNum;

                const primaryChord = chordsInBar[0]?.note || (barNum % 2 === 1 ? 'Am' : 'F');
                const chordVoicing = chordsInBar[0]?.chord_notes ? chordsInBar[0].chord_notes.join(' - ') : 'Root / 3rd / 5th';

                return (
                    <div
                        key={barNum}
                        className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                            isCurrent
                                ? 'bg-studio-amber/20 border-studio-amber shadow-amber-glow scale-105 z-10'
                                : 'bg-studio-900/90 border-studio-800 hover:border-studio-700'
                        }`}
                    >
                        <div className="flex items-center justify-between text-[10px] font-mono text-studio-500">
                            <span>BAR {barNum}</span>
                            {isCurrent && <span className="w-2 h-2 rounded-full bg-studio-amber shadow-sm animate-ping" />}
                        </div>

                        <div className="my-1 text-center">
                            <span className={`text-base font-black tracking-tight ${isCurrent ? 'text-studio-amber font-mono' : 'text-white'}`}>
                                {primaryChord}
                            </span>
                        </div>

                        <div className="text-[9px] font-mono text-studio-400 text-center truncate">
                            {chordVoicing}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
