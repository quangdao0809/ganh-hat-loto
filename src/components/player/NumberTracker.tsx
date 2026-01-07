'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface NumberTrackerProps {
    calledNumbers: number[];
    lastNumber: number | null;
}

export function NumberTracker({ calledNumbers, lastNumber }: NumberTrackerProps) {
    // Generate grid of 1-99
    const numbers = useMemo(() => {
        const nums = [];
        for (let i = 1; i <= 99; i++) {
            nums.push(i);
        }
        return nums;
    }, []);

    return (
        <div className="glass-card p-4">
            <h3 className="text-lg font-semibold mb-2 text-center text-[var(--text-secondary)]">
                Bảng Dò Số
            </h3>
            <p className="text-xs text-center text-[var(--text-muted)] mb-4">
                Dành cho người chơi vé giấy
            </p>

            {/* Stats */}
            <div className="flex justify-center gap-4 mb-4 text-sm">
                <div className="text-center">
                    <span className="text-[var(--neon-gold)] font-bold">{calledNumbers.length}</span>
                    <span className="text-[var(--text-muted)]"> đã gọi</span>
                </div>
                <div className="text-center">
                    <span className="text-[var(--text-muted)]">{99 - calledNumbers.length}</span>
                    <span className="text-[var(--text-muted)]"> còn lại</span>
                </div>
            </div>

            {/* Number Grid */}
            <div className="grid grid-cols-9 gap-1 sm:grid-cols-11 sm:gap-2">
                {numbers.map((num) => {
                    const isCalled = calledNumbers.includes(num);
                    const isCurrent = num === lastNumber;

                    return (
                        <motion.div
                            key={num}
                            className={`aspect-square flex items-center justify-center rounded text-xs sm:text-sm font-medium ${isCalled
                                    ? isCurrent
                                        ? 'bg-[var(--neon-red)] text-white'
                                        : 'bg-[var(--neon-gold)] text-black'
                                    : 'bg-[var(--surface)] text-[var(--text-muted)]'
                                }`}
                            animate={isCurrent ? {
                                scale: [1, 1.2, 1],
                            } : {}}
                            transition={{ duration: 0.3 }}
                        >
                            {num}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

export default NumberTracker;
