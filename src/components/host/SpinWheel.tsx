'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface SpinWheelProps {
    onSpin: () => Promise<number | null>;
    disabled?: boolean;
    isSpinning?: boolean;
}

export function SpinWheel({ onSpin, disabled = false, isSpinning = false }: SpinWheelProps) {
    const [spinning, setSpinning] = useState(false);

    const handleSpin = useCallback(async () => {
        if (disabled || spinning) return;

        setSpinning(true);
        await onSpin();

        // Keep spinning animation for a bit after result
        setTimeout(() => {
            setSpinning(false);
        }, 500);
    }, [disabled, spinning, onSpin]);

    const isActive = spinning || isSpinning;

    return (
        <div className="flex flex-col items-center gap-6">
            <motion.button
                className={`btn-spin relative ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handleSpin}
                disabled={disabled || isActive}
                animate={isActive ? { rotate: 360 } : { rotate: 0 }}
                transition={isActive ? {
                    duration: 0.5,
                    repeat: Infinity,
                    ease: 'linear',
                } : {
                    duration: 0.3,
                }}
                whileTap={!disabled && !isActive ? { scale: 0.95 } : undefined}
            >
                <span className="relative z-10 flex flex-col items-center justify-center w-full h-full p-2">
                    <AnimatePresence mode="wait">
                        {isActive ? (
                            <motion.div
                                key="cage"
                                initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                                animate={{ opacity: 1, scale: 1.2, rotate: 0 }}
                                exit={{ opacity: 0, scale: 0.5, rotate: 180 }}
                                className="relative w-full h-full"
                            >
                                <Image
                                    src="/audio/loto-cage.png"
                                    alt="Lồng cầu"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="text"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="flex flex-col items-center"
                            >
                                <span className="text-3xl mb-1">🎱</span>
                                <span>QUAY SỐ</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </span>
            </motion.button>

            <AnimatePresence>
                {isActive && (
                    <motion.p
                        className="text-[var(--text-secondary)] text-sm"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        Lồng cầu đang quay...
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}

export default SpinWheel;
