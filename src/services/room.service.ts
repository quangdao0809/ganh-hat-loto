import { Room, Player, IRoom, IPlayer } from '../models';
import redis from '../lib/redis';
import { ValidatedRoomSettings } from '../lib/validation';

export class RoomService {
    private static ROOM_CACHE_PREFIX = 'room:';

    static async createRoom(hostNickname: string, settings: ValidatedRoomSettings): Promise<{ room: IRoom; player: IPlayer }> {
        const code = this.generateRoomCode();
        const oderId = this.generateId();

        const room = new Room({
            code,
            hostId: oderId,
            status: 'waiting',
            settings,
            players: [{
                oderId,
                nickname: hostNickname,
                roomCode: code,
                isHost: true,
                joinedAt: new Date()
            }]
        });

        const player = new Player({
            oderId,
            nickname: hostNickname,
            roomCode: code,
            isHost: true,
        });

        try {
            await Promise.all([room.save(), player.save()]);
            await this.cacheRoom(room);
            return { room, player };
        } catch (error) {
            console.error('❌ Error saving room or player:', error);
            throw error;
        }
    }

    static async getRoom(code: string): Promise<IRoom | null> {
        const cached = await redis.get(`${this.ROOM_CACHE_PREFIX}${code.toUpperCase()}`);
        if (cached) {
            const room = JSON.parse(cached);
            if (!room.players) room.players = [];
            return room;
        }

        const room = await Room.findOne({ code: code.toUpperCase() });
        if (room) {
            await this.cacheRoom(room);
        }
        return room;
    }

    static async joinRoom(code: string, nickname: string): Promise<{ room: IRoom; player: IPlayer }> {
        // Fetch directly from DB to ensure we get a Mongoose document (not just a cached POJO)
        const room = await Room.findOne({ code: code.toUpperCase() });
        if (!room) throw new Error('Room not found');

        const playerCount = await Player.countDocuments({ roomCode: code.toUpperCase() });
        if (playerCount >= room.settings.maxPlayers) throw new Error('Room is full');

        const oderId = this.generateId();
        const player = new Player({
            oderId,
            nickname,
            roomCode: code.toUpperCase(),
            isHost: false,
        });

        await player.save();

        // Update room players array
        room.players.push(player.toObject());
        await room.save();
        await this.cacheRoom(room);

        return { room, player };
    }

    static async getRoomPlayers(code: string): Promise<IPlayer[]> {
        return Player.find({ roomCode: code.toUpperCase() });
    }

    private static async cacheRoom(room: IRoom): Promise<void> {
        // Use toObject() to get a plain JS object, and remove Mongoose internals
        const roomObj = room.toObject ? room.toObject() : room;
        await redis.setex(`${this.ROOM_CACHE_PREFIX}${room.code}`, 3600, JSON.stringify(roomObj));
    }

    private static generateRoomCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    private static generateId(): string {
        return Math.random().toString(36).substring(2, 15);
    }
}
