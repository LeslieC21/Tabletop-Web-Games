// Deck creation & dealing
const suits = [
    { name: 'Hearts', imageUrl: '/Hearts.png'},
    { name: 'Diamonds', imageUrl: '/Diamonds.png'}, 
    { name: 'Clubs', imageUrl: '/Clubs.png'}, 
    { name: 'Spades', imageUrl: '/Spades.png'},
];

// const Ranks = {
//     2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7",
//     8: "8", 9: "9", 10: "10",
//     11: "J", 12: "Q", 13: "K", 14: "A",
// };

const TestRanks = {
    2: "2", 3: "3"
};

function createDeck() {
    const deck = [];
    for (const suit of suits) {
        // for(let value = 2; value <= 14; value++) {
        for(let value = 2; value <= 3; value++) {
            deck.push({
                suit,
                value,
                rank: TestRanks[value]
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
                hand: [],
                bid: -1,
                tricksWon: 0,
                score: 0,
                bags: 0,
                ready: true
            }],
            gameState: { 
                started: false,
                phase: "waiting",
                players: [],
                dealerIndex: 0,
                currentTurnIndex: 0,
                currentTrick: [],
                tricksPlayed: 0,
                spadesBroken: false,
                roundNumber: 1,
                winner: null
            },
        };

        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.data.clientId = clientId;

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
                hand: [],
                bid: -1,
                tricksWon: 0,
                score: 0,
                bags: 0,
                ready: true
        });

        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.data.clientId = clientId;

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
        room.gameState.currentTurnIndex = 0;

        // Broadcast game starting to everyone in the room
        room.players.forEach((player) => {
            io.to(player.socketId).emit("hand-dealt", {
                hand: player.hand,
                gameState: sanitizeGameStateFor(room.gameState, player.clientId)
            })
        });
    });



    // GAME ACTION (any player)
    socket.on('game-action', ({ roomCode, action, clientId, payload }) => {
        const room = rooms[roomCode];
        if(!room) return;
        
        let playerToMutate = room.players.find(p => p.clientId === clientId);

        switch(action) {
            case "submit-playerBid":
                // Payload only has the bid
                playerToMutate.bid = payload.bid;
                endTurn(room);
                sendGameUpdateToPlayers(room);
            break;
            case "play-card":
                // Payload only has the card played
                // Move card from player hand to currentTrick
                if(!room.gameState.spadesBroken && payload.card.suit.name === "Spades") {
                    room.gameState.spadesBroken = true;
                }

                const playedCardIndex = playerToMutate.hand.findIndex(card => 
                    card.rank === payload.card.rank && 
                    card.suit.name === payload.card.suit.name
                );
                let addTrick = { card: payload.card, cardOwner: playerToMutate.clientId }
                room.gameState.currentTrick.push(addTrick);
                playerToMutate.hand.splice(playedCardIndex, 1);
                room.gameState.players.map((player) => ({
                    ...player,
                    player: player.clientId == playerToMutate.clientId ? playerToMutate : player
                }))
                endTurn(room);
                sendGameUpdateToPlayers(room);
            break;
            case "new-hand":
                // Game State: change the dealerIndex to next player, redeal cards, phase -> "bidding", currentIndex to dealer
                // reset tricksPlayed to 0, reset spadesBroken, 
                // Players - Give players their new hands, set bid to null, tricksWon back to 0
                room.gameState.dealerIndex = (room.gameState.roundNumber % room.players.length) - 1;
                dealDeck(room.players);

                room.gameState.phase = "bidding";
                room.gameState.currentTurnIndex = room.gameState.dealerIndex;
                room.gameState.tricksPlayed = 0;
                room.gameState.spadesBroken = false;

                room.gameState.players.forEach((p) => {
                    p.bid = -1;
                    p.tricksWon = 0;
                })

                sendGameUpdateToPlayers(room);
            break;
            case 'mark-ready':
                // Mark a specific player as ready
                // Reset Game as well
                room.gameState.players.forEach(p => {
                    p.ready = p.clientId === clientId ? true : p.ready;
                    p.hand = [];
                    p.handSize = 0;
                    p.bid = -1;
                    p.tricksWon = 0;
                    p.score = 0;
                    p.bags = 0;
                })
                
                room.gameState.started = false;
                room.gameState.phase = "waiting";
                room.gameState.dealerIndex = 0;
                room.gameState.currentTurnIndex = 0;
                room.gameState.tricksPlayed = 0;
                room.gameState.spadesBroken = false;
                room.gameState.roundNumber = 1;
                room.gameState.winner = null;
                
                const readiedPlayers = room.gameState.players.filter(p => p.ready === true);
                // Send GameUpdate to only the players that have readied
                readiedPlayers.forEach(p => {
                    io.to(p.socketId).emit("game-update", {
                    gameState: sanitizeGameStateFor(room.gameState, clientId)
                    })
                })
            break;
        }
    });

    socket.on("sent-message", ({ roomCode, payload }) => {
        // Payload = { from , message }
        if(!roomCode || !rooms[roomCode])
            return;

        // Send message to others
        io.to(roomCode).emit("new-message", {
            from: payload.from,
            message: payload.message
        })
    })

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
        room.gameState.players = room.players.filter(p => p.clientId !== clientId)
        const socketIds = room.players.map((p) => p.socketId);

        // If there are no players left - delete the room
        if(room.players.length === 0) {
            delete rooms[roomCode];
        } else { 
            // If the game is being played - stop the game.
            if(room.gameState.phase !== "waiting" && room.gameState.phase !== "game-over") {
                io.to(socketIds).emit("host-left", {
                    hostLeft: clientId,
                    gameState: { started: false },
                })
                delete rooms[roomCode];
            } else {
                // The game is not being played - Find a new host
                const isHost = room.players.some(p => p.isHost === true);
                if(!isHost) room.players[0].isHost = true;

                io.to(socketIds).emit("player-left", {
                    players: room.players,
                    playerName,
                    gameState: room.gameState
                });
            }
        }
    });
});


