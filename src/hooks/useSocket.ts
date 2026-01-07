// Socket.io client hook for React components

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Room, LotoTicket, ValidationResult, Player, RoomSettings } from '@/lib/game-types';

interface UseSocketOptions {
    autoConnect?: boolean;
}

interface UseSocketReturn {
    socket: Socket | null;
    isConnected: boolean;
    room: Room | null;
    calledNumbers: number[];
    lastNumber: number | null;
    // Host actions
    createRoom: (nickname: string, settings?: Partial<RoomSettings>) => Promise<Room | null>;
    spinNumber: () => Promise<number | null>;
    resetGame: () => void;
    startGame: () => void;
    validateTicket: (ticketId: string) => Promise<ValidationResult>;
    validateNumbers: (numbers: number[]) => Promise<ValidationResult>;
    // Player actions
    joinRoom: (code: string, nickname: string) => Promise<Room | null>;
    leaveRoom: () => void;
    createTickets: (count: number) => Promise<LotoTicket[]>;
    markNumber: (ticketId: string, grid: number, row: number, index: number) => void;
    callKinh: (ticketId: string, grid: number, row: number) => Promise<ValidationResult>;
    // Events
    onNumberCalled: (handler: (data: { number: number; folkName: string; calledNumbers: number[] }) => void) => void;
    onWinner: (handler: (data: { winnerId: string; nickname: string; ticketId: string; row: number }) => void) => void;
    onKinhCalled: (handler: (data: { playerId: string; nickname: string; ticketId: string; row: number }) => void) => void;
    onPlayerJoined: (handler: (player: Player) => void) => void;
    onPlayerLeft: (handler: (playerId: string) => void) => void;
    onRoomClosed: (handler: () => void) => void;
    onAudioPlaySequence: (handler: (number: number) => void) => void;
    // New
    restoreSession: () => Promise<{ tickets: LotoTicket[] } | null>;
    clearSession: () => void;
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
    const { autoConnect = true } = options;

    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [room, setRoom] = useState<Room | null>(null);
    const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
    const [lastNumber, setLastNumber] = useState<number | null>(null);

    const handlersRef = useRef<{
        onNumberCalled?: (data: { number: number; folkName: string; calledNumbers: number[] }) => void;
        onWinner?: (data: { winnerId: string; nickname: string; ticketId: string; row: number }) => void;
        onKinhCalled?: (data: { playerId: string; nickname: string; ticketId: string; row: number }) => void;
        onPlayerJoined?: (player: Player) => void;
        onPlayerLeft?: (playerId: string) => void;
        onRoomClosed?: () => void;
        onAudioPlaySequence?: (number: number) => void;
    }>({});

