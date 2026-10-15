const spades = require('./spades');
const catan = require('./catan');

const GAMES = {
    spades,
    catan
}

function getGame(gameType) {
    const game = GAMES[gameType];
    
    if(!game) {
        throw new Error(`Unknown game type: ${gameType}`)
    }

    return game;
}

module.exports = { getGame, GAMES };