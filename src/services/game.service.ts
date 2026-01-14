import { GameSession, IGameSession, Room, Ticket, Player } from '../models';
import redis from '../lib/redis';

export class GameService {
    private static SESSION_CACHE_PREFIX = 'session:';

    static async startGame(roomCode: string): Promise<IGameSession> {
        const sessionId = Math.random().toString(36).substring(2, 15);
        const session = new GameSession({
            sessionId,
            roomCode: roomCode.toUpperCase(),
            calledNumbers: [],
            startedAt: new Date(),
        });

        await Promise.all([
            session.save(),
            Room.findOneAndUpdate({ code: roomCode.toUpperCase() }, { status: 'playing' }),
            redis.del(`room:${roomCode.toUpperCase()}`)
        ]);

        await this.cacheSession(session);
        return session;
    }

    static async spinNumber(roomCode: string): Promise<{ number: number; session: IGameSession } | null> {
        const session = await GameSession.findOne({
            roomCode: roomCode.toUpperCase(),
            endedAt: { $exists: false }
        }).sort({ startedAt: -1 });

        if (!session) return null;

        const calledNums = session.calledNumbers.map(c => c.number);
        const available = [];
        // Game range is 1-89 as per previous conversation context
        for (let i = 1; i <= 89; i++) {
            if (!calledNums.includes(i)) available.push(i);
        }

        if (available.length === 0) return null;

        const number = available[Math.floor(Math.random() * available.length)];
        session.calledNumbers.push({ number, calledAt: new Date() });

        await session.save();
        await this.cacheSession(session);

        return { number, session };
    }

    static async getActiveSession(roomCode: string): Promise<IGameSession | null> {
        const cached = await redis.get(`${this.SESSION_CACHE_PREFIX}${roomCode.toUpperCase()}`);
        if (cached) return JSON.parse(cached);

        return GameSession.findOne({
            roomCode: roomCode.toUpperCase(),
            endedAt: { $exists: false }
        }).sort({ startedAt: -1 });
    }

    static async resetGame(roomCode: string): Promise<void> {
        // 1. End active session if any
        // Fetch directly from DB to ensure Mongoose document
        const session = await GameSession.findOne({
            roomCode: roomCode.toUpperCase(),
            endedAt: { $exists: false }
        }).sort({ startedAt: -1 });

        if (session) {
            session.endedAt = new Date();
            await session.save();
            await redis.del(`${this.SESSION_CACHE_PREFIX}${roomCode.toUpperCase()}`);
        }

        // 2. Set room to waiting
        await Room.findOneAndUpdate(
            { code: roomCode.toUpperCase() },
            { status: 'waiting' }
        );

        // 3. Clear room cache
        await redis.del(`room:${roomCode.toUpperCase()}`);
    }

    private static async cacheSession(session: IGameSession): Promise<void> {
        await redis.setex(`${this.SESSION_CACHE_PREFIX}${session.roomCode}`, 3600, JSON.stringify(session));
    }


    static async checkAutoWinner(roomCode: string, calledNumbers: number[]) {
        try {
            // Find all tickets in room
            const tickets = await Ticket.find({ roomCode: roomCode.toUpperCase() });

            for (const ticket of tickets) {
                // Check all grids/rows
                for (const grid of ticket.grids) {
                    for (let rowIndex = 0; rowIndex < grid.rows.length; rowIndex++) {
                        const row = grid.rows[rowIndex];
                        // Check if row is full
                        const ns = row.cells.filter((n): n is number => n !== null);
                        const isWinner = ns.every(n => calledNumbers.includes(n));

                        if (isWinner) {
                            // Fetch owner info
                            const player = await Player.findOne({ oderId: ticket.ownerId });

                            // Update session
                            await GameSession.findOneAndUpdate(
                                { roomCode: roomCode.toUpperCase(), endedAt: null },
                                {
                                    winner: {
                                        oderId: ticket.ownerId,
                                        nickname: player?.nickname || 'Unknown',
                                        ticketId: ticket.id,
                                        row: rowIndex
                                    },
                                    endedAt: new Date()
                                }
                            );

                            return {
                                winnerId: ticket.ownerId,
                                nickname: player?.nickname || 'Unknown',
                                ticketId: ticket.id,
                                row: rowIndex
                            };
                        }
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('Check auto winner error:', error);
            return null;
        }
    }
}
