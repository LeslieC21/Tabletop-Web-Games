// Deck creation & dealing
const suits = [
    { name: 'Hearts', imageUrl: '/Hearts.png'},
    { name: 'Diamonds', imageUrl: '/Diamonds.png'}, 
    { name: 'Clubs', imageUrl: '/Clubs.png'}, 
    { name: 'Spades', imageUrl: '/Spades.png'},
];

const Ranks = {
    2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7",
    8: "8", 9: "9", 10: "10",
    11: "J", 12: "Q", 13: "K", 14: "A",
};

function createDeck() {
    const deck = [];
    for (const suit of suits) {
        for(let value = 2; value <= 14; value++) {
            deck.push({
                suit,
                value,
                rank: Ranks[value]
            });
        }
    }

    return deck;
}

function shuffleDeck(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
    }

    return a;
}

function dealDeck(players) {
    const deck = shuffleDeck(createDeck());
    const CardsPerPlayer = deck.length / players.length;

    players.forEach((player, i) => {
        player.hand = deck.slice(i * CardsPerPlayer, (i + 1) * CardsPerPlayer);
    });
}

// Strip other players hands out before sending 
function sanitizeGameStateFor(gameState, forPlayerId) {
    return {
        ...gameState,
        players: (gameState.players).map((p) => ({
            ...p,
            hand: p.clientId === forPlayerId ? p.hand : undefined,
            handSize: p.hand.length
        }))
    };
}

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
        credentials: true
    }
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
    // console.log(`Player connected: ${socket.id}`);
    socket.onAny((event, ...args) => {
        // console.log(`Received event: ${event}`, args);
    });

    // CREATE ROOM
    socket.on("create-room", ({ playerName, clientId }) => {
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            code: roomCode,
            players: [{
                clientId: clientId,
                socketId: socket.id, 
                name: playerName, 
                isHost: true,
                totalScore: 0,
                handScore: 0,
                hand: [],
                bid: 0
            }],
            gameState: { started: false },
        };

        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.data.playerName = playerName;

        // console.log(`Room created: ${roomCode} by ${playerName}`);

        socket.emit("room-created", {
            roomCode, 
            players: rooms[roomCode].players,
        });
    });

    // JOIN ROOM
    socket.on('join-room', ({ roomCode, playerName, clientId }) => {
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
            clientId: clientId,
            socketId: socket.id,
            name: playerName,
            isHost: false,
            totalScore: 0,
            handScore: 0,
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
                socketId: socket.id,
                name: playerName
            },
        });
    });

    // START GAME (host only)
    socket.on("start-game", ({ roomCode }) => {
        const room = rooms[roomCode];
        if(!room) return;

        const player = room.players.find((p) => p.socketId === socket.id);
        if(!player?.isHost) {
            socket.emit("error", { message: "Only the host can start the game."})
            return;
        }

        // Deal hands to the players
        dealDeck(room.players);
        room.gameState.players = room.players;
        room.gameState.started = true;
        room.gameState.phase = "bidding";

        // Broadcast game starting to everyone in the room
        room.players.forEach((player) => {
            io.to(player.socketId).emit("hand-dealt", {
                hand: player.hand,
                gameState: sanitizeGameStateFor(room.gameState, player.id)
            })
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
            // console.log("Player receieves " + hand);
            io.to(targetPlayerId).emit('deal-hand', { hand });
        });

        // SYNC GAME STATE
        socket.on("sync-state", ({ roomCode, gameState }) => {
            // console.log('sync-state received, broadcasting game-update to:', roomCode);
            const room = rooms[roomCode];
            if(!room) return;

            room.gameState = {
                ...room.gameState, 
                ...gameState
            };

            // Push updated state to everyone
            socket.to(roomCode).emit("game-update", {
                action: 'state-update',
                payload: gameState,
                from: socket.data.playerName
            });
        });

        // Disconnect from GAME not socket
        socket.on("leave-game", ( clientId ) => {
            const { roomCode, playerName } = socket.data;

            // If room doesnt exist return
            if (!roomCode || !rooms[roomCode])
                return;
            
            // Grab room that had a disconnected player
            const room = rooms[roomCode];
            
            // Grab list of players that are still in the game & player that left
            room.players = room.players.filter((p) => p.socketId !== socket.id);
            const socketIds = room.players.map((p) => p.socketId);

            console.log(room.players);

            // If there are no players left - delete the room
            if(room.players.length === 0) {
                delete rooms[roomCode];
                console.log(`Room ${roomCode} deleted (empty)`)
            } else {    
                // If there is now no host in the room
                if(!room.players.find((p) => p.isHost)) {
                    console.log("Host has left. Closing Room");
                    io.to(roomCode).emit("host-left", {
                        hostLeft: clientId,
                        gameState: { started: false },
                    })
                    delete rooms[roomCode];
                } else {
                    // Notify remaining players that host left
                    io.to(socketIds).emit("player-left", {
                        players: room.players,
                        playerName
                    });
                }
            }
        });
    });

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Game server running on http://localhost:${PORT}`);
    })