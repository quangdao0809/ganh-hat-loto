'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';

interface JoinRoomProps {
    initialCode?: string;
    isConnected: boolean;
    onJoin: (code: string, nickname: string) => Promise<boolean>;
}

export function JoinRoom({ initialCode = '', isConnected, onJoin }: JoinRoomProps) {
    const [code, setCode] = useState(initialCode);
    const [nickname, setNickname] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleJoin = async () => {
        if (!code.trim() || !nickname.trim()) return;

        setIsJoining(true);
        setError(null);

        const success = await onJoin(code.trim().toUpperCase(), nickname.trim());

        if (!success) {
            setError('Không thể tham gia phòng. Vui lòng kiểm tra mã phòng.');
        }

        setIsJoining(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <GlassCard className="w-full max-w-md">
                <div className="text-center mb-8">
                    <motion.div
                        className="text-6xl mb-4"
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        🎪
                    </motion.div>
                    <h1 className="text-3xl font-bold mb-2">
                        <span className="text-gradient">Gánh Hát Lô Tô</span>
                    </h1>
                    <p className="text-[var(--text-secondary)]">Tham gia phòng chơi</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-2">
                            Mã phòng
                        </label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            className="input text-center text-2xl font-mono tracking-widest"
                            placeholder="ABCD12"
                            maxLength={6}
                            disabled={isJoining}
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-2">
                            Tên của bạn
                        </label>
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className="input"
                            placeholder="Nhập tên..."
                            disabled={isJoining}
                            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                        />
                    </div>

                    {error && (
                        <motion.p
                            className="text-red-400 text-sm text-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            {error}
                        </motion.p>
                    )}

                    <button
                        className="btn btn-primary btn-lg w-full"
                        onClick={handleJoin}
                        disabled={!code.trim() || !nickname.trim() || isJoining || !isConnected}
                    >
                        {!isConnected ? 'Đang kết nối...' : isJoining ? 'Đang vào phòng...' : '🎟️ Vào Phòng'}
                    </button>
                </div>

                <div className="mt-6 pt-6 border-t border-[var(--border)]">
                    <p className="text-center text-sm text-[var(--text-muted)]">
                        Hoặc{' '}
                        <a href="/host" className="text-[var(--neon-cyan)] hover:underline">
                            tạo phòng mới
                        </a>
                    </p>
                </div>
            </GlassCard>
        </div>
    );
}

export default JoinRoom;