// HELPER FUNCTIONS 
function sendGameUpdateToPlayers(room) {
    room.players.forEach((player) => {
        io.to(player.socketId).emit("game-update", {
            gameState: sanitizeGameStateFor(room.gameState, player.clientId)
        })
    })
}

function endTurn(room) {
    let s = room.gameState.currentTurnIndex + 1;
    room.gameState.currentTurnIndex = s % room.gameState.players.length;

    // Check if every player has had a turn
    if(room.gameState.currentTurnIndex === room.gameState.dealerIndex) {
        switch(room.gameState.phase) {
            case "bidding":
                room.gameState.phase = "playing";
            break;
            case "playing":
                // If a spade is played it wins
                // No spade is played - so highest card that matches the suit wins
                // Assume the first player to throw won the trick unless proven otherwise
                let highestSuitPlayed = room.gameState.currentTrick[0].card.suit.name;
                let highestCard = room.gameState.currentTrick[0].card.value;
                room.gameState.currentTrick.forEach(trick => {
                    if(trick.card.suit.name === "Spades" && highestSuitPlayed !== "Spades") {
                        highestSuitPlayed = trick.card.suit.name;
                        highestCard = trick.card.value;
                    } 
                    else if(trick.card.suit.name === "Spades" && highestSuitPlayed === "Spades") { 
                        highestCard = Math.max(trick.card.value, highestCard); 
                    }
                    else if(trick.card.suit.name === highestSuitPlayed) {
                        highestCard = Math.max(trick.card.value, highestCard); 
                    }
                });

                let winnerId = room.gameState.currentTrick.find(p => p.card.suit.name === highestSuitPlayed && p.card.value == highestCard).cardOwner;
                // 1. Give winner the point (tricksWon)
                let winnerIndex = room.gameState.players.findIndex(p => p.clientId === winnerId);
                room.gameState.players[winnerIndex].tricksWon += 1;

                // 2. Empty currentTrick
                room.gameState.currentTrick.length = 0;
                // 3. Winner becomes new dealer
                room.gameState.dealerIndex = winnerIndex;
                room.gameState.currentTurnIndex = winnerIndex;
                // 4. Increase tricksPlayed
                room.gameState.tricksPlayed += 1;
                // 5. Increase roundNumber
                room.gameState.roundNumber += 1;

                // Check if hand is complete
                if(room.gameState.players.at(0).hand.length === 0) {
                    // HAND COMPLETED
                    // Change gameState to hand-complete
                    // Calculate Hand Scores
                    // Determine if a team has 500 points - game over
                    room.gameState.phase = "hand-complete";
                    calculateScores(room);
                }
            break;
        }
    }

    // Determine if hand has been completed.
    if(room.gameState.phase === "playing") {
        determineCardValidity(room);
    } 
}

