const { createGameboard, ResourceType } = require('./gameboard');
const { 
    isValidBuildingPlace, 
    canPlayerAfford, 
    endTurn, 
    lockPlayerMoves,
    rollDice,
    playerMoveRobber,
    playerStoleCard,
    playerHalfCardsToBank
 } = require('./gameLogic');

const NON_CARD_TILES = [ResourceType.Desert, ResourceType.None]
const HAND_RESOURCES = Object.values(ResourceType).filter(
    (r) => !NON_CARD_TILES.includes(r)
);
const BUILD_COSTS = {
    Road: { [ResourceType.Forest]: 1, [ResourceType.Clay]: 1 },
    Settlement: { [ResourceType.Forest]: 1, [ResourceType.Clay]: 1, [ResourceType.Sheep]: 1, [ResourceType.Wheat]: 1 },
    City: { [ResourceType.Wheat]: 2, [ResourceType.Quarry]: 3 },
    DevCard: { [ResourceType.Sheep]: 1, [ResourceType.Wheat]: 1, [ResourceType.Quarry]: 1 },
}

function createInitialPlayerState() {
    return {
        hand: createEmptyHand(),
        score: 0,
        placedBuildings: 0,
        placedRoads: 0,
        pendingActions: [],
        hasRolled: false,
        ready: true,
    };
}

function createEmptyHand() {
    return {
        resources: Object.fromEntries(HAND_RESOURCES.map((r) => [r, 0])),
        devCards: []
    }
}

function createInitialGameState() {
    return {
        gameType: "catan",
        started: false,
        phase: "waiting",
        players: [],
        currentTurnIndex: 0,
        robberTileId: null,
        isStealingFrom: [],
        winner: null
    };
}

function startGame(room) {
    createGameboard(room);
    room.gameState.players = room.players;
    room.gameState.started = true;
    room.gameState.phase = "setup"
    room.gameState.currentTurnIndex = 0;
    room.gameState.gameBoard = room.gameBoard;
    room.gameState.roundNumber = 1;
}

function onGameStarted(room, helpers) {
    room.players.forEach((player) => {
        helpers.io.to(player.socketId).emit("game-update", {
            gameState: room.gameState
        });
    });
}

function sanitizeGameStateFor(gameState, forPlayerId) {
    return {
        ...gameState,
        players: (gameState.players || []).map((p) => ({
            ...p,
            hand: p.socketId === forPlayerId ? p.hand : undefined,
            handSize: calculatePlayerCards(p)
        })),
    };
}

function calculatePlayerCards(player) {
    let totalCards = 0;
    Object.values(player.hand.resources).forEach((r) => totalCards += r);

    return totalCards;
}

function handleAction(room, action, socketId, payload, helpers) {
    let playerToMutate = room.players.find(p => p.socketId === socketId);
    
    const clickedVertex = room.gameBoard.vertices[payload.vertexId] ?? [];
    const clickedEdge = room.gameBoard.edges[payload.edgeId] ?? [];
    const clickedTile = room.gameBoard.tiles.find(t => t.id === payload.tileId);

    switch (action) {
        case "roll-dice":
            rollDice(room, socketId);
        break;
        case "end-turn":
            endTurn(room, socketId);
            lockPlayerMoves(room, socketId);
        break;
        case "moved-robber":
            playerMoveRobber(clickedTile, room, socketId);
        break;
        case "stole-card":
            playerStoleCard(payload.playerStolenFrom, playerToMutate, room);
            room.gameState.isStealingFrom = [];
        break;
        case "give-to-bank":
            playerHalfCardsToBank(payload.cardIds, playerToMutate, room);
            break;
        case "player-add-building":
            var s = isValidBuildingPlace(room, socketId, clickedVertex);
            if(clickedVertex.building == 'None') {
                clickedVertex.building = 'Settlement';
                clickedVertex.owner = socketId;
                playerToMutate.score += 1;
                playerToMutate.placedBuildings += 1;
            } else if (clickedVertex.building == 'Settlement') {
                clickedVertex.building = 'City';
                clickedVertex.owner = socketId;
                playerToMutate.score += 1;
                playerToMutate.placedBuildings += 1;
            } 
            break;
        case "player-add-road":
            if(!clickedEdge.hasRoad) {
                clickedEdge.hasRoad = true;
                clickedEdge.owner = socketId;
                playerToMutate.placedRoads += 1;
            }
            break;
        case "player-remove-building":
            if (clickedVertex.locked) return
            if(clickedVertex.building == 'Settlement') {
                clickedVertex.building = 'None';
                clickedVertex.owner = null;
                playerToMutate.score -= 1;
                playerToMutate.placedBuildings -= 1;
            } else if (clickedVertex.building == 'City') {
                clickedVertex.building = 'Settlement';
                playerToMutate.score -= 1;
            } 
            break;
        case "player-remove-road":
            if (clickedEdge.locked) return
            if(clickedEdge.hasRoad) {
                clickedEdge.hasRoad = false;
                clickedEdge.owner = null;
                playerToMutate.placedRoads -= 1;
            }
            break;    
    }

    helpers.sendGameUpdateToPlayers(room);
}

module.exports = {
    createInitialPlayerState,
    createInitialGameState,
    startGame,
    onGameStarted,
    sanitizeGameStateFor,
    handleAction
};