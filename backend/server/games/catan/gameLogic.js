const { BuildingType } = require("./gameboard");

function endTurn(room, playerId) {
    // Every player needs to be ready to end a turn
    if(room.gameState.players.some((p) => p.status !== "ready")) return;

    var player = room.gameState.players.find((p) => p.socketId === playerId);
    if (!player.hasRolled && room.gameState.phase !== "setup") return;
    player.hasRolled = false;

    room.gameState.currentTurnIndex = (room.gameState.currentTurnIndex + 1) % room.players.length;    
    if(room.gameState.phase === 'setup' && room.gameState.roundNumber == 2) {
        giveStartingResources(room, playerId);
    }

    if(room.gameState.currentTurnIndex == 0) room.gameState.roundNumber += 1;
    if (room.gameState.phase == 'setup' && room.gameState.roundNumber == 3) 
        room.gameState.phase = 'playing';
}

function giveStartingResources(room, playerId) {
    const player = room.gameState.players.find((p) => p.socketId === playerId);
    const vertex = Object.values(room.gameBoard.vertices).find(
        (v) => v.owner === playerId && !v.locked
    );

    if (!player || !vertex) return;

    const tilesById = new Map(room.gameBoard.tiles.map((t) => [t.id, t]));

    for(const tileId of vertex.adjacentTileIds) {
        const resource = tilesById.get(tileId).resource;
        if (resource in player.hand.resources) {
            player.hand.resources[resource] += 1;
        }
    }
}

function lockPlayerMoves(room, playerId) {
    Object.values(room.gameBoard.edges).forEach(edge => {
        if (edge.owner == playerId && !edge.locked)
            edge.locked = true;
    })

    Object.values(room.gameBoard.vertices).forEach(vertex => {
        if (vertex.owner == playerId && !vertex.locked)
            vertex.locked = true;
    })
}

function isValidBuildingPlace(room, playerId, vertex) {
    // Check if attached to own road
    const neighbourEdges = vertex.adjacentEdgeIds;
    const s = neighbourEdges.some(id => {
        room.gameBoard.edges[id].owner = playerId;
    });

    // Check if no neighbors that arent your own
    const neighbourVertexs = vertex.adjacentVertexIds;
    const f = neighbourVertexs.some(id => {
        room.gameBoard.vertices[id].owner != playerId;
    });

    return (s && !f);
}

function rollDice(room, playerId) {
    const { tiles, vertices } = room.gameBoard;
    const players = room.gameState.players;

    player = players.find((p) => p.socketId === playerId);

    if (player.hasRolled) return;

    // Dice 1-6
    let dice1 = Math.floor((Math.random() * 6) + 1);
    let dice2 = Math.floor((Math.random() * 6) + 1);
    const rolledNum = dice1 + dice2;

    console.log('------------------')
    console.log('ROLLING DICE')
    console.log('D1: ', dice1, ' D2: ', dice2)
    console.log('------------------')

    if (rolledNum === 7) {
        // Special Turn
        // Check if anyone has more than 7 resource cards and allow the player to move the robber.
        for(const p of players) {
            let totalCards = 0;
            Object.values(p.hand.resources).forEach((r) => totalCards += r);

            if (totalCards > 7) {
                p.status = 'removingCards';
            }
        }

        player.status = 'movingRobber';
    } else {
        for (const tile of tiles) {
            if (tile.numberToken !== rolledNum) continue;

            if (room.gameState.robberTileId === tile.id) continue;

            for (const vertexId of tile.vertexIds) {
                const vertex = vertices[vertexId];
                if (vertex.building === BuildingType.None) continue;

                const player = players.find((p) => p.socketId === vertex.owner);
                if (!player) continue;

                player.hand.resources[tile.resource] += vertex.building === BuildingType.City ? 2 : 1;
            }
        }
    }

    player.hasRolled = true;
}

function canPlayerAfford() {

}

module.exports = { 
    endTurn,
    giveStartingResources,
    lockPlayerMoves,
    isValidBuildingPlace,
    canPlayerAfford,
    rollDice
 };