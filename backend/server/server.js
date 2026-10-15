const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { getGame } = require("./games/gameRegistry");

const app = express();
app.use(cors());
app.use(express.json);

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "https://localhost:4200",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Store all active game rooms
const rooms = {};

function generateRoomCode() {
    return Math.random().toString(36).substring(2,8).toUpperCase();
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
    if (room) {
        res.json({
            exists: true,
            playerCount: room.players.length
        });
    } else {
        res.json({ exists: false });
    }
});

// Sends every player their own sanitized view of the current game's state.
// Game modules call this via `helpers.sendGameUpdateToPlayers`.
function sendGameUpdateToPlayers(room) {
    const game = getGame(room.gameType);
    room.players.forEach((player) => {
        io.to(player.socketId).emit("game-update", {
            gameState: game.sanitizeGameStateFor(room.gameState, player.socketId)
        });
    });
}

// Passed into every game module so it can talk back to sockets without 
// importing `io` or room-management code directly
const helpers = { io, sendGameUpdateToPlayers };

io.on('connection', (socket) => {
    // CREATE ROOM
    socket.on("create-room", ({ playerName, gameType = "spades" }) => {
        const roomCode = generateRoomCode();
        const game = getGame(gameType);

        rooms[roomCode] = {
            code: roomCode,
            gameType,
            players: [{
                socketId: socket.id,
                name: playerName,
                isHost: true,
                ...game.createInitialPlayerState(),
            }],
            gameState: game.createInitialGameState(),
        };

        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.data.socketId = socket.id;

        socket.emit("room-created", {
            roomCode,
            gameType,
            players: rooms[roomCode].players,
        });
    });

    // JOIN ROOM
    socket.on('join-room', ({ roomCode, playerName }) => {
        const room = rooms[roomCode];

        if (!room) {
            socket.emit("error", { message: "Room not found."});
            return;
        }

        if (room.gameState.started) {
            socket.emit("error", { message: "Game in progress..." });
            return;
        }
        
        const game = getGame(room.gameType);
        room.players.push({
            socketId: socket.id,
            name: playerName,
            isHost: false,
            ...game.createInitialPlayerState(),
        });

        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.data.socketId = socket.id;

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
                socketId: socket.id,
                name: playerName
            },
        });
    });

    // START GAME (Host Only)
    socket.on("start-game", ({ roomCode }) => {
        const room = rooms[roomCode];
        if (!room) return;

        const player = room.players.find((p) => p.socketId === socket.id);
        if (!player?.isHost) {
            socket.emit("error", { message: "Only the host can start the game." });
            return;
        }
        const game = getGame(room.gameType);
        game.startGame(room);
        game.onGameStarted(room, helpers);
    });

    // GAME ACTION (any player) - delegated entirely to the room's game module
    socket.on('game-action', ({ roomCode, action, socketId, payload }) => {
        const room = rooms[roomCode];
        // GAME TYPE IS UNDEFINED WHEN GIVEN TO GETGAME
        if (!room) return;

        const game = getGame(room.gameType);
        game.handleAction(room, action, socketId, payload, helpers);
    });

    // Chat Messages
    socket.on("sent-message", ({ roomCode, payload }) => {
        // Payload = { from, message }
        if (!roomCode || !rooms[roomCode]) return;

        io.to(roomCode).emit("new-message", {
            from: payload.from,
            message: payload.message
        });
    });

    // Disconnect from GAME not socket
    socket.on("leave-game", (socketId) => {
        const { roomCode, playerName } = socket.data;

        if (!roomCode || !rooms[roomCode]) return;

        const room = rooms[roomCode];

        room.players = room.players.filter((p) => p.socketId !== socket.id);
        room.gameState.players = room.players.filter(p => p.socketId !== socketId);
        const socketIds = room.players.map((p) => p.socketId);

        if (room.players.length === 0) {
            delete rooms[roomCode];
        } else {
            if (room.gameState.phase !== "waiting" && room.gameState.phase !== "game-over") {
                io.to(socketIds).emit("host-left", {
                    hostLeft: socketId,
                    gameState: { started: false },
                });
                delete rooms[roomCode];
            } else {
                const isHost = room.players.some(p => p.isHost === true);
                if (!isHost) room.players[0].isHost = true;

                io.to(socketIds).emit("player-left", {
                    players: room.players,
                    playerName,
                    gameState: room.gameState
                });
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Game server running on http://localhost:${PORT}`);
});