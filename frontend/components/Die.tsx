import React from 'react';
import { Lock, Unlock, Edit3, Sparkles } from 'lucide-react';
import { DieState } from '../types';

interface DieProps {
    die: DieState;
    onToggleLock: (id: string) => void;
    onOpenEdit: (die: DieState) => void;
    isRolling: boolean;
    isDownbeatPulse: boolean;
}

// Helper to render authentic dice corner pip accents based on die index/category
function getDiePipsCount(category: string): number {
    switch (category) {
        case 'Key / Mode': return 1;
        case 'Tempo & Feel': return 2;
        case 'Structure': return 3;
        case 'Chord Progression': return 4;
        case 'Chord Rhythm': return 5;
        case 'Bassline': return 6;
        case 'Drum Groove': return 4;
        default: return 3;
    }
}

export const Die: React.FC<DieProps> = ({
    die,
    onToggleLock,
    onOpenEdit,
    isRolling,
    isDownbeatPulse
}) => {
    const isSpinning = isRolling && !die.isLocked;
    const pipsCount = getDiePipsCount(die.category);

    // Split category & detail for readable typography
    const valueParts = die.value.split('•');
    const primaryText = valueParts[0].trim();
    const subText = valueParts.length > 1 ? valueParts[1].trim() : null;

    return (
        <div
            className={`
                group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl
                transition-all duration-300 select-none cursor-pointer
                w-[150px] h-[150px] sm:w-[170px] sm:h-[170px]
                /* 3D Chamfered Edge & Physical Dice Bevel */
                border-t border-l border-r-2 border-b-2
                ${die.isLocked 
                    ? 'bg-gradient-to-br from-[#241f17] via-[#1a1610] to-[#120f0a] border-t-amber-400/50 border-l-amber-500/30 border-r-black/80 border-b-black/90 shadow-[0_12px_28px_-4px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.22)] ring-1 ring-studio-amber/60' 
                    : 'bg-gradient-to-br from-[#22222d] via-[#17171f] to-[#0d0d12] border-t-white/15 border-l-white/10 border-r-black/70 border-b-black/80 hover:border-t-studio-amber/40 hover:border-l-studio-amber/30 hover:from-[#2a2a38] shadow-[0_12px_28px_-4px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.12)] hover:shadow-amber-subtle'}
                ${isSpinning ? 'animate-die-spin opacity-80' : 'hover:-translate-y-1 active:translate-y-0.5'}
                ${isDownbeatPulse && !isSpinning ? 'scale-[1.03] border-t-amber-300 ring-2 ring-studio-amber/40' : ''}
            `}
            onClick={() => {
                if (!isRolling) onToggleLock(die.id);
            }}
            role="button"
            tabIndex={0}
            aria-label={`${die.category} die. Current value: ${die.value}. ${die.isLocked ? 'Locked' : 'Unlocked'}`}
            onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    if (!isRolling) onToggleLock(die.id);
                }
            }}
        >
            {/* Embedded Physical Dice Pips in Top Left & Bottom Right Corners */}
            <div className="absolute top-2.5 left-2.5 flex gap-1 pointer-events-none opacity-40 group-hover:opacity-75 transition-opacity">
                {Array.from({ length: Math.min(3, pipsCount) }).map((_, i) => (
                    <span 
                        key={i} 
                        className={`w-1.5 h-1.5 rounded-full ${
                            die.isLocked ? 'bg-studio-amber shadow-[0_0_4px_#f59e0b]' : 'bg-studio-500'
                        }`} 
                    />
                ))}
            </div>

            {/* Top Bar: Category Label + Lock & Edit Controls */}
            <div className="flex items-center justify-between w-full pt-0.5 pl-6">
                <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-wider uppercase text-studio-400 group-hover:text-studio-200 transition-colors">
                    {die.shortLabel || die.category.split('/')[0]}
                </span>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {/* Face Edit Button */}
                    <button
                        type="button"
                        onClick={() => onOpenEdit(die)}
                        className="p-1 rounded-md text-studio-500 hover:text-studio-amber hover:bg-studio-800/80 transition-colors"
                        title="Pick specific face or customize"
                    >
                        <Edit3 size={12} />
                    </button>

                    {/* Physical Lock Pin Switch */}
                    <button
                        type="button"
                        onClick={() => onToggleLock(die.id)}
                        className={`p-1.5 rounded-lg transition-all ${
                            die.isLocked 
                                ? 'bg-studio-amber text-studio-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.6)] scale-105' 
                                : 'text-studio-500 hover:text-studio-200 hover:bg-studio-800/70'
                        }`}
                        title={die.isLocked ? "Click to unlock this die" : "Click to lock this die"}
                    >
                        {die.isLocked ? <Lock size={12} strokeWidth={2.5} /> : <Unlock size={12} />}
                    </button>
                </div>
            </div>

            {/* Die Center: Embossed Musical Value */}
            <div className="my-auto text-center flex flex-col items-center justify-center py-1 px-1">
                {isSpinning ? (
                    <div className="flex flex-col items-center gap-1 text-studio-amber animate-pulse">
                        <Sparkles size={20} className="animate-spin text-studio-amber" />
                        <span className="text-[9px] font-mono tracking-widest text-studio-400">ROLLING</span>
                    </div>
                ) : (
                    <>
                        <span className={`font-black text-xs sm:text-[13px] leading-tight tracking-tight px-1 line-clamp-2 drop-shadow-md ${
                            die.isLocked 
                                ? 'text-amber-100' 
                                : 'text-studio-100 group-hover:text-white'
                        }`}>
                            {primaryText}
                        </span>
                        {subText && (
                            <span className="text-[9px] sm:text-[10px] font-mono text-studio-400 mt-1 line-clamp-1 opacity-90">
                                {subText}
                            </span>
                        )}
                    </>
                )}
            </div>

            {/* Die Bottom: Physical Dice Footer with Pip Indicator */}
            <div className="flex items-center justify-between w-full pt-1.5 border-t border-white/5">
                <span className="text-[9px] font-mono text-studio-500 truncate max-w-[105px]">
                    {die.category}
                </span>
                
                {/* Status Jewel Light / Pip */}
                <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full transition-all ${
                        die.isLocked 
                            ? 'bg-studio-amber shadow-[0_0_8px_#f59e0b] ring-1 ring-amber-300/50' 
                            : 'bg-studio-700/80 group-hover:bg-studio-500'
                    }`} />
                </div>
            </div>
        </div>
    );
};
