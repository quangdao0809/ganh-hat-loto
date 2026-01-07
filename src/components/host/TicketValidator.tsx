'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ValidationResult } from '@/lib/game-types';

interface TicketValidatorProps {
    onValidateTicket: (ticketId: string) => Promise<ValidationResult>;
    onValidateNumbers: (numbers: number[]) => Promise<ValidationResult>;
}

export function TicketValidator({ onValidateTicket, onValidateNumbers }: TicketValidatorProps) {
    const [mode, setMode] = useState<'ticket' | 'manual'>('manual');
    const [ticketId, setTicketId] = useState('');
    const [manualNumbers, setManualNumbers] = useState<string[]>(['', '', '', '', '']);
    const [result, setResult] = useState<ValidationResult | null>(null);
    const [isValidating, setIsValidating] = useState(false);

    const handleValidateTicket = useCallback(async () => {
        if (!ticketId.trim()) return;

        setIsValidating(true);
        setResult(null);

        try {
            const res = await onValidateTicket(ticketId.trim());
            setResult(res);
        } finally {
            setIsValidating(false);
        }
    }, [ticketId, onValidateTicket]);

    const handleValidateNumbers = useCallback(async () => {
        const numbers = manualNumbers
            .map(n => parseInt(n, 10))
            .filter(n => !isNaN(n) && n >= 1 && n <= 89);

        if (numbers.length !== 5) {
            setResult({
                isValid: false,
                isWinner: false,
                matchedNumbers: [],
                missingNumbers: [],
            });
            return;
        }

        setIsValidating(true);
        setResult(null);

        try {
            const res = await onValidateNumbers(numbers);
            setResult(res);
        } finally {
            setIsValidating(false);
        }
    }, [manualNumbers, onValidateNumbers]);

    const handleNumberChange = (index: number, value: string) => {
        const newNumbers = [...manualNumbers];
        // Only allow numbers 1-89
        const num = value.replace(/\D/g, '').slice(0, 2);
        if (parseInt(num) > 89) return;
        newNumbers[index] = num;
        setManualNumbers(newNumbers);
    };

    const clearResult = () => {
        setResult(null);
        setTicketId('');
        setManualNumbers(['', '', '', '', '']);
    };

    return (
        <div className="glass-card p-4">
            <h3 className="text-lg font-semibold mb-4 text-center text-[var(--text-secondary)]">
                Kiểm Tra Vé
            </h3>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-4">
                <button
                    className={`btn btn-sm flex-1 ${mode === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setMode('manual'); clearResult(); }}
                >
                    Nhập số
                </button>
                <button
                    className={`btn btn-sm flex-1 ${mode === 'ticket' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setMode('ticket'); clearResult(); }}
                >
                    Mã vé
                </button>
            </div>

            {/* Manual Mode */}
            {mode === 'manual' && (
                <div>
                    <p className="text-sm text-[var(--text-muted)] mb-2">
                        Nhập 5 số trên hàng ngang (1-90):
                    </p>
                    <div className="flex gap-2 mb-4">
                        {manualNumbers.map((num, idx) => (
                            <input
                                key={idx}
                                type="text"
                                inputMode="numeric"
                                value={num}
                                onChange={(e) => handleNumberChange(idx, e.target.value)}
                                className="input text-center font-bold text-lg"
                                placeholder="--"
                                maxLength={2}
                            />
                        ))}
                    </div>
                    <button
                        className="btn btn-primary w-full"
                        onClick={handleValidateNumbers}
                        disabled={isValidating}
                    >
                        {isValidating ? 'Đang kiểm tra...' : 'Kiểm tra'}
                    </button>
                </div>
            )}

            {/* Ticket ID Mode */}
            {mode === 'ticket' && (
                <div>
                    <p className="text-sm text-[var(--text-muted)] mb-2">
                        Nhập mã vé:
                    </p>
                    <input
                        type="text"
                        value={ticketId}
                        onChange={(e) => setTicketId(e.target.value)}
                        className="input mb-4"
                        placeholder="Mã vé..."
                    />
                    <button
                        className="btn btn-primary w-full"
                        onClick={handleValidateTicket}
                        disabled={isValidating || !ticketId.trim()}
                    >
                        {isValidating ? 'Đang kiểm tra...' : 'Kiểm tra'}
                    </button>
                </div>
            )}

            {/* Result */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        className={`mt-4 p-4 rounded-lg ${result.isWinner
                            ? 'bg-green-500/20 border border-green-500'
                            : result.isValid
                                ? 'bg-yellow-500/20 border border-yellow-500'
                                : 'bg-red-500/20 border border-red-500'
                            }`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="text-center">
                            {result.isWinner ? (
                                <>
                                    <p className="text-2xl font-bold text-green-400">🎉 KINH!</p>
                                    <p className="text-sm text-green-300 mt-1">Vé hợp lệ - THẮNG!</p>
                                </>
                            ) : result.isValid ? (
                                <>
                                    <p className="text-xl font-bold text-yellow-400">Chưa thắng</p>
                                    <p className="text-sm text-yellow-300 mt-1">
                                        Đã trùng: {result.matchedNumbers.length}/5
                                    </p>
                                    {result.missingNumbers.length > 0 && (
                                        <p className="text-xs text-[var(--text-muted)] mt-1">
                                            Còn thiếu: {result.missingNumbers.join(', ')}
                                        </p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <p className="text-xl font-bold text-red-400">Không hợp lệ</p>
                                    <p className="text-sm text-red-300 mt-1">Vui lòng nhập đủ 5 số (1-90)</p>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default TicketValidator;
