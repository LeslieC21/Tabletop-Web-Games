function scorePlayer(player) {
    if (player.bid === 0) {
        return player.tricksWon === 0 ? 100 : -100;
    }

    return player.tricksWon >= player.bid 
        ? (player.bid * 10) + (player.tricksWon - player.bid)
        : player.bid * -10;
}

function calculateScores(room, helpers) {
    const teamsLength = room.players.length / 2;
    let teamScores = new Array(room.players.length).fill(0);

    for (let i = 0; i < teamsLength; i++) {
        let p1 = room.players[i];
        let p2 = room.players[i+teamsLength];
        if (teamsLength === 1) {

            teamScores[i] += scorePlayer(p1);
            teamScores[i + teamsLength] += scorePlayer(p2);

            p1.score += teamScores[i];
            p2.score += teamScores[i+teamsLength];
        } else {
            let teamBid = p1.bid + p2.bid;
            teamScores[i] += (
                (p1.tricksWon + p2.tricksWon) >= teamBid[i] ?
                    ((teamBid * 10) + ((p1.tricksWon + p2.tricksWon) - teamBid)) : (teamBid * -10)
            );

            if (p1.bid === 0) {
                teamScores[i] += scorePlayer(p1)
            }
            if (p2.bid === 0) {
                teamScores[i] += scorePlayer(p2)
            }

            p1.score += teamScores[i];
            p2.score += teamScores[i];
        }

        console.log("TEAM SCORES")
        console.log(p1.score + " " + p2.score)
        console.log(teamScores[i])
    }

    const isWinner = teamScores.flatMap((score, index) => (score >= 500 ? index : []));

    let winnerTeamIndex = isWinner[0];
    if(isWinner.length >= 2) {
        let highestScore = Math.max(...teamScores);
        let winner = teamScores.filter(score => score === highestScore);
        if (winner.length > 1) {
            room.gameState.phase = "sudden-death";
            helpers.sendGameUpdateToPlayers(room);
        } else {
            winnerTeamIndex = room.players.findIndex(p => p.score === winner);
            room.gameState.phase = "game-over";
            room.gameState.winner = winnerTeamIndex;
            room.gameState.players.forEach(p => p.ready = false);
            helpers.sendGameUpdateToPlayers(room);
        }
    } else if (isWinner === 1) {
        room.gameState.phase = "game-over";
        room.gameState.winner = winnerTeamIndex;
        room.gameState.players.forEach(p => p.ready = false);
        helpers.sendGameUpdateToPlayers(room);
    } else {
        helpers.sendGameUpdateToPlayers(room);
    }
}

module.exports = { calculateScores };