function determineCardValidity(room) {
    // Determine if each card is valid for player based on cards thrown
    // check if spades has been broken as well
    let currentPlayer = room.players[room.gameState.currentTurnIndex];

    // This could be better 
    currentPlayer.hand.forEach(card => {
        // Only check what is valid
        switch(room.gameState.spadesBroken) {
            case true:
                if(room.gameState.currentTrick.length === 0)
                    card.valid = true;
                // else if(card.suit.name === 'Spades')
                //     card.valid = true;
                else if(card.suit.name === room.gameState.currentTrick[0].card.suit.name)
                    card.valid = true;
                else 
                    card.valid = false;
            break;
            case false:
                if(room.gameState.currentTrick.length === 0 && card.suit.name !== 'Spades')
                    card.valid = true;
                else if(room.gameState.currentTrick.length !== 0 && card.suit.name === room.gameState.currentTrick[0].card.suit.name)
                    card.valid = true;
                else if(room.gameState.currentTrick.length === 0)
                    card.valid = false;
                else 
                    card.valid = false;
            break;
        }
    })
    // Check if there is atleast one card that is valid
    const hasValidCards = currentPlayer.hand.some(card => card.valid === true);
    if(!hasValidCards) {
        if(!room.gameState.spadesBroken)
            room.gameState.spadesBroken = true;

        // Set every card in hand to valid
            currentPlayer.hand.forEach(card => {
                card.valid = true;
            })
    }
}

