// Custom Next.js server with Socket.io integration
// Run with: node server.js

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Validation Logic
function validateNumbers(numbers, calledNumbers) {
    const matched = numbers.filter(n => calledNumbers.includes(n));
    const missing = numbers.filter(n => !calledNumbers.includes(n));

    return {
        isValid: true,
        isWinner: matched.length === 5 && numbers.length === 5,
        matchedNumbers: matched,
        missingNumbers: missing,
    };
}

function validateTicket(ticket, calledNumbers) {
    if (!ticket || !ticket.grids) return { isValid: false, isWinner: false, matchedNumbers: [], missingNumbers: [] };

    for (const grid of ticket.grids) {
        for (const row of grid.rows) {
            const nums = row.cells.filter(n => n !== null);
            const res = validateNumbers(nums, calledNumbers);
            if (res.isWinner) return res;
        }
    }
    return {
        isValid: true,
        isWinner: false,
        matchedNumbers: [],
        missingNumbers: []
    };
}

// In-memory game state (will be replaced with MongoDB for persistence)
const rooms = new Map();
const players = new Map();
const sessions = new Map();
const tickets = new Map();

// Helper functions
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function generateId() {
    return Math.random().toString(36).substring(2, 15);
}

// Helper to generate a single grid
function generateGrid() {
    // 1. Determine counts per column (sum = 15, min 1, max 3)
    const colCounts = new Array(9).fill(1); // Start with 1 per col
    let remaining = 6;
    while (remaining > 0) {
        const c = Math.floor(Math.random() * 9);
        if (colCounts[c] < 3) {
            colCounts[c]++;
            remaining--;
        }
    }

    // 2. Generate numbers
    const gridNumbers = [];
    const ranges = [[1, 9], [10, 19], [20, 29], [30, 39], [40, 49], [50, 59], [60, 69], [70, 79], [80, 90]];

    for (let c = 0; c < 9; c++) {
        const count = colCounts[c];
        const [min, max] = ranges[c];
        const nums = [];
        while (nums.length < count) {
            const n = Math.floor(Math.random() * (max - min + 1)) + min;
            if (!nums.includes(n)) nums.push(n);
        }
        nums.sort((a, b) => a - b);
        gridNumbers.push(nums);
    }

    // 3. Distribute into 3 rows
    for (let attempt = 0; attempt < 100; attempt++) {
        const rowAssignments = Array(9).fill(null).map(() => []);
        const rowCounts = [0, 0, 0];
        let valid = true;
        const colIndices = Array.from({ length: 9 }, (_, i) => i).sort((a, b) => colCounts[b] - colCounts[a]);

        for (const c of colIndices) {
            const count = colCounts[c];
            let avail = [0, 1, 2].filter(r => rowCounts[r] < 5);
            if (avail.length < count) { valid = false; break; }
            avail.sort(() => Math.random() - 0.5);
            avail.slice(0, count).forEach(r => {
                rowAssignments[c].push(r);
                rowCounts[r]++;
            });
        }

        if (valid && rowCounts.every(c => c === 5)) {
            const rows = [
                { cells: Array(9).fill(null), marked: Array(9).fill(false) },
                { cells: Array(9).fill(null), marked: Array(9).fill(false) },
                { cells: Array(9).fill(null), marked: Array(9).fill(false) }
            ];
            for (let c = 0; c < 9; c++) {
                const assigned = rowAssignments[c].sort((a, b) => a - b);
                const nums = gridNumbers[c];
                for (let k = 0; k < nums.length; k++) {
                    const r = assigned[k];
                    rows[r].cells[c] = nums[k];
                }
            }
            return { rows };
        }
    }
    return generateGrid(); // Retry
}

function generateTicket(roomCode, ownerId) {
    const grids = [];
    // Generate 3 grids
    // Simplification: Not ensuring global uniqueness across 3 grids for now to save complexity/time
    // But since each grid is 15 random numbers, collision across grids is acceptable (standard Loto allows duplicate numbers on DIFFERENT sheets, and this is a "Ticket" of 3 grids).
    // Actually standard sheet (6 grids) has unique numbers.
    // Let's implement unique generator set if needed, but for MVP keeping grids independent is okay logic-wise.
    // Or simpler: pass exclusions?

    for (let i = 0; i < 3; i++) {
        grids.push(generateGrid());
    }

    return {
        id: generateId(),
        roomCode,
        ownerId,
        grids,
        createdAt: new Date(),
    };
}

