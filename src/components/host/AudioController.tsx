'use client';

import { motion } from 'framer-motion';

interface AudioControllerProps {
    isBgmPlaying: boolean;
    bgmVolume: number;
    effectsVolume: number;
    isMuted: boolean;
    lastNumber: number | null;
    progress: { total: number };
    onToggleBGM: () => void;
    onBgmVolumeChange: (volume: number) => void;
    onEffectsVolumeChange: (volume: number) => void;
    onToggleMute: () => void;
    onReplay: (number: number) => void;
}

export function AudioController({
    isBgmPlaying,
    bgmVolume,
    effectsVolume,
    isMuted,
    lastNumber,
    progress,
    onToggleBGM,
    onBgmVolumeChange,
    onEffectsVolumeChange,
    onToggleMute,
    onReplay,
}: AudioControllerProps) {
    return (
        <div className="glass-card p-4">
            <h3 className="text-lg font-semibold mb-4 text-center text-[var(--text-secondary)]">
                Âm Thanh
            </h3>

            {/* Loading Progress */}
            {progress.total < 100 && (
                <div className="mb-4">
                    <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                        <span>Đang tải âm thanh</span>
                        <span>{progress.total}%</span>
                    </div>
                    <div className="loading-bar">
                        <motion.div
                            className="loading-bar-fill"
                            style={{ width: `${progress.total}%` }}
                        />
                    </div>
                </div>
            )}

            {/* BGM Controls */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[var(--text-secondary)]">Nhạc nền</span>
                    <button
                        className={`btn btn-sm ${isBgmPlaying ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={onToggleBGM}
                    >
                        {isBgmPlaying ? '⏸️ Tạm dừng' : '▶️ Phát'}
                    </button>
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={bgmVolume * 100}
                    onChange={(e) => onBgmVolumeChange(parseInt(e.target.value) / 100)}
                    className="w-full"
                />
            </div>

            {/* Effects Volume */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[var(--text-secondary)]">Âm lượng rao số</span>
                    <span className="text-xs text-[var(--text-muted)]">{Math.round(effectsVolume * 100)}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={effectsVolume * 100}
                    onChange={(e) => onEffectsVolumeChange(parseInt(e.target.value) / 100)}
                    className="w-full"
                />
            </div>

            {/* Mute & Replay */}
            <div className="flex gap-2">
                <button
                    className={`btn btn-sm flex-1 ${isMuted ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={onToggleMute}
                >
                    {isMuted ? '🔇 Đã tắt' : '🔊 Âm thanh'}
                </button>

                <button
                    className="btn btn-sm btn-secondary flex-1"
                    onClick={() => lastNumber && onReplay(lastNumber)}
                    disabled={!lastNumber}
                >
                    🔄 Phát lại
                </button>
            </div>
        </div>
    );
}

export default AudioController;
