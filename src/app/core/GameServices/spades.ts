import { effect, Injectable, signal } from "@angular/core";

import { Card, DECK, SUITS } from "../constants/deck";
import { PlayerModel } from "../models/Player";

interface cardPot {
    card: Card,
    cardOwner: string
}

@Injectable({
    providedIn: 'root'
})

export class SpadesService {
    readonly gameDeck = DECK;
    players = signal<PlayerModel[]>([
        { id: 0, name: 'Player1', hand: [], score: 0, bid: 0 },
        { id: 1, name: 'Player2', hand: [], score: 0, bid: 0 },
        { id: 2, name: 'Player3', hand: [], score: 0, bid: 0 },
        { id: 3, name: 'Player4', hand: [], score: 0, bid: 0 }
    ])      // Can ony have 2 players or 4 players
    currentPlayersTurn = signal<number>(1);
    teamBids = signal<number[]>([0, 0]);
    gameRounds = signal<number>(0);
    currentPot = signal<cardPot[]>([])

    constructor() {
        effect(() => {
            // Round 0 is just for submitting bids
            // So check if the game has actually started and were ready to tally team points
            if(this.currentPlayersTurn() === 0 && this.gameRounds() === 1){
                this.calculateTeamBids();
            }

            // If started a new round... determine who won the previous round
            if(this.currentPlayersTurn() === 0 && this.gameRounds() > 1){
                // Check which player won the pot
                this.determineRoundWinner();
            }
            console.log("Next Turn... The new player is " + this.currentPlayersTurn());
        })
    }

    // Method to deal the cards - Beginning of the game
    dealDeck() {
        // Store the length/playerCount before for loop so when we mutate the array we dont
        // mess up the loop
        var playerRecievingCard = 0;
        while(this.gameDeck.length > 0) {
            const card = this.drawRandomCard();
            this.players().at(playerRecievingCard)!.hand.push(this.gameDeck.at(card)!)
            this.gameDeck.splice(card, 1);

            playerRecievingCard += 1;
            if(playerRecievingCard >= this.players().length-1)
                playerRecievingCard = 0;
        }
    }

    // Method to draw a random card
    drawRandomCard() {
        return Math.ceil(Math.random() * this.gameDeck.length-1);
    }

    setPlayerBid(bid: number) {
        this.players().at(this.currentPlayersTurn())!.bid = bid;
        this.endTurn();
    }

    // Method to allow users to place their bids
    calculateTeamBids() {
        // If there are only two players - their bids are their own
        // If there are four players - their bids are combined with their teammate
        if(this.players().length == 2) return;
        else if(this.players().length == 4) {
            // Teams are Player 0 - Player 2 and Player 1 and Player 3
            for(let player of this.players()) {
                this.teamBids()[player.id % 2] += player.bid!;
            }
        }
        console.log("Team Bids: " + this.teamBids())
    }

    // Method to end turn 
    endTurn() {
        // Move to the next player's turn
        this.currentPlayersTurn.set(this.currentPlayersTurn() + 1);
        
        if(this.currentPlayersTurn() > this.players().length-1) {
            this.currentPlayersTurn.set(0);
            this.gameRounds.update(oldVal => oldVal + 1);
        }
    }

    // Method to submit the card to the current 'pot'
    playCard(cardPlayed: Card, playerId: string) {
        this.currentPot().push({
            card: cardPlayed,
            cardOwner: playerId
        });
    }

    determineRoundWinner() {
        // Look through each card
        let winner = '';
        let currentBestScore = '';
        let bestScore = '';
        for(let card of this.currentPot()) {
            var cardValue = card.card.value;
            var cardSuit = card.card.suit;

            // Check if the highest score is a spade - if so then only check
            // if the card we are looking at is a spade if it is check if its
            // a higher spade if so it takes over for best card.
        }
    }
}