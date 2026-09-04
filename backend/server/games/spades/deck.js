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
    2: "2", 3: "3",
};

function createDeck() {
    const deck = [];
    for (const suit of suits) {
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
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function dealDeck(players) {
    const deck = shuffleDeck(createDeck());
    const cardsPerPlayer = deck.length / players.length;

    players.forEach((player, i) => {
        player.hand = deck.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer);
    });
}

module.exports = { suits, createDeck, shuffleDeck, dealDeck };