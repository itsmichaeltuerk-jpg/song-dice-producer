import React, { useState } from 'react';
import { X, Download, Copy, Check, FileText, Music, Sparkles } from 'lucide-react';
import { Arrangement } from '../types';
import { 
    downloadMidiFile, 
    downloadStemMidi, 
    generateProducerBriefText, 
    buildChordProgressionBarChart 
} from '../services/midi';

interface ProducerBriefModalProps {
    arrangement: Arrangement | null;
    isOpen: boolean;
    onClose: () => void;
    humanizePercent: number;
    onChangeHumanize: (percent: number) => void;
}

export const ProducerBriefModal: React.FC<ProducerBriefModalProps> = ({
    arrangement,
    isOpen,
    onClose,
    humanizePercent,
    onChangeHumanize
}) => {
    const [copiedBrief, setCopiedBrief] = useState(false);
    const [copiedChords, setCopiedChords] = useState(false);

    if (!isOpen || !arrangement) return null;

    const chordChart = buildChordProgressionBarChart(arrangement.chords, arrangement.bars_total || 8);
    const briefMarkdown = generateProducerBriefText(arrangement);

    const handleCopyBrief = () => {
        navigator.clipboard.writeText(briefMarkdown);
        setCopiedBrief(true);
        setTimeout(() => setCopiedBrief(false), 2000);
    };

    const handleCopyChords = () => {
        navigator.clipboard.writeText(chordChart);
        setCopiedChords(true);
        setTimeout(() => setCopiedChords(false), 2000);
    };

    const handleDownloadBriefTxt = () => {
        const blob = new Blob([briefMarkdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const cleanTitle = (arrangement.title_working || 'Song_Dice_Brief').replace(/[^a-zA-Z0-9_-]/g, '_');
        a.download = `${cleanTitle}_Producer_Brief.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div 
                className="bg-studio-900 border border-studio-750 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b border-studio-800 flex items-center justify-between bg-studio-950/80">
                    <div>
                        <h2 className="text-lg font-black text-white flex items-center gap-2">
                            <FileText className="text-studio-amber" size={20} />
                            DAW Producer Brief & MIDI Export
                        </h2>
                        <p className="text-xs text-studio-400 font-mono mt-0.5">
                            Ready to drop into Ableton Live, FL Studio, Logic Pro, or Reaper.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-studio-400 hover:text-white hover:bg-studio-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-5 overflow-y-auto space-y-5 flex-1">
                    
                    {/* Multitrack Master Export Hero Card */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-studio-amber/20 via-studio-850 to-studio-900 border border-studio-amber/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-studio-amber font-bold block mb-0.5">
                                Primary Output
                            </span>
                            <h3 className="text-base font-bold text-white">
                                Full Multi-Track Standard MIDI (.mid)
                            </h3>
                            <p className="text-xs text-studio-300 mt-0.5 font-mono">
                                Includes Melody (Ch 1), Chords (Ch 2), Bass (Ch 3), Drums GM (Ch 10), Tempo & Key meta.
                            </p>
                        </div>

                        <button
                            onClick={() => downloadMidiFile(arrangement, humanizePercent)}
                            className="px-5 py-3 rounded-xl bg-studio-amber text-studio-950 font-black text-sm tracking-wide hover:bg-amber-400 active:scale-95 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.4)] shrink-0"
                        >
                            <Download size={18} />
                            <span>DOWNLOAD MULTITRACK .MID</span>
                        </button>
                    </div>

                    {/* Humanize Timing & Velocity Slider */}
                    <div className="bg-studio-950 p-3.5 rounded-xl border border-studio-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <span className="text-xs font-bold text-studio-200 flex items-center gap-1.5">
                                <Sparkles size={14} className="text-studio-amber" />
                                Humanize MIDI Timing & Velocity
                            </span>
                            <p className="text-[11px] text-studio-500 font-mono">
                                Applies subtle organic micro-timing jitter and velocity variation before export.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min="0"
                                max="20"
                                value={humanizePercent}
                                onChange={(e) => onChangeHumanize(parseInt(e.target.value, 10))}
                                className="accent-studio-amber w-28 h-1.5 bg-studio-800 rounded cursor-pointer"
                            />
                            <span className="text-xs font-mono font-bold text-studio-amber w-8">
                                {humanizePercent}%
                            </span>
                        </div>
                    </div>

                    {/* Stem Separated Downloads */}
                    <div>
                        <h4 className="text-xs font-mono uppercase tracking-wider text-studio-400 font-bold mb-2.5">
                            Individual Stem Files (.mid)
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <button
                                onClick={() => downloadStemMidi(arrangement.melody, 'Melody', 0, arrangement)}
                                className="p-2.5 rounded-xl bg-studio-850 hover:bg-studio-800 border border-studio-750 text-xs font-bold text-studio-200 flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <Music size={14} className="text-studio-amber" />
                                <span>Melody.mid</span>
                            </button>

                            <button
                                onClick={() => downloadStemMidi(arrangement.chords, 'Chords', 1, arrangement)}
                                className="p-2.5 rounded-xl bg-studio-850 hover:bg-studio-800 border border-studio-750 text-xs font-bold text-studio-200 flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <Music size={14} className="text-studio-ledCyan" />
                                <span>Chords.mid</span>
                            </button>

                            <button
                                onClick={() => downloadStemMidi(arrangement.bass, 'Bass', 2, arrangement)}
                                className="p-2.5 rounded-xl bg-studio-850 hover:bg-studio-800 border border-studio-750 text-xs font-bold text-studio-200 flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <Music size={14} className="text-studio-ledPurple" />
                                <span>Bass.mid</span>
                            </button>

                            <button
                                onClick={() => downloadStemMidi(arrangement.drums, 'Drums', 9, arrangement, true)}
                                className="p-2.5 rounded-xl bg-studio-850 hover:bg-studio-800 border border-studio-750 text-xs font-bold text-studio-200 flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <Music size={14} className="text-studio-ledGreen" />
                                <span>Drums.mid</span>
                            </button>
                        </div>
                    </div>

                    {/* Copyable Bar-by-Bar Chord Progression */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-mono uppercase tracking-wider text-studio-400 font-bold">
                                Chord Chart ({arrangement.key})
                            </h4>
                            <button
                                onClick={handleCopyChords}
                                className="flex items-center gap-1 text-xs font-mono text-studio-amber hover:text-amber-400 transition-colors"
                            >
                                {copiedChords ? <Check size={13} /> : <Copy size={13} />}
                                <span>{copiedChords ? 'COPIED' : 'COPY CHORDS'}</span>
                            </button>
                        </div>
                        <pre className="p-3 bg-studio-950 border border-studio-800 rounded-xl font-mono text-xs text-studio-200 overflow-x-auto">
                            {chordChart}
                        </pre>
                    </div>

                    {/* Producer Brief Markdown Preview */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-mono uppercase tracking-wider text-studio-400 font-bold">
                                Producer Notes & DAW Next Moves
                            </h4>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCopyBrief}
                                    className="flex items-center gap-1 text-xs font-mono text-studio-amber hover:text-amber-400 transition-colors"
                                >
                                    {copiedBrief ? <Check size={13} /> : <Copy size={13} />}
                                    <span>{copiedBrief ? 'COPIED' : 'COPY BRIEF'}</span>
                                </button>
                                <button
                                    onClick={handleDownloadBriefTxt}
                                    className="flex items-center gap-1 text-xs font-mono text-studio-300 hover:text-white transition-colors"
                                >
                                    <Download size={13} />
                                    <span>DOWNLOAD .MD</span>
                                </button>
                            </div>
                        </div>
                        <div className="p-3.5 bg-studio-950 border border-studio-800 rounded-xl text-xs text-studio-300 font-mono space-y-2 max-h-48 overflow-y-auto">
                            <p className="text-white font-bold">{arrangement.title_working} — {arrangement.bpm} BPM ({arrangement.key})</p>
                            <p className="text-studio-400 italic">"{arrangement.logline}"</p>
                            <div className="pt-2 border-t border-studio-850">
                                <span className="text-studio-amber font-bold">DAW Action List:</span>
                                <ul className="list-decimal list-inside space-y-1 mt-1 text-studio-300">
                                    {(arrangement.next_moves || []).map((m, i) => (
                                        <li key={i}>{m}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
