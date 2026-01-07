// Socket.io event types and utilities

import type { Room, Player, LotoTicket, ValidationResult } from './game-types';

// Server to Client Events
export interface ServerToClientEvents {
    // Room events
    'room:updated': (room: Room) => void;
    'room:closed': () => void;

    // Game events
    'game:started': () => void;
    'game:number-called': (data: {
        number: number;
        folkName: string;
        calledNumbers: number[];
        timestamp: number;
    }) => void;
    'game:winner': (data: {
        winnerId: string;
        nickname: string;
        ticketId: string;
        row: number;
    }) => void;
    'game:reset': () => void;

    // Player events
    'player:joined': (player: Player) => void;
    'player:left': (playerId: string) => void;
    'player:kinh-called': (data: {
        playerId: string;
        nickname: string;
        ticketId: string;
        row: number;
    }) => void;
    'player:tickets-updated': (tickets: LotoTicket[]) => void;

    // Audio sync events
    'audio:play-sequence': (number: number) => void;
    'audio:stop': () => void;

    // Error
    'error': (message: string) => void;
}

// Client to Server Events
export interface ClientToServerEvents {
    // Room management
    'room:create': (
        hostNickname: string,
        callback: (room: Room | null, error?: string) => void
    ) => void;
    'room:join': (
        code: string,
        nickname: string,
        callback: (room: Room | null, error?: string) => void
    ) => void;
    'room:leave': () => void;

    // Host actions
    'game:start': () => void;
    'game:spin': (callback?: (number: number | null, error?: string) => void) => void;
    'game:reset': () => void;
    'host:validate-ticket': (
        ticketId: string,
        callback: (result: ValidationResult) => void
    ) => void;
    'host:validate-numbers': (
        numbers: number[],
        callback: (result: ValidationResult) => void
    ) => void;
    'host:approve-winner': (
        playerId: string,
        ticketId: string,
        row: number
    ) => void;

    // Player actions
    'player:create-tickets': (
        count: number,
        callback: (tickets: LotoTicket[] | null, error?: string) => void
    ) => void;
    'player:mark-number': (
        ticketId: string,
        row: number,
        index: number
    ) => void;
    'player:call-kinh': (
        ticketId: string,
        row: number,
        callback: (result: ValidationResult) => void
    ) => void;
}

// Inter-server events (for internal use)
export interface InterServerEvents {
    ping: () => void;
}

// Socket data attached to each socket
export interface SocketData {
    oderId: string;
    nickname: string;
    roomCode: string;
    isHost: boolean;
}
