const { calculateScores } = require('./scoring');

function endTurn(room, helpers) {
    let nextPlayerIndex = room.gameState.currentTurnIndex + 1;
    room.gameState.currentTurnIndex = nextPlayerIndex % room.gameState.players.length;

    // Check if every player has had a turn
    if (room.gameState.currentTurnIndex === room.gameState.dealerIndex) {
        switch(room.gameState.phase) {
            case "bidding":
                room.gameState.phase = "playing";
                break;
            case "playing":
                // If a spade is played it wins
                // No spade is played - so highest card that matches suit wins
                // Assume the first player to throw won the trick unless proven otherwise
                let highestSuitPlayed = room.gameState.currentTrick[0].card.suit.name;
                let highestCard = room.gameState.currentTrick[0].card.value;
                room.gameState.currentTrick.forEach(trick => {
                    if (trick.card.suit.name === "Spades" && highestSuitPlayed !== "Spades") {
                        highestSuitPlayed = trick.card.suit.name;
                        highestCard = trick.card.value;
                    } else if (trick.card.suit.name === "Spades" && highestSuitPlayed === "Spades") {
                        highestCard = Math.max(trick.card.value, highestCard);
                    } else if (trick.card.suit.name === highestSuitPlayed) {
                        highestCard = Math.max(trick.card.value, highestCard);
                    }
                });

                let winnerId = room.gameState.currentTrick.find(
                    p => p.card.suit.name === highestSuitPlayed && p.card.value === highestCard
                ).cardOwner;


                let winnerIndex = room.gameState.players.findIndex(p => p.socketId === winnerId);
                room.gameState.players[winnerIndex].tricksWon += 1;

                room.gameState.currentTrick.length = 0;
                room.gameState.dealerIndex = winnerIndex;
                room.gameState.currentTurnIndex = winnerIndex;
                room.gameState.tricksPlayed += 1;

                // Check if hand is complete
                if (room.gameState.players.at(0).hand.length === 0) {
                    room.gameState.phase = "hand-complete";
                    room.gameState.roundNumber += 1;
                    calculateScores(room, helpers);
                }
            break;
        }
    }

    if (room.gameState.phase === "playing") {
        determineCardValidity(room);
    }
}

function determineCardValidity(room) {
    let currentPlayer = room.players[room.gameState.currentTurnIndex];

    currentPlayer.hand.forEach(card => {
        switch (room.gameState.spadesBroken) {
            case true:
                if 
                (
                    room.gameState.currentTrick.length === 0 ||
                    card.suit.name === room.gameState.currentTrick[0].card.suit.name
                )
                    card.valid = true;
                else 
                    card.valid = false;
                break;
            case false:
                if
                (
                    (room.gameState.currentTrick.length === 0 && card.suit.name !== 'Spades') ||
                    (room.gameState.currentTrick.length !== 0 && card.suit.name === room.gameState.currentTrick[0].card.suit.name)
                )
                    card.valid = true;
                else 
                    card.valid = false;
        }
    });

    const hasValidCards = currentPlayer.hand.some(card => card.valid === true);
    if (!hasValidCards) {
        room.gameState.spadesBroken = true;

        currentPlayer.hand.forEach(card => {
            card.valid = true;
        });
    }
}

module.exports = { endTurn, determineCardValidity };