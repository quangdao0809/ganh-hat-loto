'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useSocket } from '@/hooks/useSocket';
import { useAudio } from '@/hooks/useAudio';
import { NeonNumber } from '@/components/ui/NeonNumber';
import { GlassCard } from '@/components/ui/GlassCard';
import { Confetti } from '@/components/ui/Confetti';
import { SpinWheel } from '@/components/host/SpinWheel';
import { MasterBoard } from '@/components/host/MasterBoard';
import { TicketValidator } from '@/components/host/TicketValidator';
import { AudioController } from '@/components/host/AudioController';

export default function HostPage() {
    const [nickname, setNickname] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [audioMode, setAudioMode] = useState<'singing' | 'calling'>('singing');
    const [roomSettings, setRoomSettings] = useState({
        maxTicketsPerPlayer: 4,
        autoCall: false,
        callSpeed: 5,
        checkMode: 'manual' as 'manual' | 'auto'
    });
    const [showWinner, setShowWinner] = useState(false);
    const [winnerInfo, setWinnerInfo] = useState<{ nickname: string; row: number } | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [showConfirmClose, setShowConfirmClose] = useState(false);

    const {
        isConnected,
        room,
        calledNumbers,
        lastNumber,
        createRoom,
        startGame,
        spinNumber,
        resetGame,
        validateTicket,
        validateNumbers,
        onWinner,
        onAudioPlaySequence,
        leaveRoom,
    } = useSocket();

    const {
        isInitialized,
        progress,
        isBgmPlaying,
        bgmVolume,
        effectsVolume,
        isMuted,
        initialize,
        playSpinSequence,
        replayNumber,
        toggleBGM,
        setBGMVolume,
        setEffectsVolume,
        toggleMute,
    } = useAudio();

    // Handle winner event
    useEffect(() => {
        onWinner((data) => {
            setWinnerInfo({ nickname: data.nickname, row: data.row });
            setShowWinner(true);
            setTimeout(() => setShowWinner(false), 8000);
        });
    }, [onWinner]);

    // Handle audio sync
    useEffect(() => {
        onAudioPlaySequence((number) => {
            if (isInitialized) {
                playSpinSequence(number, room?.settings.audioMode || 'singing');
            }
        });
    }, [onAudioPlaySequence, isInitialized, playSpinSequence]);

    // Create room handler
    const handleCreateRoom = async () => {
        if (!nickname.trim()) return;

        setIsCreating(true);
        await initialize();
        await createRoom(nickname.trim(), {
            audioMode,
            ...roomSettings
        });
        setIsCreating(false);
    };

    // Spin handler
    const handleSpin = useCallback(async () => {
        setIsSpinning(true);
        const number = await spinNumber();

        // Wait for audio sequence
        if (number && isInitialized) {
            await playSpinSequence(number, room?.settings.audioMode || 'singing');
        }

        setIsSpinning(false);
        return number;
    }, [spinNumber, isInitialized, playSpinSequence]);

    // Close room handler
    const handleCloseRoom = () => {
        setShowConfirmClose(true);
    };

    const confirmCloseRoom = () => {
        leaveRoom();
        setShowConfirmClose(false);
    };

    // Get room URL for QR code
    const roomUrl = typeof window !== 'undefined' && room
        ? `${window.location.origin}/play?code=${room.code}`
        : '';

    // Not connected or no room - show create form
    if (!room) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <GlassCard className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold mb-2">
                            <span className="text-gradient">Gánh Hát Lô Tô</span>
                        </h1>
                        <p className="text-[var(--text-secondary)]">Tạo phòng mới để bắt đầu</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-[var(--text-muted)] mb-2">
                                Tên của bạn (Chủ phòng)
                            </label>
                            <input
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                className="input"
                                placeholder="Nhập tên..."
                                disabled={isCreating}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-[var(--text-muted)] mb-2">
                                Chế độ hô lô tô
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setAudioMode('singing')}
                                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${audioMode === 'singing'
                                        ? 'bg-[var(--surface-hover)] border-[var(--neon-gold)] text-[var(--neon-gold)]'
                                        : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                                        }`}
                                >
                                    <span className="text-xl">🎤</span>
                                    <span className="font-semibold text-sm">Hát Lô Tô</span>
                                </button>
                                <button
                                    onClick={() => setAudioMode('calling')}
                                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${audioMode === 'calling'
                                        ? 'bg-[var(--surface-hover)] border-[var(--neon-cyan)] text-[var(--neon-cyan)]'
                                        : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                                        }`}
                                >
                                    <span className="text-xl">📢</span>
                                    <span className="font-semibold text-sm">Chỉ Gọi Số</span>
                                </button>
                            </div>
                        </div>

                        {/* Quick Settings */}
                        <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                            <h3 className="font-semibold text-[var(--text-secondary)]">Thiết lập nhanh</h3>

                            {/* Tickets per player */}
                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-2">
                                    Số vé tối đa mỗi người: <span className="text-[var(--neon-gold)] font-bold">{roomSettings.maxTicketsPerPlayer}</span>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    className="w-full"
                                    value={roomSettings.maxTicketsPerPlayer}
                                    onChange={(e) => setRoomSettings(prev => ({ ...prev, maxTicketsPerPlayer: parseInt(e.target.value) }))}
                                />
                                <div className="flex justify-between text-xs text-[var(--text-muted)]">
                                    <span>1 vé</span>
                                    <span>10 vé</span>
                                </div>
                            </div>

                            {/* Auto Call */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-[var(--text-muted)]">Tự động gọi số</span>
                                <button
                                    onClick={() => setRoomSettings(prev => ({ ...prev, autoCall: !prev.autoCall }))}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${roomSettings.autoCall ? 'bg-[var(--neon-gold)]' : 'bg-[var(--surface-hover)]'
                                        }`}
                                >
                                    <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${roomSettings.autoCall ? 'translate-x-6' : ''
                                        }`} />
                                </button>
                            </div>

                            {/* Call Speed (only if Auto Call is on) */}
                            {roomSettings.autoCall && (
                                <div className="pl-4 border-l-2 border-[var(--border)]">
                                    <label className="block text-sm text-[var(--text-muted)] mb-2">
                                        Tốc độ gọi: <span className="text-[var(--neon-gold)] font-bold">{roomSettings.callSpeed}s/con</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="2"
                                        max="10"
                                        step="1"
                                        className="w-full"
                                        value={roomSettings.callSpeed}
                                        onChange={(e) => setRoomSettings(prev => ({ ...prev, callSpeed: parseInt(e.target.value) }))}
                                    />
                                    <div className="flex justify-between text-xs text-[var(--text-muted)]">
                                        <span>Nhanh (2s)</span>
                                        <span>Chậm (10s)</span>
                                    </div>
                                </div>
                            )}

                            {/* Check Mode */}
                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-2">
                                    Chế độ dò
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setRoomSettings(prev => ({ ...prev, checkMode: 'manual' }))}
                                        className={`p-2 rounded-lg border text-sm transition-all ${roomSettings.checkMode === 'manual'
                                            ? 'bg-[var(--surface-hover)] border-[var(--neon-blue)] text-[var(--neon-blue)]'
                                            : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)]'
                                            }`}
                                    >
                                        🖐 Thủ công
                                    </button>
                                    <button
                                        onClick={() => setRoomSettings(prev => ({ ...prev, checkMode: 'auto' }))}
                                        className={`p-2 rounded-lg border text-sm transition-all ${roomSettings.checkMode === 'auto'
                                            ? 'bg-[var(--surface-hover)] border-[var(--neon-purple)] text-[var(--neon-purple)]'
                                            : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)]'
                                            }`}
                                    >
                                        🤖 Tự động
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary btn-lg w-full"
                            onClick={handleCreateRoom}
                            disabled={!nickname.trim() || isCreating || !isConnected}
                        >
                            {!isConnected ? 'Đang kết nối...' : isCreating ? 'Đang tạo phòng...' : '🎪 Tạo Phòng'}
                        </button>
                    </div>

                    <div className="mt-6 pt-6 border-t border-[var(--border)]">
                        <p className="text-center text-sm text-[var(--text-muted)]">
                            Hoặc{' '}
                            <a href="/play" className="text-[var(--neon-cyan)] hover:underline">
                                tham gia phòng có sẵn
                            </a>
                        </p>
                    </div>
                </GlassCard>
            </div>
        );
    }

    // Host dashboard
    return (
        <div className="min-h-screen p-4">
            <Confetti active={showWinner} />

            {/* Confirm Close Modal */}
            <AnimatePresence>
                {showConfirmClose && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[var(--card-bg)] border-2 border-red-500/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                        >
                            <h3 className="text-xl font-bold text-red-500 mb-4">Đóng phòng?</h3>
                            <p className="text-[var(--text-secondary)] mb-6">
                                Bạn có chắc muốn đóng phòng này? Tất cả người chơi sẽ bị ngắt kết nối ngay lập tức.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    className="btn btn-secondary flex-1"
                                    onClick={() => setShowConfirmClose(false)}
                                >
                                    Hủy
                                </button>
                                <button
                                    className="btn btn-danger flex-1 bg-red-500 hover:bg-red-600 text-white border-none"
                                    onClick={confirmCloseRoom}
                                >
                                    Đóng phòng
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gradient">Gánh Hát Lô Tô</h1>
                    <p className="text-sm text-[var(--text-muted)]">
                        Phòng: <span className="text-[var(--neon-gold)] font-mono">{room.code}</span>
                        {' • '}
                        {room.players.length} người chơi
                    </p>
                </div>

                <div className="flex gap-2">
                    {room.status === 'waiting' && (
                        <button className="btn btn-primary" onClick={startGame}>
                            🎮 Bắt đầu
                        </button>
                    )}
                    <button className="btn btn-secondary" onClick={resetGame}>
                        🔄 Ván mới
                    </button>
                    <button
                        className="btn btn-sm btn-danger ml-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/50"
                        onClick={handleCloseRoom}
                    >
                        ⛔ Đóng phòng
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Area - Spin & Current Number */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Current Number Display */}
                    <GlassCard className="text-center py-8" hover={false}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={lastNumber ?? 'empty'}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                            >
                                <NeonNumber number={lastNumber} size="xl" />
                            </motion.div>
                        </AnimatePresence>

                        {/* Spin Button */}
                        <div className="mt-8">
                            <SpinWheel
                                onSpin={handleSpin}
                                disabled={room.status !== 'playing'}
                                isSpinning={isSpinning}
                            />
                        </div>

                        {room.status === 'waiting' && (
                            <p className="mt-4 text-[var(--text-muted)]">
                                Nhấn &quot;Bắt đầu&quot; để chơi
                            </p>
                        )}
                    </GlassCard>

                    {/* Master Board */}
                    <MasterBoard calledNumbers={calledNumbers} lastNumber={lastNumber} />
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* QR Code */}
                    <GlassCard className="text-center">
                        <h3 className="text-lg font-semibold mb-4 text-[var(--text-secondary)]">
                            Mời người chơi
                        </h3>
                        <div className="bg-white p-4 rounded-lg inline-block mb-4">
                            <QRCodeSVG value={roomUrl} size={150} />
                        </div>
                        <p className="text-sm text-[var(--text-muted)] mb-2">
                            Quét mã hoặc nhập mã phòng:
                        </p>
                        <p className="text-2xl font-mono font-bold text-[var(--neon-gold)]">
                            {room.code}
                        </p>
                    </GlassCard>

                    {/* Audio Controller */}
                    <AudioController
                        isBgmPlaying={isBgmPlaying}
                        bgmVolume={bgmVolume}
                        effectsVolume={effectsVolume}
                        isMuted={isMuted}
                        lastNumber={lastNumber}
                        progress={progress}
                        onToggleBGM={toggleBGM}
                        onBgmVolumeChange={setBGMVolume}
                        onEffectsVolumeChange={setEffectsVolume}
                        onToggleMute={toggleMute}
                        onReplay={replayNumber}
                    />

                    {/* Ticket Validator */}
                    <TicketValidator
                        onValidateTicket={validateTicket}
                        onValidateNumbers={validateNumbers}
                    />

                    {/* Players List */}
                    <GlassCard>
                        <h3 className="text-lg font-semibold mb-4 text-[var(--text-secondary)]">
                            Người chơi ({room.players.length})
                        </h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {room.players.map((player, index) => (
                                <div
                                    key={player.oderId}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <span className={index === 0 ? 'text-[var(--neon-gold)]' : ''}>
                                        {index === 0 ? '👑' : '👤'}
                                    </span>
                                    <span>{player.nickname}</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* Winner Modal */}
            <AnimatePresence>
                {showWinner && winnerInfo && (
                    <motion.div
                        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="text-center"
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.5 }}
                        >
                            <p className="text-6xl mb-4">🎉</p>
                            <h2 className="text-4xl font-bold text-gradient mb-4">KINH!</h2>
                            <p className="text-2xl text-[var(--neon-gold)]">
                                {winnerInfo.nickname}
                            </p>
                            <p className="text-lg text-[var(--text-secondary)] mt-2">
                                Thắng hàng {winnerInfo.row + 1}!
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
