'use client';

import { motion } from 'framer-motion';
import { getFolkName } from '@/lib/folk-names';

interface NeonNumberProps {
    number: number | null;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showFolkName?: boolean;
    animate?: boolean;
}

const sizeClasses = {
    sm: 'text-4xl',
    md: 'text-6xl',
    lg: 'text-8xl',
    xl: 'text-[10rem]',
};

export function NeonNumber({
    number,
    size = 'lg',
    showFolkName = true,
    animate = true
}: NeonNumberProps) {
    if (number === null) {
        return (
            <div className="text-center">
                <div className={`neon-number ${sizeClasses[size]} opacity-30`}>
                    --
                </div>
                {showFolkName && (
                    <p className="text-xl text-[var(--text-muted)] mt-4">
                        Chưa có số nào
                    </p>
                )}
            </div>
        );
    }

    const paddedNumber = number.toString().padStart(2, '0');
    const folkName = getFolkName(number);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const item = {
        hidden: { opacity: 0, y: 50, scale: 0.5 },
        show: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                type: 'spring',
                stiffness: 200,
                damping: 15,
            },
        },
    };

    if (!animate) {
        return (
            <div className="text-center">
                <div className={`neon-number ${sizeClasses[size]}`}>
                    {paddedNumber}
                </div>
                {showFolkName && (
                    <p className="text-2xl text-[var(--neon-gold)] mt-4 font-medium">
                        {folkName}
                    </p>
                )}
            </div>
        );
    }

    return (
        <motion.div
            className="text-center"
            variants={container}
            initial="hidden"
            animate="show"
            key={number}
        >
            <motion.div
                className={`neon-number ${sizeClasses[size]} flex justify-center`}
                variants={item}
            >
                {paddedNumber.split('').map((digit, i) => (
                    <motion.span
                        key={i}
                        variants={item}
                        className="inline-block"
                    >
                        {digit}
                    </motion.span>
                ))}
            </motion.div>

            {showFolkName && (
                <motion.p
                    className="text-2xl text-[var(--neon-gold)] mt-4 font-medium"
                    variants={item}
                >
                    {folkName}
                </motion.p>
            )}
        </motion.div>
    );
}

export default NeonNumber;
