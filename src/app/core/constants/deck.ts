export type Suit = 
    { name: 'Hearts', imageUrl: '/Hearts.png'} | 
    { name: 'Diamonds', imageUrl: '/Diamonds.png'} | 
    { name: 'Clubs', imageUrl: '/Clubs.png'} | 
    { name: 'Spades', imageUrl: '/Spades.png'};

// export type Suit = 'Hearts' | 'Diamonds' | 'Clubs' | 'Spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
    rank: Rank;
    suit: Suit;
    value: number;
}

export const SUITS: Suit[] = [
    { name: 'Hearts', imageUrl: '/Hearts.png' },
    { name: 'Diamonds', imageUrl: '/Diamonds.png'}, 
    { name: 'Clubs', imageUrl: '/Clubs.png'}, 
    { name: 'Spades', imageUrl: '/Spades.png'}
];

// export const SUITS: Suit[] = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];

export const RANK_VALUES: Record<Rank, number> = {
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13,
    'A': 14
}

// export const DECK: Card[] = SUITS.flatMap(suit => (
//     Object.keys(RANK_VALUES) as Rank[]).map(rank => ({
//         rank,
//         suit,
//         value: RANK_VALUES[rank]
//     }))
// );

export const BJ_RANK_VALUES: Record<Rank, number> = {
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 10,
    'Q': 10,
    'K': 10,
    'A': 11
}

export const BJ_DECK: Card[] = SUITS.flatMap(suit => (
    Object.keys(BJ_RANK_VALUES) as Rank[]).map(rank => ({
        rank,
        suit,
        value: BJ_RANK_VALUES[rank]
    }))
);

export const DECK: Card[] = [
    { rank: '2', suit:{ name: 'Diamonds', imageUrl: '/Diamonds.png'}, value: 2},
    { rank: '10', suit:{ name: 'Spades', imageUrl: '/Spades.png'}, value: 10},
    { rank: '6', suit:{ name: 'Hearts', imageUrl: '/Hearts.png'}, value: 6},
    { rank: 'K', suit:{ name: 'Spades', imageUrl: '/Spades.png'}, value: 13},
    { rank: 'J', suit:{ name: 'Clubs', imageUrl: '/Clubs.png'}, value: 11},
    { rank: 'A', suit:{ name: 'Hearts', imageUrl: '/Hearts.png'}, value: 14},
]