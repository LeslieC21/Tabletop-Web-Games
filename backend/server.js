const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:4200",
        methods: ["GET", "POST"],
    },
});

// Store all active game rooms
const rooms = {};

// Method to generate a random 6 character room code
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// REST endpoint to create a new room
app.post("/create-room", (req, res) => {
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
        code: roomCode,
        players: [],
        gameState: {},
        createdAt: Date.now(),
    };
    res.json({ roomCode });
});

// REST endpoint to check if a room exists
app.get("/room/:code", (req, res) => {
    const room = rooms[req.params.code.toUpperCase()];
    if(room) {
        res.join({ 
            exists: true, playerCount: room.players.length 
        });
    } else {
        res.json({ exists: false })
    }
});

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    socket.onAny((event, ...args) => {
        console.log(`Received event: ${event}`, args);
    });

    // CREATE ROOM
    socket.on("create-room", ({ playerName }) => {
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            code: roomCode,
            players: [{
                id: socket.id, 
                name: playerName, 
                isHost: true,
                score: 0,
                hand: [],
                bid: 0
            }],
            gameState: { started: false },
        };

        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.data.playerName = playerName;

        console.log(`Room created: ${roomCode} by ${playerName}`);

        socket.emit("room-created", {
            roomCode, 
            players: rooms[roomCode].players,
        });
    });

    // JOIN ROOM
    socket.on('join-room', ({ roomCode, playerName }) => {
        const room = rooms[roomCode];

        if(!room) {
            socket.emit("error", { message: "Room not found. "});
            return;
        }

        if(room.gameState.started) {
            socket.emit("error", { message: "Game in progress..."})
            return;
        }

        room.players.push({
            id: socket.id,
            name: playerName,
            isHost: false,
            score: 0,
            hand: [],
            bid: 0,
        });

        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.data.playerName = playerName;

        // Tell the joining player the current state
        socket.emit("room-joined", {
            roomCode,
            players: room.players,
            gameState: room.gameState,
        });

        // Tell everyone a new player joined
        socket.to(roomCode).emit("player-joined", {
            players: room.players,
            newPlayer: {
                id: socket.id,
                name: playerName
            },
        });
    });

    // START GAME (host only)
    socket.on("start-game", ({ roomCode }) => {
        const room = rooms[roomCode];
        if(!room) return;

        const player = room.players.find((p) => p.id === socket.id);
        if(!player?.isHost) {
            socket.emit("error", { message: "Only the host can start the game."})
            return;
        }

        room.gameState.started = true;

        // Broadcast game starting to everyone in the room
        io.to(roomCode).emit("game-started", {
            gameState: room.gameState
        });
    });

    // GAME ACTION (any player)
    socket.on('game-action', ({ roomCode, action, payload }) => {
        const room = rooms[roomCode];
        if(!room) return;


        // Update game state (game specific logic)
        socket.to(roomCode).emit("game-update", {
            action,
            payload,
            from: socket.data.playerName,
            });
        });

        // Give players their dealt hands
        socket.on('deal-hand', ({ targetPlayerId, hand }) => {
            console.log("Player receieves " + hand);
            io.to(targetPlayerId).emit('deal-hand', { hand });
        });

        // SYNC GAME STATE
        socket.on("sync-state", ({ roomCode, gameState }) => {
            console.log('sync-state received, broadcasting game-update to:', roomCode);
            const room = rooms[roomCode];
            if(!room) return;

            room.gameState = {
                ...room.gameState, 
                ...gameState
            };

            // Push updated state to everyone except sender
            socket.to(roomCode).emit("game-update", {
                action: 'state-update',
                payload: gameState,
                from: socket.data.playerName
            });
        });

        socket.on("disconnect", () => {
            const { roomCode, playerName } = socket.data;
            if (!roomCode || !rooms[roomCode]) return;

            const room = rooms[roomCode];

            // Remove player from room
            room.players = room.players.filter((p) => p.id !== socket.id)
            console.log(`${playerName} left room: ${roomCode}`);

            if(room.players.length === 0) {
                // Clean up empty room
                delete rooms[roomCode];
                console.log(`Room ${roomCode} deleted (empty)`)
            } else {
                // If host left, assign a new host
                if(!room.players.find((p) => p.isHost)) {
                    room.players[0].isHost = true;
                }

                // Notify remaining players
                io.to(roomCode).emit("player-left", {
                    players: room.players,
                    playerName,
                });
            }
        });
    });

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Game server running on http://localhost:${PORT}`);
    })