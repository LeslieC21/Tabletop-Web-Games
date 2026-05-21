import { effect, Injectable, signal } from "@angular/core";

import { Card, DECK, SUITS } from "../constants/deck";
import { PlayerModel } from "../models/PlayerModel";
import { GameSocketService } from "../ConnectionServices/GameSocketService";

interface cardPot {
    card: Card,
    cardOwner: string   // This will be the player id
}

@Injectable({
    providedIn: 'root'
})

export class SpadesService {
    gameDeck = signal(structuredClone(DECK));
    players = signal<PlayerModel[]>([])      // Can ony have 2 players or 4 players
    currentPlayersTurn = signal<number>(0);
    teamBids = signal<number[]>([0, 0]);
    gameRounds = signal<number>(0);
    currentPot = signal<cardPot[]>([]);
    isGameOver = signal<boolean>(false);


    constructor(private gameSocket: GameSocketService) {
        // On game start host deals the deck and syncs to all
        this.gameSocket.gameStarted$.subscribe(() => {
            if(this.gameSocket.isHost(this.gameSocket.players$.value)) {
                this.initPlayers();
                this.dealDeck();
            }
        });

        // When server sends a state update - apply it locally
        this.gameSocket.gameUpdate$.subscribe(({ action, payload }) => {
            if (action === 'state-update') {
                this.applyState(payload);
            }
        });

        // When server deals this player their hand
        this.gameSocket.myHand$.subscribe(hand => {
            const myId = this.gameSocket.socketId;
            this.players.update(players => 
                players.map(p => p.id === myId ? { ...p, hand } : p)
            );
        });


        effect(() => {
            const turn = this.currentPlayersTurn();
            const rounds = this.gameRounds();

            // Round 0 is just for submitting bids
            // So check if the game has actually started and were ready to tally team points
            if(turn === 0 && rounds === 1){
                this.calculateTeamBids();
            }

            // Check if all cards were delt - check if first player has a card
            if(this.players().length > 0 && this.players().at(0)!.hand.length === 0) {
                if(this.teamBids().some(teamScore => teamScore === 500 || teamScore === -200)) {
                    this.isGameOver.set(true);
                }
                console.log("Round OVER!")
            }

            // If started a new round... determine who won the previous round
            if(turn === 0 && rounds > 1){
                // Check which player won the pot - return player id that won
                const winner = this.determineRoundWinner();
                // Find player who won - add one to their score
                this.players.update(players =>
                    players.map(p => p.id === winner ? { ...p, score: p.score + 1} : p)
                );
                this.currentPot.set([]);
                this.syncPublicState();
            }
            console.log("Next Turn... The new player is " + this.currentPlayersTurn());
        });
    }

    // Build player list from socket players
    private initPlayers(): void {
        const socketPlayers = this.gameSocket.players$.value;
        this.players.set(socketPlayers.map(p => ({
            ...p,
            hand: [],
            bid: 0,
        })));
    }

    // Host deals cards - host stored locally others sent privately
    // Method to deal the cards - Beginning of the game
    dealDeck(): void {
        // Store the length/playerCount before for loop so when we mutate the array we dont
        // mess up the loop
        var playerRecievingCard = 0;
        const deck = structuredClone(DECK).sort(() => Math.random() - 0.5);
        const playerCount = this.players().length;
        const hands: Card[][] = Array.from({
            length: playerCount
        }, () => []);

        // Distribute cards round-robin
        deck.forEach((card, i) => {
            hands[i % playerCount].push(card);
        });

        this.players().forEach((player, i) => {
            if (player.id === this.gameSocket.socketId) {
                // Store host locally
                this.players.update(players => 
                    players.map(p => p.id === player.id ? { ...p, hand: hands[i] }: p)
                );
            } else {
                // Send privately to each player
                this.gameSocket.socket.emit('deal-hand', {
                    targetPlayerId: player.id,
                    hand: hands[i]
                });
            }
        });
        
        this.syncPublicState();
    }

    setPlayerBid(bid: number): void {
        const myId = this.gameSocket.socketId;
        this.players.update(players => 
            players.map(p => p.id === myId ? { ...p, bid} : p)
        );

        // Broadcast bid to other players
        this.gameSocket.sendAction(
            this.gameSocket.roomCode$.value!,
            'player-bid',
            { playerId: myId, bid }
        );

        this.endTurn();
    }