function calculateScores(room) {
    // *1. Player/Team Scores 10 points for each trick bid and 1 point for each bag.
    // *2. If a Player/Team doesnt take enough tricks to fulfil their bid, they are deducted bid * 10 points.
    // *3. If a Player/Team bid 0 and are successful they are awarded 100 points, unsuccessfull -100 points.
    // 4. Blind Nil     
    // 5. If a player bid nill- it is only scored based on their INDIVIDUAL tricksTaken
    
    //2 Players 1 - 2   2/2
    //4 Players 1 - 2 - 1 - 2   4/2
    //6 Players 1 - 2 - 3 - 1 - 2 - 3   6/2
    const teamsLength = room.players.length / 2;
    let teamScores = new Array(room.players.length).fill(0);

        for(let i=0; i <= teamsLength; i++) {
            if(teamsLength === 1) {
                let p = room.players[i];

                if(p.bid === 0) {
                    teamScores[i] += (
                        p.tricksWon > 0 ?
                        -100 : 100
                    );
                } else {
                    teamScores[i] += (
                        p.tricksWon >= p.bid ? 
                        ((p.bid * 100) + (p.tricksWon - p.bid)) : (p.bid * -100)
                    );
                }
            } else {
                // Grab the team - always going to be a team of two
                let p1 = room.players[i];
                let p2 = room.players[i + teamsLength];

                // Calculate Team Bid
                let teamBid = p1.bid + p2.bid;
                teamScores[i] += (
                    (p1.tricksWon + p2.tricksWon) >= teamScores[i] ? 
                    ((teamBid * 100) + ((p1.tricksWon + p2.tricksWon) - teamBid)) : (teamBid * -100)
                )

                // Check if either player bid nil
                if(p1.bid === 0) {
                    teamScores[i] += (
                        p1.tricksWon > 0 ? 
                        -100 : 100
                    )
                }
                if(p2.bid === 0) {
                    teamScores[i] += (
                        p2.tricksWon > 0 ?
                        -100 : 100
                    )
                }

                // Set each teammates score to the same thing
                // Maybe add TeamBid to Player Model
                p1.score += teamScores[i];
                p2.score += teamScores[i];
            }
        }

        // Check if there are any winners
        const isWinner = teamScores.flatMap((score, index) => {
            return (score >= 200 ? index : [])
        })  
        console.log(teamScores);

        // Check if there are more than one winner
        let winnerTeamIndex = isWinner[0];   // Index of all scores that are above 200
        if(isWinner.length >= 2) {
            console.log("Multile Winners " + isWinner);
            // Grab the highest Score then determine if there are more than one instance of it
            let highestScore = Math.max(...isWinner);
            let winner = isWinner.filter(score => score === highestScore);
            if(winner.length > 1) {
                // Sudden Death
                room.gameState.phase = "sudden-death";
                sendGameUpdateToPlayers(room);
            } else {
                winnerTeamIndex = room.players.findIndex(p => p.score === winner);
                console.log("Multile Winners - Found Winner " + winnerTeamIndex);
                room.gameState.phase = "game-over";
                room.gameState.winner = winnerTeamIndex;
                room.gameState.players.forEach(p => p.ready = false);
                sendGameUpdateToPlayers(room);
            }
        } else if(isWinner.length === 1) {
            // Winner!
            console.log("One Winner " + winnerTeamIndex + " " + isWinner);
            room.gameState.phase = "game-over";
            room.gameState.winner = winnerTeamIndex;
            room.gameState.players.forEach(p => p.ready = false);
            sendGameUpdateToPlayers(room);
        } else {
            sendGameUpdateToPlayers(room);
        }

    // room.players.forEach((p) => {
    //     // Bid Nil - only based off individual preformance
    //     if(p.bid === 0) {
    //         p.score += (
    //             p.tricksWon > 0 ?
    //              -100 : 100
    //         );
    //     } else {
    //         p.score += (
    //             p.tricksWon >= p.bid ? 
    //             ((p.bid * 100) + (p.tricksWon - p.bid)) : (p.bid * -100)
    //         );
    //     }
    // })

    // Check if the game is won
    // const winners = room.players.filter((p, i) => (p.score >= 200));
    // if(winners.length >= 2) {
    //     let winner = winners[0];
    //     winners.forEach(p => {
    //         if(p.score === winner.score && p.clientId !== winner.clientId) {
    //             // TIE
    //             room.gameState.phase = "sudden-death";
    //             sendGameUpdateToPlayers(room);
    //         } else if(p.score > winner.score) {
    //             winner = p;
    //         }
    //     })

    //     if(room.gameState.phase != "sudden-death") {
    //         room.gameState.phase = "game-over";
    //         room.gameState.winner = winner;
    //         room.gameState.players.forEach(p => p.ready = false);
    //         sendGameUpdateToPlayers(room);
    //     }
    // } else if(winners.length !== 0) {
    //     // There is a winner
    //     room.gameState.phase = "game-over";
    //     room.gameState.winner = winners[0];
    //     room.gameState.players.forEach(p => p.ready = false);
    //     sendGameUpdateToPlayers(room);
    // } else {
    //     sendGameUpdateToPlayers(room);
    // }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Game server running on http://localhost:${PORT}`);
})