'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiPiece {
    id: number;
    x: number;
    y: number;
    rotation: number;
    scale: number;
    color: string;
    delay: number;
}

interface ConfettiProps {
    active: boolean;
    duration?: number;
    pieceCount?: number;
}

const colors = [
    '#ff2d55', // neon-red
    '#ffd60a', // neon-gold
    '#00d4aa', // neon-cyan
    '#bf5af2', // neon-purple
    '#ff9500', // orange
    '#30d158', // green
];

export function Confetti({
    active,
    duration = 5000,
    pieceCount = 100
}: ConfettiProps) {
    const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
    const [isVisible, setIsVisible] = useState(false);

    const generatePieces = useCallback(() => {
        const newPieces: ConfettiPiece[] = [];
        for (let i = 0; i < pieceCount; i++) {
            newPieces.push({
                id: i,
                x: Math.random() * 100,
                y: -20 - Math.random() * 20,
                rotation: Math.random() * 360,
                scale: 0.5 + Math.random() * 0.5,
                color: colors[Math.floor(Math.random() * colors.length)],
                delay: Math.random() * 0.5,
            });
        }
        return newPieces;
    }, [pieceCount]);

    useEffect(() => {
        if (active) {
            setPieces(generatePieces());
            setIsVisible(true);

            const timer = setTimeout(() => {
                setIsVisible(false);
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [active, duration, generatePieces]);

    if (!isVisible) return null;

    return (
        <div className="celebration">
            <AnimatePresence>
                {pieces.map((piece) => (
                    <motion.div
                        key={piece.id}
                        className="absolute w-3 h-3"
                        style={{
                            left: `${piece.x}%`,
                            backgroundColor: piece.color,
                            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                        }}
                        initial={{
                            y: `${piece.y}vh`,
                            rotate: 0,
                            scale: piece.scale,
                            opacity: 1,
                        }}
                        animate={{
                            y: '120vh',
                            rotate: piece.rotation + 720,
                            x: [0, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 200],
                        }}
                        transition={{
                            duration: 3 + Math.random() * 2,
                            delay: piece.delay,
                            ease: 'easeIn',
                        }}
                        exit={{ opacity: 0 }}
                    />
                ))}
            </AnimatePresence>

            {/* Winner text */}
            <motion.div
                className="fixed inset-0 flex items-center justify-center pointer-events-none"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="text-6xl font-bold text-center"
                    animate={{
                        scale: [1, 1.1, 1],
                        rotate: [-2, 2, -2],
                    }}
                    transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        repeatType: 'reverse',
                    }}
                >
                    <span className="text-gradient">🎉 KINH! 🎉</span>
                </motion.div>
            </motion.div>
        </div>
    );
}

export default Confetti;
