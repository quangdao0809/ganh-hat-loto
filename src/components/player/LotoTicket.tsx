'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { LotoTicket as LotoTicketType } from '@/lib/game-types';

interface LotoTicketProps {
    ticket: LotoTicketType;
    calledNumbers: number[];
    onMarkNumber: (gridIndex: number, rowIndex: number, colIndex: number) => void;
    onCallKinh: (gridIndex: number, rowIndex: number) => void;
    autoMark?: boolean;
}

export function LotoTicket({
    ticket,
    calledNumbers,
    onMarkNumber,
    onCallKinh,
    autoMark = true,
}: LotoTicketProps) {
    // Check status for all grids and rows
    const gridsStatus = useMemo(() => {
        if (!ticket || !ticket.grids) return [];

        return ticket.grids.map(grid => {
            return grid.rows.map(row => {
                // Filter non-null cells
                const rowNumbers = row.cells.filter((n): n is number => n !== null);
                const matched = rowNumbers.filter(n => calledNumbers.includes(n)).length;
                return {
                    matched,
                    isPossibleWin: matched >= 4,
                    isWinner: matched === 5,
                    hasNumber: rowNumbers.length > 0 // Validity check
                };
            });
        });
    }, [ticket, calledNumbers]);

    if (!ticket || !ticket.grids) {
        return (
            <div className="ticket-container bg-red-500/10 rounded-xl p-4 shadow-lg border-2 border-red-500 relative text-center">
                <p className="text-red-500 font-bold">Vé không hợp lệ</p>
                <p className="text-xs text-[var(--text-muted)]">Vui lòng tạo vé mới hoặc thoát phòng.</p>
            </div>
        );
    }

    return (
        <div className="ticket-container bg-[var(--card-bg)] rounded-xl p-4 shadow-lg border-2 border-[var(--primary)] relative overflow-hidden">
            {/* Header */}
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold uppercase text-gradient" style={{ fontFamily: 'var(--font-display)' }}>
                    Gánh Hát Lô Tô
                </h2>
                <div className="text-xs font-mono text-[var(--text-muted)] mt-1">
                    MÃ VÉ: #{ticket.id.slice(-6).toUpperCase()}
                </div>
            </div>

            {/* Decorative background pattern (optional) */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[url('/pattern.png')] opacity-5 pointer-events-none" />

            {/* Grids */}
            <div className="space-y-6">
                {ticket.grids.map((grid, gridIndex) => (
                    <div key={gridIndex} className="game-grid relative">
                        {/* Grid Separator/Header */}
                        {gridIndex > 0 && (
                            <div className="border-t border-dashed border-[var(--border)] my-4 relative">
                                <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-[var(--card-bg)] px-2 text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                                    Bảng {gridIndex + 1}
                                </span>
                            </div>
                        )}

                        <div className="grid grid-cols-9 gap-[2px] bg-[var(--border)] p-[2px] rounded-lg">
                            {/* Rows */}
                            {grid.rows.map((row, rowIndex) => {
                                const status = gridsStatus[gridIndex][rowIndex];

                                return row.cells.map((num, colIndex) => {
                                    const isNumber = num !== null;
                                    const isCalled = isNumber && calledNumbers.includes(num);
                                    // Visual mark: Either manually marked OR (autoMark enabled AND number is called)
                                    // But since we implemented auto-marking in parent state, rely on row.marked
                                    const isMarked = isNumber && row.marked[colIndex];
                                    const isWinningRow = status.isWinner;

                                    if (!isNumber) {
                                        return (
                                            <div
                                                key={`${rowIndex}-${colIndex}`}
                                                className="aspect-[4/5] bg-[#3a202020] rounded-sm" // Placeholder styling text-transparent
                                            />
                                        );
                                    }

                                    return (
                                        <motion.button
                                            key={`${rowIndex}-${colIndex}`}
                                            className={`
                                                relative w-full aspect-[4/5] flex items-center justify-center text-sm md:text-base font-bold rounded-sm
                                                transition-colors duration-200
                                                ${isMarked
                                                    ? 'bg-yellow-400 text-black shadow-inner font-extrabold'
                                                    : 'bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--accent)]/10'}
                                                ${isWinningRow && isMarked ? 'ring-2 ring-yellow-400 animate-pulse' : ''}
                                            `}
                                            onClick={() => onMarkNumber(gridIndex, rowIndex, colIndex)}
                                            whileTap={{ scale: 0.9 }}
                                        >
                                            {num}
                                        </motion.button>
                                    );
                                });
                            })}
                        </div>

                        {/* Kinh Button for Row (Overlay or Side?) */}
                        {/* Standard Loto: Kinh is for the row. We have 3 rows per grid. */}
                        {/* We can show a small button next to the row? Or check if any row is winner. */}
                        {grid.rows.map((_, rowIndex) => {
                            const status = gridsStatus[gridIndex][rowIndex];
                            if (status.isWinner) {
                                return (
                                    <motion.div
                                        key={`kinh-${rowIndex}`}
                                        className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[1px] z-10 rounded-lg pointer-events-none"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        <div className="bg-gradient-to-r from-yellow-500 to-red-600 p-[2px] rounded-lg shadow-2xl pointer-events-auto transform scale-110">
                                            <div className="bg-black/80 px-4 py-2 rounded-md flex flex-col items-center">
                                                <span className="text-yellow-400 font-bold text-lg animate-pulse">KINH RỒI!</span>
                                                <button
                                                    className="mt-1 px-4 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-full animate-bounce"
                                                    onClick={() => onCallKinh(gridIndex, rowIndex)}
                                                >
                                                    HÔ KINH NGAY!
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            }
                            return null;
                        })}
                    </div>
                ))}
            </div>

            <div className="text-center mt-6">
                <p className="text-xs uppercase tracking-widest text-[var(--neon-gold)] font-bold">
                    Loại đặc biệt - Tấn tài tấn lộc
                </p>
            </div>
        </div>
    );
}

export default LotoTicket;
