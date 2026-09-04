const spades = require('./spades');

const GAMES = {
    spades,
}

function getGame(gameType) {
    const game = GAMES[gameType];
    
    if(!game) {
        throw new Error(`Unknown game type: ${gameType}`)
    }

    return game;
}

module.exports = { getGame, GAMES };