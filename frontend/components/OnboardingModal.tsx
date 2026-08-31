import React from 'react';
import { X, Dices, Lock, Play, Download, Sparkles, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div 
                className="bg-studio-900 border border-studio-750 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-studio-800 bg-gradient-to-br from-studio-950 via-studio-900 to-studio-850 text-center relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-lg text-studio-400 hover:text-white hover:bg-studio-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                    <div className="w-12 h-12 rounded-2xl bg-studio-amber/20 border border-studio-amber/40 text-studio-amber flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                        <Dices size={28} />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight">
                        WELCOME TO SONG DICE
                    </h2>
                    <p className="text-xs text-studio-400 font-mono mt-1">
                        Roll a starting point. Export the MIDI. Finish the song.
                    </p>
                </div>

                {/* 4-Step Quick Tour */}
                <div className="p-6 space-y-4">
                    <div className="flex items-start gap-3.5">
                        <div className="p-2.5 rounded-xl bg-studio-850 border border-studio-750 text-studio-amber shrink-0 font-mono font-bold text-xs">
                            01
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                                <Dices size={15} className="text-studio-amber" />
                                Roll the Studio Table
                            </h4>
                            <p className="text-xs text-studio-400 mt-0.5 leading-relaxed">
                                Hit <strong>ROLL UNLOCKED</strong> (or press <kbd className="px-1.5 py-0.5 rounded bg-studio-800 text-[10px] font-mono">R</kbd>). Each die sets a musical parameter (Key, BPM, Chords, Groove).
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3.5">
                        <div className="p-2.5 rounded-xl bg-studio-850 border border-studio-750 text-studio-ledCyan shrink-0 font-mono font-bold text-xs">
                            02
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                                <Lock size={15} className="text-studio-ledCyan" />
                                Lock What You Like
                            </h4>
                            <p className="text-xs text-studio-400 mt-0.5 leading-relaxed">
                                Click any die to lock its value. Locked dice stay put while unlocked dice roll to explore new combinations.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3.5">
                        <div className="p-2.5 rounded-xl bg-studio-850 border border-studio-750 text-studio-ledGreen shrink-0 font-mono font-bold text-xs">
                            03
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                                <Play size={15} className="text-studio-ledGreen" />
                                Preview in Web Audio
                            </h4>
                            <p className="text-xs text-studio-400 mt-0.5 leading-relaxed">
                                Hit <strong>PLAY</strong> (or <kbd className="px-1.5 py-0.5 rounded bg-studio-800 text-[10px] font-mono">Space</kbd>). Use the stem mixer to mute/solo leads, chords, bass, and drums.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3.5">
                        <div className="p-2.5 rounded-xl bg-studio-850 border border-studio-750 text-studio-ledPurple shrink-0 font-mono font-bold text-xs">
                            04
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                                <Download size={15} className="text-studio-ledPurple" />
                                Export Multitrack MIDI
                            </h4>
                            <p className="text-xs text-studio-400 mt-0.5 leading-relaxed">
                                Download standard Type 1 MIDI with GM drum mapping or separated stems and drop directly into Ableton, FL Studio, or Logic.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-5 border-t border-studio-800 bg-studio-950/60 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl bg-studio-amber text-studio-950 font-black text-xs sm:text-sm tracking-wider hover:bg-amber-400 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                    >
                        <span>START PRODUCING</span>
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};