// Folk names for numbers
const folkNames = {
    1: "Cây nảy mầm", 2: "Con vịt bầu", 3: "Con cua biển", 4: "Bốn mùa", 5: "Năm ngón tay",
    6: "Sáu câu vọng cổ", 7: "Bảy ngày", 8: "Tám tiên", 9: "Chín nàng", 10: "Mười tám vũ khí",
    11: "Đôi đũa", 12: "Mười hai bến nước", 13: "Xui xẻo", 14: "Tuổi mới lớn", 15: "Trăng rằm",
    16: "Mười sáu", 17: "Bảy mười", 18: "Tuổi đôi tám", 19: "Mười chín", 20: "Đôi mươi",
    21: "Hai mốt", 22: "Hai con vịt", 23: "Hai ba", 24: "Hai tư", 25: "Hai lăm",
    26: "Hai sáu", 27: "Hai bảy", 28: "Hai tám", 29: "Hai chín", 30: "Ba mươi",
    31: "Ba mốt", 32: "Ba hai", 33: "Ba ba rùa", 34: "Ba tư", 35: "Ba lăm",
    36: "Ba sáu", 37: "Ba bảy", 38: "Ba tám phát tài", 39: "Ba chín", 40: "Bốn mươi",
    41: "Bốn mốt", 42: "Bốn hai", 43: "Bốn ba", 44: "Bốn bốn tứ quý", 45: "Con thằn lằn",
    46: "Bốn sáu", 47: "Bốn bảy", 48: "Bốn tám", 49: "Bốn chín", 50: "Năm mươi",
    51: "Năm mốt", 52: "Năm hai", 53: "Năm ba", 54: "Năm tư", 55: "Năm năm quốc khánh",
    56: "Năm sáu", 57: "Năm bảy", 58: "Năm tám", 59: "Năm chín", 60: "Sáu mươi",
    61: "Sáu mốt", 62: "Sáu hai", 63: "Sáu ba", 64: "Sáu tư", 65: "Sáu lăm",
    66: "Sáu sáu lộc phát", 67: "Sáu bảy", 68: "Sáu tám", 69: "Sáu chín", 70: "Bảy mươi",
    71: "Bảy mốt", 72: "Bảy hai", 73: "Bảy ba", 74: "Bảy tư", 75: "Bảy lăm",
    76: "Bảy sáu", 77: "Bảy bảy", 78: "Bảy tám phát lộc", 79: "Bảy chín", 80: "Tám mươi",
    81: "Tám mốt", 82: "Tám hai", 83: "Tám ba", 84: "Tám tư", 85: "Tám lăm",
    86: "Tám sáu", 87: "Tám bảy", 88: "Tám tám phát phát", 89: "Tám chín", 90: "Chín mươi",
    91: "Chín mốt", 92: "Chín hai", 93: "Chín ba", 94: "Chín tư", 95: "Chín lăm",
    96: "Chín sáu", 97: "Chín bảy", 98: "Chín tám", 99: "Chín chín như ý",
};

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });

    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        // Create Room
        socket.on('room:create', (hostNickname, settings, callback) => {
            const code = generateRoomCode();
            const oderId = generateId();

            const room = {
                id: generateId(),
                code,
                hostId: oderId,
                hostSocketId: socket.id,
                players: [],
                status: 'waiting',
                createdAt: new Date(),
                settings: {
                    maxPlayers: 50,
                    ticketsPerPlayer: 5,
                    autoMarkNumbers: true,
                    audioMode: 'singing',
                    ...settings
                },
            };

            const hostPlayer = {
                id: oderId,
                nickname: hostNickname,
                socketId: socket.id,
                tickets: [],
                joinedAt: new Date(),
                isHost: true,
            };

            room.players.push(hostPlayer);
            rooms.set(code, room);
            players.set(socket.id, { oderId, roomCode: code, isHost: true });

            socket.join(code);
            socket.data = { oderId, roomCode: code, isHost: true, nickname: hostNickname };

            console.log(`🏠 Room created: ${code} by ${hostNickname}`);
            callback(room);
        });

        // Join Room
        socket.on('room:join', (code, nickname, callback) => {
            const room = rooms.get(code.toUpperCase());

            if (!room) {
                callback(null, 'Không tìm thấy phòng');
                return;
            }

            if (room.players.length >= room.settings.maxPlayers) {
                callback(null, 'Phòng đã đầy');
                return;
            }

            const oderId = generateId();
            const player = {
                id: oderId,
                nickname,
                socketId: socket.id,
                tickets: [],
                joinedAt: new Date(),
                isHost: false,
            };

            room.players.push(player);
            players.set(socket.id, { oderId, roomCode: code, isHost: false });

            socket.join(code);
            socket.data = { oderId, roomCode: code, isHost: false, nickname };

            io.to(code).emit('player:joined', player);
            io.to(code).emit('room:updated', room);

            console.log(`👋 ${nickname} joined room ${code}`);
            callback(room);
            io.to(code).emit('player:joined', player);
            io.to(code).emit('room:updated', room);

            console.log(`👋 ${nickname} joined room ${code}`);
            callback(room);
        });

        // Rejoin Room (Session Persistence)
        socket.on('room:rejoin', (code, oderId, callback) => {
            const room = rooms.get(code.toUpperCase());
            if (!room) {
                callback(null, 'Phòng không tồn tại');
                return;
            }

            const playerIndex = room.players.findIndex(p => p.id === oderId);
            if (playerIndex === -1) {
                callback(null, 'Không tìm thấy thông tin người chơi');
                return;
            }

            const player = room.players[playerIndex];

            // Update connection info
            player.socketId = socket.id;
            player.connected = true; // Mark as connected
            if (player.disconnectTimeout) {
                clearTimeout(player.disconnectTimeout);
                delete player.disconnectTimeout;
            }

            // Update Map
            players.set(socket.id, { oderId, roomCode: code, isHost: player.isHost });

            // Host reconnection handling
            if (player.isHost) {
                room.hostSocketId = socket.id;
            }

            socket.join(code);
            socket.data = { oderId, roomCode: code, isHost: player.isHost, nickname: player.nickname };

            // Restore tickets manually if they were lost from memory (optional check)
            // But here we rely on ticket persistence in `tickets` Map.

            // Get player's full tickets data
            const playerTickets = player.tickets.map(tId => tickets.get(tId)).filter(Boolean);

            io.to(code).emit('room:updated', room);
            console.log(`🔄 ${player.nickname} rejoined room ${code}`);

            callback({
                room,
                tickets: playerTickets,
                calledNumbers: room.currentSession ? room.currentSession.calledNumbers.map(c => c.number) : [],
                lastNumber: room.currentSession?.calledNumbers.length > 0
                    ? room.currentSession.calledNumbers[room.currentSession.calledNumbers.length - 1].number
                    : null
            });
        });

        // Leave Room (Explicit)
        socket.on('room:leave', () => {
            const playerData = players.get(socket.id);
            if (!playerData) return;

            const room = rooms.get(playerData.roomCode);
            if (!room) return;

            room.players = room.players.filter(p => p.socketId !== socket.id);

            if (playerData.isHost) {
                // Close room if host leaves EXPLICITLY
                io.to(playerData.roomCode).emit('room:closed');
                rooms.delete(playerData.roomCode);
                console.log(`❌ Room ${playerData.roomCode} closed (host left)`);
            } else {
                io.to(playerData.roomCode).emit('player:left', playerData.oderId);
                io.to(playerData.roomCode).emit('room:updated', room);
            }

            socket.leave(playerData.roomCode);
            players.delete(socket.id);
        });

        // Start Game
        socket.on('game:start', () => {
            const playerData = players.get(socket.id);
            if (!playerData?.isHost) return;

            const room = rooms.get(playerData.roomCode);
            if (!room) return;

            const session = {
                id: generateId(),
                roomCode: playerData.roomCode,
                calledNumbers: [],
                startedAt: new Date(),
            };

            room.status = 'playing';
            room.currentSession = session;
            sessions.set(session.id, session);

            io.to(playerData.roomCode).emit('game:started');
            io.to(playerData.roomCode).emit('room:updated', room);

            console.log(`🎮 Game started in room ${playerData.roomCode}`);
        });

        // Spin Number
        socket.on('game:spin', (callback) => {
            const playerData = players.get(socket.id);
            if (!playerData?.isHost) {
                callback?.(null, 'Chỉ chủ phòng mới được quay số');
                return;
            }

            const room = rooms.get(playerData.roomCode);
            if (!room || room.status !== 'playing') {
                callback?.(null, 'Trò chơi chưa bắt đầu');
                return;
            }

            const session = room.currentSession;
            const calledNums = session.calledNumbers.map(c => c.number);

            // Find available number
            const available = [];
            for (let i = 1; i <= 90; i++) {
                if (!calledNums.includes(i)) available.push(i);
            }

            if (available.length === 0) {
                callback?.(null, 'Đã hết số');
                return;
            }

            const number = available[Math.floor(Math.random() * available.length)];
            session.calledNumbers.push({ number, calledAt: new Date() });

            const folkName = folkNames[number] || `Số ${number}`;

            // Broadcast to all players
            io.to(playerData.roomCode).emit('game:number-called', {
                number,
                folkName,
                calledNumbers: session.calledNumbers.map(c => c.number),
                timestamp: Date.now(),
            });

            // Trigger audio sync
            io.to(playerData.roomCode).emit('audio:play-sequence', number);

            console.log(`🎯 Number called: ${number} - ${folkName}`);
            callback?.(number);
        });

        // Create Tickets
        socket.on('player:create-tickets', (count, callback) => {
            const playerData = players.get(socket.id);
            if (!playerData) {
                callback(null, 'Không tìm thấy người chơi');
                return;
            }

            const room = rooms.get(playerData.roomCode);
            if (!room) {
                callback(null, 'Không tìm thấy phòng');
                return;
            }

            const newTickets = [];
            for (let i = 0; i < Math.min(count, room.settings.ticketsPerPlayer); i++) {
                const ticket = generateTicket(playerData.roomCode, playerData.oderId);
                tickets.set(ticket.id, ticket);
                newTickets.push(ticket);
            }

            // Update player tickets
            const player = room.players.find(p => p.id === playerData.oderId);
            if (player) {
                player.tickets = [...player.tickets, ...newTickets.map(t => t.id)];
            }

            callback(newTickets);
        });

        // Mark Number on Ticket
        socket.on('player:mark-number', (ticketId, grid, row, col) => {
            const ticket = tickets.get(ticketId);
            if (!ticket) return;

            if (ticket.grids &&
                grid >= 0 && grid < ticket.grids.length &&
                row >= 0 && row < 3 &&
                col >= 0 && col < 9) {

                const ticketRow = ticket.grids[grid].rows[row];
                if (ticketRow.cells[col] !== null) {
                    ticketRow.marked[col] = !ticketRow.marked[col];
                }
            }
        });

        // Call Kinh (Bingo)
        socket.on('player:call-kinh', (ticketId, grid, row, callback) => {
            const playerData = players.get(socket.id);
            if (!playerData) {
                callback({ isValid: false, isWinner: false, matchedNumbers: [], missingNumbers: [] });
                return;
            }

            const room = rooms.get(playerData.roomCode);
            const ticket = tickets.get(ticketId);

            if (!room || !ticket || !room.currentSession) {
                callback({ isValid: false, isWinner: false, matchedNumbers: [], missingNumbers: [] });
                return;
            }

            const calledNums = room.currentSession.calledNumbers.map(c => c.number);

            // Validate grid/row indices
            if (!ticket.grids || !ticket.grids[grid] || !ticket.grids[grid].rows[row]) {
                callback({ isValid: false, isWinner: false, matchedNumbers: [], missingNumbers: [] });
                return;
            }

            const ticketRow = ticket.grids[grid].rows[row];
            const rowNumbers = ticketRow.cells.filter(n => n !== null);

            const matched = rowNumbers.filter(n => calledNums.includes(n));
            const missing = rowNumbers.filter(n => !calledNums.includes(n));

            const isWinner = matched.length === 5;

            // Notify room about kinh call
            io.to(playerData.roomCode).emit('player:kinh-called', {
                playerId: playerData.oderId,
                nickname: socket.data.nickname,
                ticketId,
                grid,
                row
            });

            callback({
                isValid: true,
                isWinner,
                matchedNumbers: matched,
                missingNumbers: missing
            });

            if (isWinner) {
                room.currentSession.winner = {
                    oderId: playerData.oderId,
                    nickname: socket.data.nickname,
                    ticketId,
                    grid,
                    row,
                };
                // Don't finish game automatically, let host decide? 
                // Usually game pauses or continues for next winner. 
                // Current logic seems to just announce winner.

                io.to(playerData.roomCode).emit('game:winner', {
                    winnerId: playerData.oderId,
                    nickname: socket.data.nickname,
                    ticketId,
                    grid,
                    row
                });
            }
        });

        // Host: Validate Numbers (Manual)
        socket.on('host:validate-numbers', (numbers, callback) => {
            const playerData = players.get(socket.id);
            if (!playerData?.isHost) {
                callback({ isValid: false, isWinner: false, matchedNumbers: [], missingNumbers: [] });
                return;
            }

            const room = rooms.get(playerData.roomCode);
            if (!room || !room.currentSession) {
                callback({ isValid: false, isWinner: false, matchedNumbers: [], missingNumbers: [] });
                return;
            }

            const called = room.currentSession.calledNumbers.map(c => c.number);
            callback(validateNumbers(numbers, called));
        });

        // Host: Validate Ticket (ID)
        socket.on('host:validate-ticket', (ticketId, callback) => {
            const playerData = players.get(socket.id);
            if (!playerData?.isHost) {
                callback({ isValid: false, isWinner: false, matchedNumbers: [], missingNumbers: [] });
                return;
            }

            const room = rooms.get(playerData.roomCode);
            const ticket = tickets.get(ticketId);
            if (!room || !room.currentSession || !ticket) {
                callback({ isValid: false, isWinner: false, matchedNumbers: [], missingNumbers: [] });
                return;
            }

            const called = room.currentSession.calledNumbers.map(c => c.number);
            callback(validateTicket(ticket, called));
        });

        // Reset Game
        socket.on('game:reset', () => {
            const playerData = players.get(socket.id);
            if (!playerData?.isHost) return;

            const room = rooms.get(playerData.roomCode);
            if (!room) return;

            room.status = 'waiting';
            room.currentSession = null;

            // Clear tickets
            room.players.forEach(p => {
                p.tickets.forEach(tId => tickets.delete(tId));
                p.tickets = [];
            });

            io.to(playerData.roomCode).emit('game:reset');
            io.to(playerData.roomCode).emit('room:updated', room);

            console.log(`🔄 Game reset in room ${playerData.roomCode}`);
        });

        // Disconnect
        socket.on('disconnect', () => {
            const playerData = players.get(socket.id);
            if (playerData) {
                const room = rooms.get(playerData.roomCode);
                if (room) {
                    const player = room.players.find(p => p.id === playerData.oderId);
                    if (player) {
                        player.connected = false;
                        // Set timeout to remove player after 5 minutes of inactivity
                        player.disconnectTimeout = setTimeout(() => {
                            if (!player.connected) {
                                // Really remove if still disconnected
                                room.players = room.players.filter(p => p.id !== player.id);
                                if (player.isHost) {
                                    io.to(playerData.roomCode).emit('room:closed');
                                    rooms.delete(playerData.roomCode);
                                } else {
                                    io.to(playerData.roomCode).emit('player:left', player.id);
                                    io.to(playerData.roomCode).emit('room:updated', room);
                                }
                            }
                        }, 5 * 60 * 1000); // 5 minutes grace period
                    }
                }
                players.delete(socket.id);
            }
            console.log(`❌ Client disconnected: ${socket.id}`);
        });
    });

    httpServer.listen(port, () => {
        console.log(`🚀 Server running at http://${hostname}:${port}`);
    });
});
