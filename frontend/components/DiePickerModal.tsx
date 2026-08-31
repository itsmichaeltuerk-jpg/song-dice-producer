import React, { useState } from 'react';
import { X, Check, Dices } from 'lucide-react';
import { DieState } from '../types';

interface DiePickerModalProps {
    die: DieState | null;
    isOpen: boolean;
    onClose: () => void;
    onSelectValue: (dieId: string, newValue: string) => void;
}

export const DiePickerModal: React.FC<DiePickerModalProps> = ({
    die,
    isOpen,
    onClose,
    onSelectValue
}) => {
    const [customValue, setCustomValue] = useState('');

    if (!isOpen || !die) return null;

    const handlePick = (val: string) => {
        onSelectValue(die.id, val);
        onClose();
    };

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (customValue.trim()) {
            handlePick(customValue.trim());
            setCustomValue('');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div 
                className="bg-studio-900 border border-studio-750 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-studio-800 flex items-center justify-between bg-studio-950/60">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-studio-800 rounded-lg text-studio-amber">
                            <Dices size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                Choose Face: <span className="text-studio-amber">{die.category}</span>
                            </h3>
                            <p className="text-xs text-studio-400 font-mono mt-0.5">{die.description || 'Select a face value for this die'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-studio-400 hover:text-white hover:bg-studio-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Preset Options Grid */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-2 flex-1">
                    <label className="text-xs font-mono uppercase tracking-wider text-studio-500 font-semibold block mb-2">
                        Standard Faces
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {die.options.map((option) => {
                            const isSelected = die.value === option;
                            return (
                                <button
                                    key={option}
                                    onClick={() => handlePick(option)}
                                    className={`text-left p-3 rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-center justify-between ${
                                        isSelected 
                                            ? 'bg-studio-amber/15 border-studio-amber text-studio-amber font-bold shadow-[0_0_12px_rgba(245,158,11,0.2)]' 
                                            : 'bg-studio-850/80 border-studio-750 text-studio-200 hover:border-studio-amber/50 hover:bg-studio-800'
                                    }`}
                                >
                                    <span className="truncate pr-2">{option}</span>
                                    {isSelected && <Check size={16} className="text-studio-amber shrink-0" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Custom Value Input */}
                    <div className="pt-4 mt-4 border-t border-studio-800">
                        <label className="text-xs font-mono uppercase tracking-wider text-studio-500 font-semibold block mb-2">
                            Or Type Custom Producer Note / Face
                        </label>
                        <form onSubmit={handleCustomSubmit} className="flex gap-2">
                            <input
                                type="text"
                                placeholder="e.g. 108 BPM Indie Disco / F# Minor Phrygian"
                                value={customValue}
                                onChange={(e) => setCustomValue(e.target.value)}
                                className="flex-1 bg-studio-950 border border-studio-750 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-studio-600 focus:outline-none focus:border-studio-amber"
                            />
                            <button
                                type="submit"
                                disabled={!customValue.trim()}
                                className="px-4 py-2 bg-studio-amber text-studio-950 font-bold text-xs sm:text-sm rounded-xl hover:bg-amber-400 disabled:opacity-40 transition-colors"
                            >
                                Set Face
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
