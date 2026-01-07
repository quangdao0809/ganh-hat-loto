'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface MasterBoardProps {
    calledNumbers: number[];
    lastNumber: number | null;
}

export function MasterBoard({ calledNumbers, lastNumber }: MasterBoardProps) {
    // Generate grid of 01-89
    const numbers = useMemo(() => {
        const nums = [];
        for (let i = 1; i <= 89; i++) {
            nums.push(i);
        }
        return nums;
    }, []);

    return (
        <div className="glass-card p-4">
            <h3 className="text-lg font-semibold mb-4 text-center text-[var(--text-secondary)]">
                Bảng Số ({calledNumbers.length}/89)
            </h3>

            <div className="number-grid">
                {numbers.map((num) => {
                    const isCalled = calledNumbers.includes(num);
                    const isCurrent = num === lastNumber;

                    return (
                        <motion.div
                            key={num}
                            className={`number-cell ${isCalled ? 'called' : ''} ${isCurrent ? 'current' : ''}`}
                            initial={isCurrent ? { scale: 0 } : false}
                            animate={isCurrent ? { scale: 1 } : {}}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        >
                            {num.toString().padStart(2, '0')}
                        </motion.div>
                    );
                })}
            </div>

            {/* Called numbers timeline */}
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <p className="text-sm text-[var(--text-muted)] mb-2">Thứ tự gọi:</p>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {calledNumbers.map((num, idx) => (
                        <span
                            key={idx}
                            className={`text-xs px-2 py-1 rounded ${num === lastNumber
                                ? 'bg-[var(--neon-red)] text-white'
                                : 'bg-[var(--surface)] text-[var(--text-secondary)]'
                                }`}
                        >
                            {num.toString().padStart(2, '0')}
                        </span>
                    ))}
                    {calledNumbers.length === 0 && (
                        <span className="text-xs text-[var(--text-muted)]">Chưa có số nào</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MasterBoard;
