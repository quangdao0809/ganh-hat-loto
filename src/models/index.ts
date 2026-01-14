// MongoDB Models for Lô Tô Virtual Show

import mongoose, { Schema, Document, Model } from 'mongoose';

// Room Model
export interface IRoom extends Document {
    code: string;
    hostId: string;
    hostSocketId?: string;
    status: 'waiting' | 'playing' | 'finished';
    settings: {
        maxPlayers: number;
        ticketsPerPlayer: number;
        autoMarkNumbers: boolean;
        audioMode: 'singing' | 'calling';
    };
    players: IPlayer[];
    createdAt: Date;
    updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
    {
        code: { type: String, required: true, unique: true, index: true },
        hostId: { type: String, required: true },
        hostSocketId: { type: String },
        status: {
            type: String,
            enum: ['waiting', 'playing', 'finished'],
            default: 'waiting',
        },
        settings: {
            maxPlayers: { type: Number, default: 50 },
            ticketsPerPlayer: { type: Number, default: 2 },
            maxTicketsPerPlayer: { type: Number, default: 4 },
            autoCall: { type: Boolean, default: false },
            callSpeed: { type: Number, default: 5 },
            checkMode: { type: String, enum: ['manual', 'auto'], default: 'manual' },
            autoMarkNumbers: { type: Boolean, default: true },
            audioMode: { type: String, enum: ['singing', 'calling'], default: 'singing' },
        },
        players: { type: [Schema.Types.Mixed], default: [] },
    },
    { timestamps: true }
);

// Player Model (embedded in room or separate for scalability)
export interface IPlayer extends Document {
    oderId: string;
    nickname: string;
    socketId?: string;
    roomCode: string;
    isHost: boolean;
    joinedAt: Date;
}

const playerSchema = new Schema<IPlayer>({
    oderId: { type: String, required: true },
    nickname: { type: String, required: true },
    socketId: { type: String },
    roomCode: { type: String, required: true, index: true },
    isHost: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
});

// Ticket Model
export interface ITicketGrid {
    rows: {
        cells: (number | null)[];
        marked: boolean[];
    }[];
}

export interface ITicket extends Document {
    id: string;
    roomCode: string;
    ownerId: string;
    grids: ITicketGrid[];
    createdAt: Date;
}

const ticketGridSchema = new Schema<ITicketGrid>({
    rows: [
        {
            cells: { type: [Number], default: [null, null, null, null, null, null, null, null, null] },
            marked: { type: [Boolean], default: [false, false, false, false, false, false, false, false, false] },
        }
    ]
}, { _id: false });

const ticketSchema = new Schema<ITicket>({
    id: { type: String, required: true, unique: true },
    roomCode: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    grids: [ticketGridSchema],
    createdAt: { type: Date, default: Date.now },
});

// Game Session Model
export interface IGameSession extends Document {
    sessionId: string;
    roomCode: string;
    calledNumbers: {
        number: number;
        calledAt: Date;
    }[];
    startedAt: Date;
    endedAt?: Date;
    winner?: {
        oderId: string;
        nickname: string;
        ticketId: string;
        row: number;
    };
}

const gameSessionSchema = new Schema<IGameSession>({
    sessionId: { type: String, required: true, unique: true },
    roomCode: { type: String, required: true, index: true },
    calledNumbers: [
        {
            number: { type: Number, required: true },
            calledAt: { type: Date, default: Date.now },
        },
    ],
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    winner: {
        oderId: { type: String },
        nickname: { type: String },
        ticketId: { type: String },
        row: { type: Number },
    },
});

// Create models (handle hot reloading in development)
export const Room: Model<IRoom> =
    mongoose.models.Room || mongoose.model<IRoom>('Room', roomSchema);

export const Player: Model<IPlayer> =
    mongoose.models.Player || mongoose.model<IPlayer>('Player', playerSchema);

export const Ticket: Model<ITicket> =
    mongoose.models.Ticket || mongoose.model<ITicket>('Ticket', ticketSchema);

export const GameSession: Model<IGameSession> =
    mongoose.models.GameSession ||
    mongoose.model<IGameSession>('GameSession', gameSessionSchema);

export default { Room, Player, Ticket, GameSession };
