import React, { useState } from 'react';
import { X, Heart, History, Sparkles, Copy, Check, Trash2, ArrowRight } from 'lucide-react';
import { SavedSession } from '../types';

interface HistoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    history: SavedSession[];
    onRestoreSession: (session: SavedSession) => void;
    onToggleFavorite: (id: string) => void;
    onClearHistory: () => void;
    onLoadSeedCode: (seed: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
    isOpen,
    onClose,
    history,
    onRestoreSession,
    onToggleFavorite,
    onClearHistory,
    onLoadSeedCode
}) => {
    const [seedInput, setSeedInput] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleCopySeed = (seed: string, id: string) => {
        navigator.clipboard.writeText(seed);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleSeedSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (seedInput.trim()) {
            onLoadSeedCode(seedInput.trim());
            setSeedInput('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
            <div 
                className="w-full max-w-md bg-studio-900 border-l border-studio-800 h-full flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b border-studio-800 flex items-center justify-between bg-studio-950/70">
                    <div className="flex items-center gap-2">
                        <History className="text-studio-amber" size={20} />
                        <h3 className="text-base font-bold text-white">Session History & Favorites</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-studio-400 hover:text-white hover:bg-studio-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Seed Code Loader Form */}
                <div className="p-4 border-b border-studio-800 bg-studio-950/40">
                    <form onSubmit={handleSeedSubmit} className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Enter Seed (e.g. SD-94BPM-Amin-7F2A)"
                            value={seedInput}
                            onChange={(e) => setSeedInput(e.target.value)}
                            className="flex-1 bg-studio-900 border border-studio-750 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-studio-600 focus:outline-none focus:border-studio-amber"
                        />
                        <button
                            type="submit"
                            disabled={!seedInput.trim()}
                            className="px-3 py-2 bg-studio-amber text-studio-950 font-bold text-xs font-mono rounded-xl hover:bg-amber-400 disabled:opacity-40 transition-colors flex items-center gap-1"
                        >
                            <span>LOAD</span>
                            <ArrowRight size={13} />
                        </button>
                    </form>
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {history.length === 0 ? (
                        <div className="text-center py-12 text-studio-500 font-mono text-xs">
                            No saved rolls yet. Every time you roll the dice, the arrangement will be saved here.
                        </div>
                    ) : (
                        history.map((item) => (
                            <div
                                key={item.id}
                                className="bg-studio-950 p-3.5 rounded-xl border border-studio-800 hover:border-studio-amber/40 transition-all flex flex-col gap-2 group"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h4 className="font-bold text-sm text-white group-hover:text-studio-amber transition-colors">
                                            {item.name}
                                        </h4>
                                        <p className="text-[11px] text-studio-400 font-mono mt-0.5">
                                            {item.arrangement.bpm} BPM • {item.arrangement.key}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => onToggleFavorite(item.id)}
                                            className={`p-1.5 rounded-lg transition-colors ${
                                                item.isFavorite
                                                    ? 'text-red-500 bg-red-500/10'
                                                    : 'text-studio-600 hover:text-studio-300'
                                            }`}
                                        >
                                            <Heart size={15} fill={item.isFavorite ? 'currentColor' : 'none'} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleCopySeed(item.seedCode, item.id)}
                                            className="p-1.5 rounded-lg text-studio-500 hover:text-studio-amber hover:bg-studio-800 transition-colors"
                                            title="Copy Share Seed Code"
                                        >
                                            {copiedId === item.id ? <Check size={14} className="text-studio-amber" /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-studio-900">
                                    <span className="text-[10px] font-mono text-studio-500 truncate max-w-[180px]">
                                        {item.seedCode}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onRestoreSession(item);
                                            onClose();
                                        }}
                                        className="px-3 py-1 rounded-lg bg-studio-850 hover:bg-studio-amber hover:text-studio-950 text-xs font-mono font-bold text-studio-200 transition-colors"
                                    >
                                        RESTORE
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Clear Button */}
                {history.length > 0 && (
                    <div className="p-3.5 border-t border-studio-800 bg-studio-950/60 flex justify-between items-center">
                        <span className="text-xs font-mono text-studio-500">{history.length} Saved Sessions</span>
                        <button
                            type="button"
                            onClick={onClearHistory}
                            className="text-xs font-mono text-studio-500 hover:text-red-400 flex items-center gap-1.5 transition-colors"
                        >
                            <Trash2 size={13} />
                            <span>Clear All</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
