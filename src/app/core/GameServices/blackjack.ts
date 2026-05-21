import { effect, Injectable, signal } from "@angular/core";

import { BJ_DECK} from "../constants/deck";
import { PlayerModel } from "../models/SinglePlayerModel";

@Injectable({
    providedIn: 'root'
})

export class BlackJackService {
    gameDeck = signal(structuredClone(BJ_DECK));
    players = signal<PlayerModel[]>([
        { name: 'Player1', hand: [], score: 0 },
        { name: 'Dealer', hand: [], score: 0 }
    ])
    currentPlayersTurn = signal<number>(0);
    private dealerPlayingDelay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    constructor() {
        effect(() => {
            // Runs automatically whenever there is a new turn
            if(this.currentPlayersTurn() === this.players().length - 1){
                // Set a timeout to seem like the dealer is playing against the player
                    this.dealerTurn();
            }
        })
    }   

    resetGame() {
        // Reset players scores, and hands
        console.log("Reset")
        this.gameDeck.set(structuredClone(BJ_DECK));
        console.log(this.gameDeck());

        this.players.set([
        { name: 'Player1', hand: [], score: 0 },
        { name: 'Dealer', hand: [], score: 0 }
        ])

        // set current players turn back to the player
        this.currentPlayersTurn.set(0);

        // Redeal cards
        this.dealDeck();
    }

    // Beginning of the game - Deal cards
    dealDeck() {
        // Each player gets 2 cards
        for(let i=0; i < 2; i++) {
            for(let player of this.players()) {
                // Grab two random cards out of the deck
                const card = this.drawRandomCard()

                // Give cards to the player
                player.hand.push(this.gameDeck().at(card)!)
                player.score += this.gameDeck().at(card)!.value

                // Take card out of the game deck
                this.gameDeck().splice(card, 1)
            }
        }
    }

    // Method to draw a random card
    drawRandomCard() {
        return Math.ceil(Math.random() * this.gameDeck().length-1);
    }

    // Method to end turn "Stand"
    endTurn() {
        // Move to the next player's turn
        this.currentPlayersTurn.set(this.currentPlayersTurn() + 1);
        console.log(this.currentPlayersTurn() + "Turn");
    }

    // Method to draw another card "Hit"
    playerHit() {
        // Grab a new card, give it to the player and remove from deck
        const card = this.drawRandomCard()
        this.players.update(players => {
            const updatedPlayers = [...players];
            updatedPlayers[this.currentPlayersTurn()] = { ...updatedPlayers[this.currentPlayersTurn()], hand: [...updatedPlayers[this.currentPlayersTurn()].hand, this.gameDeck().at(card)!] };
            return updatedPlayers;
        })
        this.gameDeck().splice(card, 1);

        // Determine if player busted
        if(this.didPlayerBust()) this.endTurn()
    }

    calculateScore() {
        // Calculate score
        this.players().at(this.currentPlayersTurn())!.score = 0;
        this.players().at(this.currentPlayersTurn())!.hand.forEach(card => {
            this.players().at(this.currentPlayersTurn())!.score += card.value
        })
    }

    // Method to check if player busted
    didPlayerBust() {
        // Calculate score
        this.calculateScore();

        // check if busted
        if(this.players().at(this.currentPlayersTurn())!.score > 21)
            return true;
        else
            return false;
    }

    // Method to play dealer's turn
    async dealerTurn() {
        // Check if Player bust - if so auto determine winner (Dealer)
        this.calculateScore();
        if(this.players().at(0)!.score <= 21) {
            // Dealer must hit until they have 17 or more
            while(this.players().at(1)!.score < 17) {
                await this.dealerPlayingDelay(2000);
                this.playerHit();
            }
        }

        // End Turn
        this.endTurn();
    }

    // Method to determine winner
    determineWinner() {
        const playerScore = this.players().at(0)!.score;
        const dealerScore = this.players().at(1)!.score;

        if(playerScore > 21) {
            return {
                winner: 'Dealer',
                message: 'Player busts! Dealer wins.'
            }
        }
        else if(dealerScore > 21) {
            return {
                winner: 'Player',
                message: 'Dealer busts! Player wins.'
            }
        }
        else if(playerScore > dealerScore) {
            return {
                winner: 'Player',
                message: 'Player wins with a score of ' + playerScore
            }
        }
        else if(dealerScore > playerScore){
            return {
                winner: 'Dealer',
                message: 'Dealer wins with a score of ' + dealerScore
            }
        }
        else {
            return {
                winner: 'Tie',
                message: 'It\'s a tie! Dealer and Player have the same score.'
            }
        }

    }
}