    // Initialize socket connection
    useEffect(() => {
        if (!autoConnect) return;

        const newSocket = io({
            path: '/socket.io',
            transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => {
            console.log('🔌 Connected to server');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('❌ Disconnected from server');
            setIsConnected(false);
        });

        newSocket.on('room:updated', (updatedRoom: Room) => {
            setRoom(updatedRoom);
        });

        newSocket.on('game:number-called', (data) => {
            setCalledNumbers(data.calledNumbers);
            setLastNumber(data.number);
            handlersRef.current.onNumberCalled?.(data);
        });

        newSocket.on('game:winner', (data) => {
            handlersRef.current.onWinner?.(data);
        });

        newSocket.on('player:kinh-called', (data) => {
            handlersRef.current.onKinhCalled?.(data);
        });

        newSocket.on('player:joined', (player) => {
            handlersRef.current.onPlayerJoined?.(player);
        });

        newSocket.on('player:left', (playerId) => {
            handlersRef.current.onPlayerLeft?.(playerId);
        });

        newSocket.on('room:closed', () => {
            setRoom(null);
            setCalledNumbers([]);
            setLastNumber(null);
            handlersRef.current.onRoomClosed?.();
        });

        newSocket.on('audio:play-sequence', (number) => {
            handlersRef.current.onAudioPlaySequence?.(number);
        });

        newSocket.on('game:reset', () => {
            setCalledNumbers([]);
            setLastNumber(null);
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, [autoConnect]);

    // Save session helper
    const saveSession = useCallback((session: { roomCode: string; oderId: string; nickname: string; isHost: boolean }) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('loto_session', JSON.stringify(session));
        }
    }, []);

    const clearSession = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('loto_session');
        }
    }, []);

    // Session logic
    const restoreSession = useCallback(async (): Promise<{ tickets: LotoTicket[] } | null> => {
        if (typeof window === 'undefined' || !socket || !isConnected) return null;

        const stored = localStorage.getItem('loto_session');
        if (!stored) return null;

        try {
            const { roomCode, oderId } = JSON.parse(stored);

            return new Promise((resolve) => {
                socket.emit('room:rejoin', roomCode, oderId, (data: {
                    room: Room,
                    tickets: LotoTicket[],
                    calledNumbers: number[],
                    lastNumber: number | null
                } | null, error?: string) => {
                    if (error || !data) {
                        console.log('Rejoin failed:', error);
                        clearSession();
                        resolve(null);
                        return;
                    }

                    console.log('🔄 Rejoined session:', data.room.code);
                    setRoom(data.room);
                    // Manually restore local state from server data if needed in future
                    // But ticket components might need updating from server data
                    // For now, simpler implementation:
                    setLastNumber(data.lastNumber);

                    resolve({ tickets: data.tickets });
                });
            });
        } catch (e) {
            console.error('Session restore error', e);
            clearSession();
            return null;
        }
    }, [socket, isConnected, clearSession]);

    // Auto restore on connect
    useEffect(() => {
        if (isConnected && !room) {
            restoreSession();
        }
    }, [isConnected, room, restoreSession]);

    // Host: Create room
    const createRoom = useCallback((nickname: string, settings: Partial<RoomSettings> = {}): Promise<Room | null> => {
        return new Promise((resolve) => {
            if (!socket) {
                resolve(null);
                return;
            }
            socket.emit('room:create', nickname, settings, (newRoom: Room) => {
                setRoom(newRoom);
                // Save session for host
                // Host ID is the first player's ID
                const hostPlayer = newRoom.players.find(p => p.socketId === socket.id);
                if (hostPlayer) {
                    saveSession({
                        roomCode: newRoom.code,
                        oderId: hostPlayer.id,
                        nickname,
                        isHost: true
                    });
                }
                resolve(newRoom);
            });
        });
    }, [socket, saveSession]);

    // Player: Join room
    const joinRoom = useCallback((code: string, nickname: string): Promise<Room | null> => {
        return new Promise((resolve) => {
            if (!socket) {
                resolve(null);
                return;
            }
            socket.emit('room:join', code, nickname, (joinedRoom: Room | null, error?: string) => {
                if (error) {
                    console.error('Join error:', error);
                    resolve(null);
                    return;
                }
                if (joinedRoom) {
                    // Find my player ID
                    const myPlayer = joinedRoom.players.find(p => p.socketId === socket.id);
                    if (myPlayer) {
                        saveSession({
                            roomCode: joinedRoom.code,
                            oderId: myPlayer.id,
                            nickname,
                            isHost: false
                        });
                    }
                }

                setRoom(joinedRoom);
                if (joinedRoom?.currentSession) {
                    setCalledNumbers(joinedRoom.currentSession.calledNumbers.map(c => c.number));
                }
                resolve(joinedRoom);
            });
        });
    }, [socket, saveSession]);

    // Leave room
    const leaveRoom = useCallback(() => {
        socket?.emit('room:leave');
        setRoom(null);
        setCalledNumbers([]);
        setLastNumber(null);
        clearSession();
    }, [socket, clearSession]);

    // Host: Start game
    const startGame = useCallback(() => {
        socket?.emit('game:start');
    }, [socket]);

    // Host: Spin number
    const spinNumber = useCallback((): Promise<number | null> => {
        return new Promise((resolve) => {
            if (!socket) {
                resolve(null);
                return;
            }
            socket.emit('game:spin', (number: number | null, error?: string) => {
                if (error) {
                    console.error('Spin error:', error);
                    resolve(null);
                    return;
                }
                resolve(number);
            });
        });
    }, [socket]);

    // Host: Reset game
    const resetGame = useCallback(() => {
        socket?.emit('game:reset');
    }, [socket]);

    // Host: Validate ticket
    const validateTicket = useCallback((ticketId: string): Promise<ValidationResult> => {
        return new Promise((resolve) => {
            if (!socket) {
                resolve({ isValid: false, isWinner: false, matchedNumbers: [], missingNumbers: [] });
                return;
            }
            socket.emit('host:validate-ticket', ticketId, resolve);
        });
    }, [socket]);

    // Host: Validate numbers
    const validateNumbers = useCallback((numbers: number[]): Promise<ValidationResult> => {
        return new Promise((resolve) => {
            if (!socket) {
                resolve({ isValid: false, isWinner: false, matchedNumbers: [], missingNumbers: [] });
                return;
            }
            socket.emit('host:validate-numbers', numbers, resolve);
        });
    }, [socket]);

    // Player:    // Create tickets
    const createTickets = useCallback((count: number): Promise<LotoTicket[]> => {
        return new Promise((resolve) => {
            if (!socket) {
                resolve([]);
                return;
            }
            socket.emit('player:create-tickets', count, (tickets: LotoTicket[]) => {
                if (!tickets) {
                    resolve([]);
                    return;
                }
                resolve(tickets || []);
            });
        });
    }, [socket]);

    // Mark Number
    const markNumber = useCallback((ticketId: string, grid: number, row: number, index: number) => {
        if (!socket) return;
        socket.emit('player:mark-number', ticketId, grid, row, index);
    }, [socket]);

    // Call Kinh
    const callKinh = useCallback((ticketId: string, grid: number, row: number): Promise<ValidationResult> => {
        return new Promise((resolve) => {
            if (!socket) {
                resolve({ isValid: false, isWinner: false, matchedNumbers: [], missingNumbers: [] });
                return;
            }
            socket.emit('player:call-kinh', ticketId, grid, row, (result: ValidationResult) => {
                resolve(result);
            });
        });
    }, [socket]);

    // Event handlers
    const onNumberCalled = useCallback((handler: (data: { number: number; folkName: string; calledNumbers: number[] }) => void) => {
        handlersRef.current.onNumberCalled = handler;
    }, []);

    const onWinner = useCallback((handler: (data: { winnerId: string; nickname: string; ticketId: string; row: number }) => void) => {
        handlersRef.current.onWinner = handler;
    }, []);

    const onKinhCalled = useCallback((handler: (data: { playerId: string; nickname: string; ticketId: string; row: number }) => void) => {
        handlersRef.current.onKinhCalled = handler;
    }, []);

    const onPlayerJoined = useCallback((handler: (player: Player) => void) => {
        handlersRef.current.onPlayerJoined = handler;
    }, []);

    const onPlayerLeft = useCallback((handler: (playerId: string) => void) => {
        handlersRef.current.onPlayerLeft = handler;
    }, []);

    const onRoomClosed = useCallback((handler: () => void) => {
        handlersRef.current.onRoomClosed = handler;
    }, []);

    const onAudioPlaySequence = useCallback((handler: (number: number) => void) => {
        handlersRef.current.onAudioPlaySequence = handler;
    }, []);

    return {
        socket,
        isConnected,
        room,
        calledNumbers,
        lastNumber,
        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
        spinNumber,
        resetGame,
        validateTicket,
        validateNumbers,
        createTickets,
        markNumber,
        callKinh,
        onNumberCalled,
        onWinner,
        onKinhCalled,
        onPlayerJoined,
        onPlayerLeft,
        onRoomClosed,
        onAudioPlaySequence,
        restoreSession,
        clearSession,
    };
}

export default useSocket;
