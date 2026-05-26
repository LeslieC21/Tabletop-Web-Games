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
        instructions: `Spades Basics
=============

Spades is a trick-taking partnership game where players bid the number of tricks each expects to take. Teams earn points by achieving their combined bid and minimizing penalties by doing so as accurately as possible. Games are played to 500 points and the team with the _highest_ score wins.

If you’re new to the game of Spades, check out the lessons in our **Spades Lessons** section. Get there by using the “Spades Lessons” button at the bottom of the main Spades page.

The Deal
--------

Spades is commonly played with a standard 52-card deck, 2 through Ace of each suit. Ace is high and Spades is always the trump suit. The entire deck is dealt giving each of four players 13 cards.

Bidding
-------

Following the deal, each player bids by declaring the number of tricks they believe they can take. Bidding starts to the dealer’s left and continues clockwise until all players have bid once.

Though players bid individually, a partnership’s bids are combined for scoring. The combined number of taken tricks is compared to the combined bid, and points are awarded accordingly (see Scoring, below).

A player may bid Nil if he or she believes they can take zero tricks. Achieving a Nil bid results in a score of 100 points but failing Nil subtracts 100 points from the team’s score.

Play
----

The player to the dealer’s left leads the first trick. Spades may not be led until they’ve been played on a previous hand, unless the player has only Spades. This rule can be changed in practice and join games (see [Spades Rules](https://www.trickstercards.com/help/spades-rules/)).

Play continues clockwise following the led suit, if possible, or playing any other card if not. When all four players have played, the trick is taken by the player who played the highest Spade, if any, or the player who played the highest card of the led suit otherwise.

The player who takes the trick leads the next trick.

Scoring
-------

Scores are computed at the end of each hand and points are awarded to each team as follows:

*   If a team makes or exceeds their combined bid, they are awarded 10 points per bid. For example, if one member of the team bid 3 tricks and other bid 4 tricks and, combined, they took 8 tricks, they are awarded 70 points for 7 tricks bid.
    
*   If the team exceeds their combined bid, 1 point is added for each trick over their bid. In the example above, the team is award 1 additional point for taking 8 tricks when they bid only 7. These single points are referred to as “bags.”
    
*   If a team collects 10 bags across hands, a penalty of 100 points is subtracted from their score. This penalty can be turned off in practice and join games (see Spades Rules).
    
*   If a team fails to achieve their bid, their score is not changed. There are rule variations that change this scoring (see [Spades Rules](https://www.trickstercards.com/help/spades-rules/)).
    
*   If a player who bid Nil achieves their bid, 100 points is added to the team score (double for Blind Nil).
    
*   If a player who bid Nil takes one or more tricks, they fail their Nil bid and 100 points are subtracted from the team score (double for Blind Nil).
    
*   If one player of a partnership bids Nil, the other player’s score is computed based on their own bid and tricks taken without including any tricks taken by the Nil bidder.
    

The first team to achieve 500 points wins the game.`, 
        allowMultiplayer: true 
    },
    'Uno': { 
        instructions: '', 
        allowMultiplayer: true 
    }
}