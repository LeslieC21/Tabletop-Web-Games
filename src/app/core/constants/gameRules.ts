import { SpadesGameBoard } from "../../pages/games/spades/spades-game-board";
import { CatanGameBoard } from "../../pages/games/catan/catan";
import { GameBoardComponent } from "../models/GameBoardComponents";
import { Type } from "@angular/core";
import { BlackJackGameBoard } from "../../pages/games/Blackjack/blackjack-game-board";

export type Game = 'Blackjack' | 'Spades' | 'Catan'

export interface GameDetails { 
    title: string,
    instructions: string, 
    allowMultiplayer: boolean
}

export const GAME_BOARD_REGISTRY: Record<Game, Type<GameBoardComponent>> = {
    Spades: SpadesGameBoard,
    Catan: CatanGameBoard,
    Blackjack: BlackJackGameBoard
};

export const GAME_METADATA: Record<Game, GameDetails> = {
    'Blackjack': 
    { 
        title: 'Blackjack',
        instructions: 
        `Blackjack Basics
        =================

        Blackjack (or "21") is a card game played against the dealer, not against other players. The goal is to get a hand value closer to 21 than the dealer's, without going over.

        The Deal
        --------

        Blackjack is played with one or more standard 52-card decks. Each player places a bet, then is dealt two cards face-up. The dealer takes two cards, one face-up and one face-down (the "hole card"). Number cards are worth their face value, face cards (Jack, Queen, King) are worth 10, and an Ace counts as either 1 or 11, whichever benefits the hand more.

        Player Turn
        -----------

        Starting to the dealer's left, each player chooses one or more actions on their hand:

        *   **Hit** — take another card
        *   **Stand** — keep the current hand and end the turn
        *   **Double Down** — double the bet, take exactly one more card, then stand
        *   **Split** — if the first two cards match in rank, separate them into two hands, each with its own bet
        *   **Surrender** (where allowed) — forfeit half the bet and end the hand immediately

        A hand that exceeds 21 "busts" and loses immediately, regardless of the dealer's outcome.

        Dealer's Turn
        -------------

        Once all players have finished, the dealer reveals the hole card and plays by fixed rules: hit on 16 or less, stand on 17 or more (rule variations exist for a "soft 17," an Ace-6 combination).

        Scoring
        -------

        Payouts are compared per hand against the dealer's final hand:

        *   If the player's hand is closer to 21 than the dealer's, the player wins and is paid 1:1 on their bet.
        *   If the player is dealt a Blackjack (an Ace and a 10-value card as the first two cards) and the dealer does not also have Blackjack, the player wins at 3:2 odds.
        *   If the dealer's hand is closer to 21, or the player busts, the player loses their bet.
        *   If both hands tie in value ("push"), the bet is returned with no win or loss.
        *   If the dealer busts, all remaining players win automatically.

        There is no running total across hands — each round is settled independently based on the bet placed.`, 
        allowMultiplayer: false 
    },
    'Spades': 
    { 
        title: 'Spades',
        instructions: 
        `Spades Basics
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
    'Catan': { 
        title: 'Catan',
        instructions: 
        `Catan Basics
        =============

        Catan is a resource-trading and settlement-building game for 3–4 players. Players collect resources, build roads and settlements, and race to be the first to reach 10 victory points.

        The Setup
        ---------

        The board is made of hexagonal terrain tiles (hills, forests, mountains, fields, and pasture, plus one desert), each producing a resource: brick, lumber, ore, grain, or wool. Every tile is assigned a number token (2 through 12). Players start with two settlements and two roads already placed on the board.

        Rolling and Resources
        ----------------------

        Each turn begins with the active player rolling two dice. Every tile whose number matches the roll produces its resource for any player with a settlement or city touching that tile — even players who aren't taking their turn. Rolling a 7 triggers the robber: any player holding more than 7 cards discards half, the active player moves the robber to a new tile (blocking its production), and steals a resource card from an opponent adjacent to that tile.

        Building
        --------

        On their turn, a player may trade resources with the bank or other players, then spend resources to build:

        *   **Road** — 1 brick, 1 lumber
        *   **Settlement** — 1 brick, 1 lumber, 1 grain, 1 wool
        *   **City** (upgrades a settlement) — 2 grain, 3 ore
        *   **Development card** — 1 ore, 1 grain, 1 wool

        Settlements must be placed at an intersection at least two edges away from any other settlement, and connected to the player’s existing road network. Cities produce double resources compared to a settlement on the same tile.

        Development Cards
        ------------------

        Development cards are drawn face-down and can grant a Knight (moves the robber and counts toward Largest Army), a resource bonus, a free pair of roads, or a victory point. Knight cards played face-up count toward the Largest Army bonus once a player has played three or more.

        Scoring
        -------

        Victory points are earned as follows:

        *   1 point per settlement
        *   2 points per city
        *   2 points for Largest Army (most Knights played, minimum 3)
        *   2 points for Longest Road (minimum 5 connected road segments)
        *   1 point for certain development cards (kept hidden until claimed)

        The first player to reach 10 victory points on their own turn wins the game.`, 
        allowMultiplayer: true 
    }
}

export const GAME_LIST: GameDetails[] = Object.values(GAME_METADATA);