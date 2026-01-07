'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    padding?: 'sm' | 'md' | 'lg';
}

const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
};

export function GlassCard({
    children,
    className = '',
    hover = true,
    padding = 'md'
}: GlassCardProps) {
    return (
        <motion.div
            className={`glass-card ${paddingClasses[padding]} ${className}`}
            whileHover={hover ? {
                y: -4,
                transition: { duration: 0.2 }
            } : undefined}
        >
            {children}
        </motion.div>
    );
}

export default GlassCard;
