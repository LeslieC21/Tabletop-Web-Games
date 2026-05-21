export type Game = 'Blackjack' | 'Spades' | 'Uno'

export interface GameDetails { 
    instructions: string, 
    allowMultiplayer: boolean
}

export const GAME_RULES: Record<Game, GameDetails> = {
    'Blackjack': 
    { 
        instructions: '', 
        allowMultiplayer: false 
    },
    'Spades': 
    { 
        instructions: '', 
        allowMultiplayer: true 
    },
    'Uno': { 
        instructions: '', 
        allowMultiplayer: true 
    }
}