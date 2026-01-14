import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import { connectDB } from './src/lib/mongodb';
import { RoomService } from './src/services/room.service';
import { GameService } from './src/services/game.service';
import { TicketService } from './src/services/ticket.service';
import { CreateRoomSchema, JoinRoomSchema } from './src/lib/validation';
import { validateTicket, validateNumbers } from './src/lib/number-generator';
import { folkNames } from './src/lib/folk-names';
import redis from './src/lib/redis';
import { createAdapter } from '@socket.io/redis-adapter';
import dotenv from 'dotenv';

dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Auto-call intervals map
const autoCallIntervals = new Map<string, NodeJS.Timeout>();

function stopAutoCall(roomCode: string) {
    const interval = autoCallIntervals.get(roomCode);
    if (interval) {
        clearInterval(interval);
        autoCallIntervals.delete(roomCode);
    }
}

function startAutoCall(roomCode: string, speed: number, io: Server) {
    stopAutoCall(roomCode); // Clear existing

    // Initial delay before first spin? Or immediate?
    const interval = setInterval(async () => {
        try {
            const result = await GameService.spinNumber(roomCode);
            if (result) {
                const { number, session } = result;
                // Need to fetch room again or pass settings? cache is okay.
                // Optim: Pass room settings to helper or fetch.
                const room = await RoomService.getRoom(roomCode);

                // Get folk name
                let folkName = folkNames[number] || `Số ${number}`;
                if (room?.settings.audioMode === 'calling') {
                    folkName = `Số ${number}`;
                }

                io.to(roomCode).emit('game:number-called', {
                    number,
                    folkName,
                    calledNumbers: session.calledNumbers.map(c => c.number),
                    timestamp: Date.now(),
                });

                io.to(roomCode).emit('audio:play-sequence', number);

                // Auto Check Mode
                if (room?.settings.checkMode === 'auto') {
                    const winner = await GameService.checkAutoWinner(roomCode, session.calledNumbers.map(c => c.number));
                    if (winner) {
                        io.to(roomCode).emit('game:winner', winner);
                        stopAutoCall(roomCode);
                    }
                }
            } else {
                // No more numbers or error
                stopAutoCall(roomCode);
            }
        } catch (e) {
            console.error(`Auto call error room ${roomCode}:`, e);
            stopAutoCall(roomCode);
        }
    }, speed * 1000);

    autoCallIntervals.set(roomCode, interval);
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
    try {
        await connectDB();
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1);
    }

    const httpServer = createServer((req, res) => {
        // Apply basic security headers in dev/prod
        // Note: For Next.js, some headers are managed by Next.js itself
        const parsedUrl = parse(req.url!, true);
        handle(req, res, parsedUrl);
    });

    const io = new Server(httpServer, {
        path: '/socket.io',
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST'],
        },
    });

    // Redis adapter for scalability
    const pubClient = redis.duplicate();
    const subClient = redis.duplicate();
    io.adapter(createAdapter(pubClient, subClient));

    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        // Create Room
        socket.on('room:create', async (hostNickname, settings, callback) => {
            console.log(`📩 room:create request from ${hostNickname}`, settings);
            try {
                const validated = CreateRoomSchema.parse({ hostNickname, settings });
                const { room, player } = await RoomService.createRoom(
                    validated.hostNickname,
                    validated.settings as any
                );

                socket.join(room.code);
                socket.data = { oderId: player.oderId, roomCode: room.code, isHost: true, nickname: hostNickname };

                console.log(`🏠 Room created: ${room.code} by ${hostNickname}`);
                callback(room);
            } catch (err: any) {
                console.error('Room create error:', err);
                socket.emit('error', err.message || 'Lỗi khi tạo phòng');
            }
        });

        // Join Room
        socket.on('room:join', async (code, nickname, callback) => {
            try {
                const validated = JoinRoomSchema.parse({ code, nickname });
                const { room, player } = await RoomService.joinRoom(validated.code, validated.nickname);

                socket.join(room.code);
                socket.data = { oderId: player.oderId, roomCode: room.code, isHost: false, nickname };

                io.to(room.code).emit('player:joined', player);
                io.to(room.code).emit('room:updated', room);

                console.log(`👋 ${nickname} joined room ${room.code}`);
                callback(room);
            } catch (err: any) {
                callback(null, err.message || 'Không thể tham gia phòng');
            }
        });

        // Rejoin Room (Restore Session)
        socket.on('room:rejoin', async (code, oderId, callback) => {
            try {
                // Find ongoing room
                const room = await RoomService.getRoom(code);
                if (!room) {
                    callback(null, 'Phòng không tồn tại hoặc đã kết thúc');
                    return;
                }

                // Check player existence (host or normal player)
                // Host logic: hostSocketId usually not persistent in simple session, but odeId is key.
                const player = room.players.find(p => p.oderId === oderId);
                const isHost = room.hostId === oderId; // Assuming hostId == player.oderId logic or similar

                if (!player && !isHost) {
                    callback(null, 'Không tìm thấy người chơi trong phòng');
                    return;
                }

                socket.join(room.code);
                socket.data = { oderId, roomCode: room.code, isHost, nickname: player?.nickname || 'Host' };

                // Fetch current state
                const session = await GameService.getActiveSession(code);
                const tickets = await TicketService.getTickets(code, oderId);

                // If it is regular player update connection status? 
                // Currently player list is array of data, not live objects.
                // Re-emit player list update might be needed if sound/socket changes.

                callback({
                    room,
                    tickets,
                    calledNumbers: session ? session.calledNumbers.map(c => c.number) : [],
                    lastNumber: session?.calledNumbers.length ? session.calledNumbers[session.calledNumbers.length - 1].number : null
                });

                console.log(`🔄 ${socket.data.nickname} rejoined room ${code}`);

            } catch (err: any) {
                console.error('Rejoin error:', err);
                callback(null, 'Lỗi khi khôi phục session');
            }
        });

        // Start Game
        socket.on('game:start', async () => {
            const { roomCode, isHost } = socket.data;
            if (!isHost || !roomCode) return;

            try {
                const session = await GameService.startGame(roomCode);
                const room = await RoomService.getRoom(roomCode);

                io.to(roomCode).emit('game:started');
                if (room) io.to(roomCode).emit('room:updated', room);

                // Start Auto Call if enabled
                if (room && room.settings.autoCall) {
                    startAutoCall(roomCode, room.settings.callSpeed, io);
                }

                console.log(`🎮 Game started in room ${roomCode}`);
            } catch (err) {
                console.error('Game start error:', err);
            }
        });

        // Spin Number
        socket.on('game:spin', async (callback) => {
            const { roomCode, isHost } = socket.data;
            if (!isHost || !roomCode) {
                callback?.(null, 'Chỉ chủ phòng mới được quay số');
                return;
            }

            try {
                const result = await GameService.spinNumber(roomCode);
                if (!result) {
                    callback?.(null, 'Đã hết số hoặc trò chơi chưa bắt đầu');
                    return;
                }

                const { number, session } = result;
                const folkName = (folkNames as any)[number] || `Số ${number}`;

                io.to(roomCode).emit('game:number-called', {
                    number,
                    folkName,
                    calledNumbers: session.calledNumbers.map(c => c.number),
                    timestamp: Date.now(),
                });

                io.to(roomCode).emit('audio:play-sequence', number);
                console.log(`🎯 Number called in ${roomCode}: ${number} - ${folkName}`);

                // Auto Check Mode
                const room = await RoomService.getRoom(roomCode);
                if (room?.settings.checkMode === 'auto') {
                    const winner = await GameService.checkAutoWinner(roomCode, session.calledNumbers.map(c => c.number));
                    if (winner) {
                        io.to(roomCode).emit('game:winner', winner);
                        stopAutoCall(roomCode);
                    }
                }

                callback?.(number);
            } catch (err) {
                console.error('Spin error:', err);
                callback?.(null, 'Lỗi khi quay số');
            }
        });

        // Reset Game
        socket.on('game:reset', async () => {
            const { roomCode, isHost } = socket.data;
            if (!isHost || !roomCode) return;

            try {
                await GameService.resetGame(roomCode);
                stopAutoCall(roomCode); // Stop if running
                const room = await RoomService.getRoom(roomCode);

                io.to(roomCode).emit('game:reset');
                if (room) io.to(roomCode).emit('room:updated', room);

                console.log(`🔄 Game reset in room ${roomCode}`);
            } catch (err) {
                console.error('Game reset error:', err);
            }
        });

        // Create Tickets
        socket.on('player:create-tickets', async (count, callback) => {
            const { roomCode, oderId } = socket.data;
            if (!roomCode || !oderId) return;

            try {
                const room = await RoomService.getRoom(roomCode);
                if (!room) return;

                const tickets = await TicketService.createTickets(
                    roomCode,
                    oderId,
                    count,
                    room.settings.ticketsPerPlayer
                );
                callback(tickets);
            } catch (err) {
                console.error('Ticket creation error:', err);
            }
        });

        // Mark Number
        socket.on('player:mark-number', async (ticketId, grid, row, col) => {
            await TicketService.markNumber(ticketId, grid, row, col);
        });

        // Call Kinh (Bingo)
        socket.on('player:call-kinh', async (ticketId, grid, row, callback) => {
            const { roomCode, oderId, nickname } = socket.data;
            if (!roomCode || !oderId) return;

            try {
                const session = await GameService.getActiveSession(roomCode);
                const ticket = await TicketService.getTicketById(ticketId);

                if (!session || !ticket) return;

                // Stop auto-call immediately when someone calls Kinh
                stopAutoCall(roomCode);

                const calledNums = session.calledNumbers.map(c => c.number);
                const result = validateTicket(ticket as any, calledNums, grid, row);

                io.to(roomCode).emit('player:kinh-called', {
                    playerId: oderId,
                    nickname,
                    ticketId,
                    grid,
                    row
                });

                if (result.isWinner) {
                    io.to(roomCode).emit('game:winner', {
                        winnerId: oderId,
                        nickname,
                        ticketId,
                        grid,
                        row
                    });
                }

                callback(result);
            } catch (err) {
                console.error('Check winner error:', err);
            }
        });

        socket.on('disconnect', () => {
            console.log(`❌ Client disconnected: ${socket.id}`);
        });
    });

    httpServer.listen(port, () => {
        console.log(`🚀 Server running at http://${hostname}:${port}`);
    });
});
