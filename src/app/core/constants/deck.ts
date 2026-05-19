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
    'J': 10,
    'Q': 10,
    'K': 10,
    'A': 11
}

export const DECK: Card[] = SUITS.flatMap(suit => (
    Object.keys(RANK_VALUES) as Rank[]).map(rank => ({
        rank,
        suit,
        value: RANK_VALUES[rank]
    }))
);