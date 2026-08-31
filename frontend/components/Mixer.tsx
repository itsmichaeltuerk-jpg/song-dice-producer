import React, { useState } from 'react';
import { Volume2, VolumeX, Bell, Sliders, Zap, Flame } from 'lucide-react';
import { MixerState, StemTrack } from '../types';

interface MixerProps {
    mixer: MixerState;
    onChangeMixer: (updated: MixerState) => void;
}

export const Mixer: React.FC<MixerProps> = ({ mixer, onChangeMixer }) => {
    const [isBassBoosted, setIsBassBoosted] = useState(true);

    const tracks: Array<{ key: StemTrack; label: string; color: string; highlight?: boolean }> = [
        { key: 'bass', label: 'BASS', color: '#c084fc', highlight: true },
        { key: 'drums', label: 'DRUMS', color: '#10b981' },
        { key: 'chords', label: 'KEYS', color: '#06b6d4' },
        { key: 'melody', label: 'LEAD', color: '#f59e0b' },
        { key: 'pad', label: 'PAD', color: '#3b82f6' }
    ];

    const handleVolume = (track: StemTrack, vol: number) => {
        onChangeMixer({
            ...mixer,
            [track]: { ...mixer[track], volume: vol }
        });
    };

    const handleToggleMute = (track: StemTrack) => {
        onChangeMixer({
            ...mixer,
            [track]: { ...mixer[track], muted: !mixer[track].muted }
        });
    };

    const handleToggleSolo = (track: StemTrack) => {
        onChangeMixer({
            ...mixer,
            [track]: { ...mixer[track], solo: !mixer[track].solo }
        });
    };

    const handleToggleBassBoost = () => {
        const newBoost = !isBassBoosted;
        setIsBassBoosted(newBoost);
        onChangeMixer({
            ...mixer,
            bass: { ...mixer.bass, volume: newBoost ? 1.0 : 0.75 }
        });
    };

    return (
        <div className="bg-studio-900/80 border border-studio-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-studio-800 pb-2.5">
                <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-studio-amber" />
                    <h4 className="text-xs font-mono uppercase tracking-widest font-bold text-studio-200">
                        Stem Mixer & Transport
                    </h4>
                </div>

                <div className="flex items-center gap-2">
                    {/* Bass Punch Booster */}
                    <button
                        type="button"
                        onClick={handleToggleBassBoost}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                            isBassBoosted
                                ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)] border border-purple-400'
                                : 'bg-studio-800 text-studio-400 hover:text-white'
                        }`}
                        title="Toggle Low-End Bass Punch"
                    >
                        <Flame size={13} className={isBassBoosted ? 'text-amber-300' : ''} />
                        <span>BASS PUNCH</span>
                    </button>

                    {/* Metronome Button */}
                    <button
                        type="button"
                        onClick={() => onChangeMixer({ ...mixer, metronome: !mixer.metronome })}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                            mixer.metronome
                                ? 'bg-studio-amber text-studio-950 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                                : 'bg-studio-800 text-studio-400 hover:text-white'
                        }`}
                        title="Toggle Metronome Click"
                    >
                        <Bell size={13} />
                        <span>CLICK {mixer.metronome ? 'ON' : 'OFF'}</span>
                    </button>
                </div>
            </div>

            {/* Track Strips */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {tracks.map(({ key, label, color, highlight }) => {
                    const t = mixer[key];
                    return (
                        <div 
                            key={key} 
                            className={`p-2.5 rounded-xl border flex flex-col gap-2 transition-all ${
                                highlight 
                                    ? 'bg-studio-950 border-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.2)] ring-1 ring-purple-500/30' 
                                    : 'bg-studio-950 border-studio-800'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-mono font-bold flex items-center gap-1" style={{ color }}>
                                    {highlight && <Zap size={11} className="text-purple-400" />}
                                    {label}
                                </span>
                                <span className="text-[10px] font-mono text-studio-300 font-bold">
                                    {Math.round(t.volume * 100)}%
                                </span>
                            </div>

                            {/* Volume Fader Slider */}
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={t.volume}
                                onChange={(e) => handleVolume(key, parseFloat(e.target.value))}
                                className="w-full accent-studio-amber h-1.5 bg-studio-800 rounded-lg cursor-pointer"
                            />

                            {/* Mute / Solo Buttons */}
                            <div className="flex gap-1.5 pt-1">
                                <button
                                    type="button"
                                    onClick={() => handleToggleMute(key)}
                                    className={`flex-1 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                                        t.muted 
                                            ? 'bg-studio-ledRed text-white' 
                                            : 'bg-studio-850 text-studio-400 hover:text-white'
                                    }`}
                                >
                                    MUTE
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleToggleSolo(key)}
                                    className={`flex-1 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                                        t.solo 
                                            ? 'bg-studio-amber text-studio-950' 
                                            : 'bg-studio-850 text-studio-400 hover:text-white'
                                    }`}
                                >
                                    SOLO
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
