'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/hooks/useSocket';
import { useAudio } from '@/hooks/useAudio';
import { NeonNumber } from '@/components/ui/NeonNumber';
import { GlassCard } from '@/components/ui/GlassCard';
import { Confetti } from '@/components/ui/Confetti';
import { JoinRoom } from '@/components/player/JoinRoom';
import { LotoTicket } from '@/components/player/LotoTicket';
import { NumberTracker } from '@/components/player/NumberTracker';
import type { LotoTicket as LotoTicketType, ValidationResult } from '@/lib/game-types';

function PlayerContent() {
    const searchParams = useSearchParams();
    const initialCode = searchParams.get('code') || '';

    const [tickets, setTickets] = useState<LotoTicketType[]>([]);
    const [showWinner, setShowWinner] = useState(false);
    const [isMyWin, setIsMyWin] = useState(false);
    const [winnerName, setWinnerName] = useState('');
    const [ticketCount, setTicketCount] = useState(1);
    const [kinhResult, setKinhResult] = useState<ValidationResult | null>(null);
    const [showTracker, setShowTracker] = useState(false);

    const {
        isConnected,
        room,
        calledNumbers,
        lastNumber,
        joinRoom,
        createTickets,
        markNumber,
        callKinh,
        onWinner,
        onAudioPlaySequence,
        onRoomClosed,
        restoreSession,
        leaveRoom,
    } = useSocket();

    const {
        isInitialized,
        progress,
        initialize,
        playSpinSequence,
    } = useAudio();

    // Auto restore session
    useEffect(() => {
        const initSession = async () => {
            if (isConnected && !room) {
                // Try restore
                const sessionData = await restoreSession();
                if (sessionData && sessionData.tickets) {
                    setTickets(sessionData.tickets);
                }
            }
        };
        initSession();
    }, [isConnected, room, restoreSession]);

    // Handle winner event
    useEffect(() => {
        onWinner((data) => {
            setWinnerName(data.nickname);
            setShowWinner(true);
            // Check if it's my win (compare with local tickets)
            const myTicketIds = tickets.map(t => t.id);
            setIsMyWin(myTicketIds.includes(data.ticketId));
            setTimeout(() => setShowWinner(false), 8000);
        });
    }, [onWinner, tickets]);

    // Handle audio sync
    useEffect(() => {
        onAudioPlaySequence((number) => {
            if (isInitialized) {
                playSpinSequence(number, room?.settings.audioMode || 'singing');
            }
        });
    }, [onAudioPlaySequence, isInitialized, playSpinSequence]);

    // Handle room closed
    useEffect(() => {
        onRoomClosed(() => {
            setTickets([]);
        });
    }, [onRoomClosed]);

    // Join handler
    const handleJoin = useCallback(async (code: string, nickname: string): Promise<boolean> => {
        await initialize();
        const joinedRoom = await joinRoom(code, nickname);
        return joinedRoom !== null;
    }, [joinRoom, initialize]);

    // Create tickets handler
    const handleCreateTickets = useCallback(async () => {
        const newTickets = await createTickets(ticketCount);
        setTickets(prev => [...prev, ...newTickets]);
    }, [createTickets, ticketCount]);

    // Mark number handler
    const handleMarkNumber = useCallback((ticketId: string, gridIndex: number, rowIndex: number, colIndex: number) => {
        markNumber(ticketId, gridIndex, rowIndex, colIndex);
        // Update local state
        setTickets(prev => prev.map(t => {
            if (t.id === ticketId) {
                const newGrids = [...t.grids];
                const targetGrid = newGrids[gridIndex];
                const newRows = [...targetGrid.rows] as typeof targetGrid.rows;

                newRows[rowIndex] = {
                    ...newRows[rowIndex],
                    marked: [...newRows[rowIndex].marked],
                };
                newRows[rowIndex].marked[colIndex] = !newRows[rowIndex].marked[colIndex];

                newGrids[gridIndex] = { ...targetGrid, rows: newRows };
                return { ...t, grids: newGrids };
            }
            return t;
        }));
    }, [markNumber]);

    // Auto-mark logic
    useEffect(() => {
        if (!room?.settings.autoMarkNumbers || tickets.length === 0 || lastNumber === null) return;

        setTickets(prevTickets => prevTickets.map(ticket => {
            // Deep clone to avoid mutation issues
            const newTicket = JSON.parse(JSON.stringify(ticket));
            let hasChanges = false;

            newTicket.grids.forEach((grid: any, gIndex: number) => {
                grid.rows.forEach((row: any, rIndex: number) => {
                    row.cells.forEach((cell: number | null, cIndex: number) => {
                        if (cell === lastNumber && !row.marked[cIndex]) {
                            row.marked[cIndex] = true;
                            hasChanges = true;
                            // Optionally emit to server if persistence is needed, 
                            // but server usually trusts client 'call-kinh' validation.
                            // For true state sync, we should emit markNumber here too.
                            markNumber(ticket.id, gIndex, rIndex, cIndex);
                        }
                    });
                });
            });

            return hasChanges ? newTicket : ticket;
        }));
    }, [lastNumber, room?.settings.autoMarkNumbers, markNumber]);

    // Call kinh handler
    const handleCallKinh = useCallback(async (ticketId: string, gridIndex: number, rowIndex: number) => {
        const result = await callKinh(ticketId, gridIndex, rowIndex);
        setKinhResult(result);
        setTimeout(() => setKinhResult(null), 5000);
    }, [callKinh]);

    // Leave room handler
    const handleLeaveRoom = useCallback(() => {
        if (window.confirm('Bạn có chắc muốn thoát phòng? Vé hiện tại sẽ bị mất.')) {
            leaveRoom();
            setTickets([]); // Clear local tickets
        }
    }, [leaveRoom]);

    // Show join form if not in room
    if (!room) {
        return (
            <JoinRoom
                initialCode={initialCode}
                isConnected={isConnected}
                onJoin={handleJoin}
            />
        );
    }

    // Player game view
    return (
        <div className="min-h-screen p-4 pb-20">
            <Confetti active={showWinner && isMyWin} />

            {/* Header */}
            <header className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-lg font-bold text-gradient">Gánh Hát Lô Tô</h1>
                    <p className="text-xs text-[var(--text-muted)]">
                        Phòng: <span className="text-[var(--neon-gold)] font-mono">{room.code}</span>
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        className={`btn btn-sm ${showTracker ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setShowTracker(!showTracker)}
                    >
                        📋 Dò số
                    </button>
                    <button
                        className="btn btn-sm btn-danger ml-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/50"
                        onClick={handleLeaveRoom}
                    >
                        🚪 Thoát
                    </button>
                </div>
            </header>

            {/* Current Number Display */}
            <GlassCard className="text-center py-6 mb-4" hover={false}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={lastNumber ?? 'empty'}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                    >
                        <NeonNumber number={lastNumber} size="lg" />
                    </motion.div>
                </AnimatePresence>

                <div className="mt-4 flex justify-center gap-4 text-sm text-[var(--text-muted)]">
                    <span>Đã gọi: {calledNumbers.length}/89</span>
                    {room.status === 'waiting' && (
                        <span className="text-[var(--neon-cyan)]">Chờ bắt đầu...</span>
                    )}
                </div>

                {/* Audio Loading Progress */}
                {progress.total < 100 && (
                    <div className="mt-4 max-w-xs mx-auto">
                        <div className="loading-bar">
                            <div
                                className="loading-bar-fill"
                                style={{ width: `${progress.total}%` }}
                            />
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                            Đang tải âm thanh: {progress.total}%
                        </p>
                    </div>
                )}
            </GlassCard>

            {/* Number Tracker (Collapsible) */}
            <AnimatePresence>
                {showTracker && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4"
                    >
                        <NumberTracker calledNumbers={calledNumbers} lastNumber={lastNumber} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tickets Section */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[var(--text-secondary)]">
                        Vé của bạn ({tickets.length})
                    </h2>

                    {room.status === 'waiting' && (
                        <div className="bg-[var(--card-bg)] rounded-xl p-4 shadow-sm border border-[var(--primary)] mb-4 w-full">
                            <h3 className="text-sm font-bold text-center mb-3">Tạo vé tham gia</h3>

                            <div className="flex gap-2 mb-3">
                                <div className="join flex-1 grid grid-cols-2">
                                    <button
                                        className="join-item btn btn-sm btn-secondary"
                                        onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                                    >
                                        -
                                    </button>
                                    <button className="join-item btn btn-sm bg-base-200 no-animation pointer-events-none">
                                        {ticketCount} vé
                                    </button>
                                </div>
                                <button
                                    className="join-item btn btn-sm btn-secondary"
                                    onClick={() => setTicketCount(Math.min(5, ticketCount + 1))}
                                >
                                    +
                                </button>
                            </div>
                            <button
                                className="btn btn-primary w-full btn-sm"
                                onClick={handleCreateTickets}
                                disabled={ticketCount < 1}
                            >
                                + Tạo thêm vé
                            </button>
                        </div>
                    )}
                </div>

                {tickets.length === 0 ? (
                    <GlassCard className="text-center py-8">
                        <p className="text-[var(--text-muted)] mb-4">
                            {room.status === 'waiting'
                                ? 'Bạn chưa có vé nào. Tạo vé để chơi!'
                                : 'Trò chơi đã bắt đầu mà bạn chưa có vé.'}
                        </p>
                        {room.status === 'waiting' && (
                            <button
                                className="btn btn-primary"
                                onClick={handleCreateTickets}
                            >
                                🎟️ Tạo vé ngay
                            </button>
                        )}
                    </GlassCard>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {tickets.map((ticket) => (
                            <LotoTicket
                                key={ticket.id}
                                ticket={ticket}
                                calledNumbers={calledNumbers}
                                onMarkNumber={(grid, row, index) => handleMarkNumber(ticket.id, grid, row, index)}
                                onCallKinh={(grid, row) => handleCallKinh(ticket.id, grid, row)}
                                autoMark={room.settings?.autoMarkNumbers ?? true}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Kinh Result Toast */}
            <AnimatePresence>
                {kinhResult && (
                    <motion.div
                        className={`fixed bottom-4 left-4 right-4 p-4 rounded-lg z-40 ${kinhResult.isWinner
                            ? 'bg-green-500'
                            : 'bg-yellow-500'
                            }`}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                    >
                        <p className="text-center font-bold text-black">
                            {kinhResult.isWinner
                                ? '🎉 KINH! Bạn đã thắng!'
                                : `Chưa thắng - Đã trùng ${kinhResult.matchedNumbers.length}/5`}
                        </p>
                        {!kinhResult.isWinner && kinhResult.missingNumbers.length > 0 && (
                            <p className="text-center text-sm text-black/70 mt-1">
                                Còn thiếu: {kinhResult.missingNumbers.join(', ')}
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Winner Modal */}
            <AnimatePresence>
                {showWinner && (
                    <motion.div
                        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="text-center p-8"
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.5 }}
                        >
                            <p className="text-6xl mb-4">{isMyWin ? '🎉🎊🎉' : '👏'}</p>
                            <h2 className="text-4xl font-bold text-gradient mb-4">
                                {isMyWin ? 'BẠN THẮNG!' : 'KINH!'}
                            </h2>
                            <p className="text-2xl text-[var(--neon-gold)]">
                                {winnerName}
                            </p>
                            {!isMyWin && (
                                <p className="text-lg text-[var(--text-secondary)] mt-2">
                                    đã thắng ván này
                                </p>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function PlayPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-[var(--text-muted)]">Đang tải...</p>
            </div>
        }>
            <PlayerContent />
        </Suspense>
    );
}
