const { dealDeck } = require('./deck');
const { endTurn } = require('./gameLogic');

// Common interface implementation for Spades

function createInitialPlayerState() {
    return {
        hand: [],
        bid: -1,
        tricksWon: 0,
        score: 0,
        bags: 0,
        ready: true,
    };
}

function createInitialGameState() {
    return {
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
    };
}

function startGame(room) {
    dealDeck(room.players);
    room.gameState.players = room.players;
    room.gameState.started = true;
    room.gameState.phase = "bidding"
    room.gameState.currentTurnIndex = 0;
}

function onGameStarted(room, helpers) {
    room.players.forEach((player) => {
        helpers.io.to(player.socketId).emit("hand-dealt", {
            hand: player.hand,
            gameState: sanitizeGameStateFor(room.gameState, player.socketId)
        });
    });
}

function sanitizeGameStateFor(gameState, forPlayerId) {
    return {
        ...gameState,
        players: (gameState.players || []).map((p) => ({
            ...p,
            hand: p.socketId === forPlayerId ? p.hand : undefined,
            handSize: p.hand.length
        })),
    };
}

function handleAction(room, action, socketId, payload, helpers) {
    let playerToMutate = room.players.find(p => p.socketId === socketId);

    switch (action) {
        case "submit-playerBid":
            playerToMutate.bid = payload.bid;
            endTurn(room, helpers);
            helpers.sendGameUpdateToPlayers(room);
            break;

        case "play-card": {
            if (!room.gameState.spadesBroken && payload.card.suit.name === "Spades") {
                room.gameState.spadesBroken = true;
            }

            const playedCardIndex = playerToMutate.hand.findIndex(card =>
                card.rank === payload.card.rank &&
                card.suit.name === payload.card.suit.name
            );

            room.gameState.currentTrick.push({ card: payload.card, cardOwner: playerToMutate.socketId });
            playerToMutate.hand.splice(playedCardIndex, 1);

            endTurn(room, helpers);
            helpers.sendGameUpdateToPlayers(room);
            break;
        }

        case "new-hand":
            room.gameState.dealerIndex = (room.gameState.roundNumber % room.players.length) - 1;
            dealDeck(room.players);

            room.gameState.phase = "bidding";
            room.gameState.currentTurnIndex = room.gameState.dealerIndex;
            room.gameState.tricksPlayed = 0;
            room.gameState.spadesBroken = false;

            room.gameState.players.forEach((p) => {
                p.bid = -1;
                p.tricksWon = 0;
            });

            helpers.sendGameUpdateToPlayers(room);
            break;

        case "mark-ready": {
            room.gameState.players.forEach(p => {
                p.ready = p.socketId === socketId ? true : p.ready;
                p.hand = [];
                p.handSize = 0;
                p.bid = -1;
                p.tricksWon = 0;
                p.score = 0;
                p.bags = 0;
            });

            room.gameState.started = false;
            room.gameState.phase = "waiting";
            room.gameState.dealerIndex = 0;
            room.gameState.currentTurnIndex = 0;
            room.gameState.tricksPlayed = 0;
            room.gameState.spadesBroken = false;
            room.gameState.roundNumber = 1;
            room.gameState.winner = null;

            const readiedPlayers = room.gameState.players.filter(p => p.ready === true);
            readiedPlayers.forEach(p => {
                helpers.io.to(p.socketId).emit("game-update", {
                    gameState: sanitizeGameStateFor(room.gameState, p.socketId),
                });
            });
            break;
        }
    }
}

module.exports = {
    createInitialPlayerState,
    createInitialGameState,
    startGame,
    onGameStarted,
    sanitizeGameStateFor,
    handleAction
};