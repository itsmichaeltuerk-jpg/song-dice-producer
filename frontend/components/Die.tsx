import React from 'react';
import { Lock, Unlock, RefreshCw } from 'lucide-react';
import { DieState } from '../types';

interface DieProps {
    die: DieState;
    onToggleLock: (id: string) => void;
    isRolling: boolean;
}

export const Die: React.FC<DieProps> = ({ die, onToggleLock, isRolling }) => {
    const isAnimating = isRolling && !die.isLocked;

    return (
        <div 
            onClick={() => !isRolling && onToggleLock(die.id)}
            className={`
                relative flex flex-col items-center justify-center p-4 rounded-2xl cursor-pointer
                transition-all duration-300 ease-in-out select-none
                w-32 h-32 sm:w-40 sm:h-40
                ${die.isLocked 
                    ? 'bg-gradient-to-br from-studio-800 to-studio-900 border-2 border-studio-amber shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                    : 'bg-gradient-to-br from-studio-800 to-studio-950 border border-studio-700 hover:border-studio-500 hover:from-studio-700 hover:to-studio-900 shadow-xl'}
                ${isAnimating ? 'animate-pulse scale-95 brightness-150' : 'scale-100'}
            `}
            style={{
                // Subtle inner shadow for a 3D cube/button feel
                boxShadow: die.isLocked 
                    ? 'inset 0 2px 10px rgba(255,255,255,0.1), 0 0 15px rgba(245,158,11,0.3)' 
                    : 'inset 0 2px 10px rgba(255,255,255,0.05), 0 10px 20px rgba(0,0,0,0.5)'
            }}
        >
            <div className="absolute top-3 right-3 text-studio-700">
                {die.isLocked ? (
                    <Lock size={16} className="text-studio-amber drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]" />
                ) : (
                    <Unlock size={16} className="opacity-40" />
                )}
            </div>
            
            <span className="text-xs font-mono text-studio-400 uppercase tracking-wider mb-2 drop-shadow-md">
                {die.category}
            </span>
            
            <div className="text-center px-2">
                {isAnimating ? (
                    <RefreshCw className="animate-spin text-studio-500 mx-auto" size={24} />
                ) : (
                    <span className={`font-bold text-sm sm:text-base leading-tight drop-shadow-md ${die.isLocked ? 'text-white' : 'text-studio-200'}`}>
                        {die.value}
                    </span>
                )}
            </div>
        </div>
    );
};
