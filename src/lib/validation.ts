import { z } from 'zod';
import { RoomSettings } from '../lib/game-types';

export const RoomSettingsSchema = z.object({
    maxPlayers: z.number().min(2).max(100).default(50),
    ticketsPerPlayer: z.number().min(1).max(10).default(2),
    maxTicketsPerPlayer: z.number().min(1).max(20).default(4),
    autoCall: z.boolean().default(false),
    callSpeed: z.number().min(5).max(60).default(5),
    checkMode: z.enum(['manual', 'auto']).default('manual'),
    autoMarkNumbers: z.boolean().default(true),
    audioMode: z.enum(['singing', 'calling']).default('singing'),
});

export type ValidatedRoomSettings = z.infer<typeof RoomSettingsSchema>;

export const CreateRoomSchema = z.object({
    hostNickname: z.string().min(1).max(20),
    settings: RoomSettingsSchema.default({
        maxPlayers: 50,
        ticketsPerPlayer: 2,
        maxTicketsPerPlayer: 4,
        autoCall: false,
        callSpeed: 4,
        checkMode: 'manual',
        autoMarkNumbers: true,
        audioMode: 'singing'
    }),
});

export const JoinRoomSchema = z.object({
    code: z.string().length(6),
    nickname: z.string().min(1).max(20),
});

export const SpinNumberSchema = z.object({
    roomCode: z.string().length(6),
});