    // Method to allow users to place their bids
    calculateTeamBids(): void {
        // If there are only two players - their bids are their own
        // If there are four players - their bids are combined with their teammate
        if(this.players().length === 2) return;
        const bids = [0, 0];
        this.players().forEach((p, i) => {
            bids[i % 2] += p.bid!;
        });
        this.teamBids.set(bids);
        console.log("Team Bids:", bids);
    }

    // Method to end turn 
    endTurn(): void {
        const next = this.currentPlayersTurn() + 1;

        if(next > this.players().length - 1) {
            this.currentPlayersTurn.set(0);
            this.gameRounds.update(r => r + 1);
        } else {
            this.currentPlayersTurn.set(next);
        }

        this.syncPublicState();
    }

    // Method to submit the card to the current 'pot'
    // and remove from players hand
    playCard(cardPlayed: Card, playerId: string): void {
        // Add card to the pot
        this.currentPot.update(pot => [ ...pot, { card: cardPlayed, cardOwner: playerId }]);

        // Remove from players hand
        this.players.update(players => 
            players.map(p =>
                p.id === playerId ? { ...p, hand: p.hand.filter(c => c !== cardPlayed)} : p
            )
        );

        // Broadcast card played
        this.gameSocket.sendAction(
            this.gameSocket.roomCode$.value!,
            'card-played',
            { card: cardPlayed, playerId }
        );

        this.endTurn();
    }

    determineRoundWinner(): string {
        // Look through each card
        let winnerId = '';
        let bestScore = 0;
        let bestScoreSuit = '';
        let firstSuitThrown = this.currentPot().at(0)!.card.suit.name;

        for(const entry of this.currentPot()) {
            const cardValue = entry.card.value;
            const cardSuit = entry.card.suit.name;

            // Check if best score suit is a spade
            if(bestScoreSuit === 'Spades') {
                if(cardSuit === 'Spades' && cardValue > bestScore) {
                    bestScore = cardValue;
                    bestScoreSuit = cardSuit;
                    winnerId = entry.cardOwner;
                }
                continue;
            }

            if(cardSuit === 'Spades') {
                bestScore = cardValue;
                bestScoreSuit = cardSuit;
                winnerId = entry.cardOwner;
                continue;
            }

            if(cardSuit === firstSuitThrown && cardValue > bestScore) {
                bestScore = cardValue;
                bestScoreSuit = cardSuit;
                winnerId = entry.cardOwner;
            }
        }
        console.log(`Round winner: ${winnerId} with score ${bestScore} suit ${bestScoreSuit}`);
        return winnerId;
    }

    // Sync public state to all players
    private syncPublicState(): void {
        const publicPlayers = this.players().map(({ hand, ...rest}) => rest);
        this.gameSocket.syncState(
            this.gameSocket.roomCode$.value!, 
            {
                players: publicPlayers,
                currentPlayersTurn: this.currentPlayersTurn(),
                teamBids: this.teamBids(),
                gameRounds: this.gameRounds(),
                currentPot: this.currentPot(),
                isGameOver: this.isGameOver(),
            }
        );
    }

    // Apply incoming state from server (players that arent host)
    private applyState(payload: any): void {
        if(payload.players) {
            const myId = this.gameSocket.socketId;

            // Merge incoming players but keep hands intact
            this.players.update(current =>
                payload.players.map((incoming: any) => {
                    const existing = current.find(p => p.id === incoming.id);
                    return {
                        ...incoming,
                        hand: incoming.id === myId ? (existing?.hand ?? []) : [],
                    };
                })
            )
        }

        if(payload.currentPlayersTurn != undefined)
            this.currentPlayersTurn.set(payload.currentPlayersTurn);
        if(payload.teamBids)
            this.teamBids.set(payload.teamBids);
        if(payload.gameRounds !== undefined)
            this.gameRounds.set(payload.gameRounds);
        if(payload.currentPot)
            this.currentPot.set(payload.currentPot);
        if(payload.isGameOver !== undefined)
            this.isGameOver.set(payload.isGameOver);
    }
}