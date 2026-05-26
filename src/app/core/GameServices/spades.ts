import { effect, Injectable, signal } from "@angular/core";

import { Card, DECK, SUITS } from "../constants/deck";
import { PlayerModel } from "../models/PlayerModel";
import { GameSocketService } from "../ConnectionServices/GameSocketService";
import { filter, take } from "rxjs";

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
    currentRoundsLeader = signal<number>(0);    // Which player started the round
    teamBids = signal<number[]>([0, 0]);
    gameRounds = signal<number>(0);
    currentPot = signal<cardPot[]>([]);
    isGameOver = signal<boolean>(false);
    allowSpades = signal<boolean>(false);
    private hasDelt = false;


    constructor(private gameSocket: GameSocketService) {
        // When game starts, non-host initializes from gameState
        this.gameSocket.gameState$
        .pipe(
            filter(state => state.started && state['players']?.length > 0),
            take(1)
        )
        .subscribe(state => {
            if (state.started && !this.gameSocket.isHost(this.gameSocket.players$.value)) {
                if (state['players'] && state['players'].length > 0) {
                    this.applyState(state);
                }
            }
        });

        // When server sends a state update - apply it locally
        this.gameSocket.gameUpdate$.subscribe(({ action, payload }) => {
            // Only process actions from connected players
            if(payload.playerId === this.gameSocket.socketId) return;

            if (action === 'state-update') {
                this.applyState(payload);
                return;
            }

            if (action === 'player-bid') {
                this.players.update(players => 
                    players.map(p => p.id === payload.playerId ? { ...p, bid: payload.bid} : p)
                );
            }

            if (action === 'card-played') {
                this.currentPot.update(pot => [ ...pot, {
                    card: payload.card,
                    cardOwner: payload.playerId
                }]);
                this.players.update(players => 
                    players.map(p => p.id === payload.playerId
                        ? { ...p, hand: p.hand.filter(c => c !== payload.card )}
                        : p
                    )
                );
            }
        });

        // When server deals this player their hand
        let pendingHand: Card[] = [];
        this.gameSocket.myHand$.subscribe(hand => {
            if (hand.length === 0) return; // ignore initial empty value
            const myId = this.gameSocket.socketId;

            if (this.players().length > 0) {
                // players already initialized, apply immediately
                this.players.update(players =>
                    players.map(p => p.id === myId ? { ...p, hand } : p)
                );
            } else {
                pendingHand = hand;
            }
        });

        effect(() => {
            const players = this.players();

            if (players.length > 0 && pendingHand.length > 0) {
                const myId = this.gameSocket.socketId;
                this.players.update(p =>
                    p.map(player => player.id === myId ? { ...player, hand: pendingHand } : player)
                );
                pendingHand = [];
            }
        });

        // separate effect for turn/round logic
        effect(() => {
            const turn = this.currentPlayersTurn();
            const rounds = this.gameRounds();

            // If bids were just submitted
            if (turn === 0 && rounds === 1) {
                this.calculateTeamBids();
            }

            // Calculate Player/Team Score for each hand
            if(rounds > 1 && this.players().at(0)?.hand.length === 0 && this.currentPot().length === 0){
                this.players().forEach(player => {
                    if(player.bid! === 0){
                        if(player.handScore > 0)
                            player.score -= 100;
                        else
                            player.score += 100;
                    }
                    else if((player.handScore - player.bid!) >= 10)
                        player.score -= 100
                    else if(player.handScore > player.bid!)
                        player.score += (player.bid! * 10) + ((player.handScore - player.bid!))
                    // Player did not hit their bid...
                })

                // Reset games hand
            }

            // Check if game is over
            if (this.hasDelt && this.players().length > 0 &&
                this.players().at(0)!.hand.length === 0) {
                if (this.teamBids().some(score => score === 500 || score === -200)) {
                    this.isGameOver.set(true);
                }
            }

            console.log("Next Turn... The new player is " + turn);
        });
    }

    // Reset round
    resetHand() {
        this.currentPlayersTurn.set(0);
        this.currentRoundsLeader.set(0);
        this.teamBids.set([0, 0]);
        this.gameRounds.set(0);
        this.currentPot.set([]);
        this.hasDelt = false;

        this.players().forEach(player => {
            player.bid = 0,
            player.handScore = 0,
            player.hand = []
        })

        this.dealDeck();
    }

    // Build player list from socket players
    initPlayers(): void {
        const socketPlayers = this.gameSocket.players$.value;
        this.players.set(socketPlayers.map(p => ({
            ...p,
            hand: [],
            bid: 0,
            score: 0,
            handScore: 0
        })));
    }

    // Host deals cards - host stored locally others sent privately
    // Method to deal the cards - Beginning of the game
    dealDeck(): void {
        this.hasDelt = true;
        // Store the length/playerCount before for loop so when we mutate the array we dont
        // mess up the loop
        const deck = structuredClone(DECK).sort(() => Math.random() - 0.5);
        const playerCount = this.gameSocket.players$.value.length;
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
        const bids = [0, 0];
        this.players().forEach((p, i) => {
            bids[i % 2] += p.bid!;
        });

        this.teamBids.set(bids);
        console.log("Team Bids:", bids);
    }

    // Method to end turn 
    endTurn(): void {
        const next = ((this.currentPlayersTurn() + 1) > (this.players().length-1)) ? 0 : this.currentPlayersTurn() + 1;

        // If a full round has completed
        if(next === this.currentRoundsLeader() && this.gameRounds() >= 1 && this.currentPot().length > 0) {
            const winner = this.determineRoundWinner();
            console.log('winner:', winner);

            this.players.update(players =>
                players.map(p => p.id === winner ? { ...p, score: p.handScore + 1 } : p)
            );

            // set new rounds first player to the winner
            this.currentRoundsLeader.set(this.players().indexOf(this.players().find(player => player.id === winner)!))
            this.currentPlayersTurn.set(this.currentRoundsLeader());

            // Update round info
            this.currentPot.set([]);
            this.gameRounds.update(r => r + 1);
            this.syncPublicState();
        } else if(this.gameRounds() === 0) {    // If players are bidding
            this.gameRounds.update(r => r + 1);
            this.currentPlayersTurn.set(next)
            this.syncPublicState();
        } else {
            this.currentPlayersTurn.set(next)
            this.syncPublicState();
        }
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
    syncPublicState(): void {
        const publicPlayers = this.players().map(({ hand, ...rest}) => rest);
        this.gameSocket.syncState(
            this.gameSocket.roomCode$.value!, 
            {
                started: true,
                players: publicPlayers,
                currentPlayersTurn: this.currentPlayersTurn(),
                currentRoundsLeader: this.currentRoundsLeader(),
                teamBids: this.teamBids(),
                gameRounds: this.gameRounds(),
                currentPot: this.currentPot(),
                isGameOver: this.isGameOver(),
            }
        );
    }

    determineCanThrow(cards: Card[], playerID: string): Array<boolean> {
        let allowCardThrow = Array<boolean>();
        let allowSpades = false;
        cards.map( (card, i) => {
            if(card.suit === this.currentPot().at(0)?.card.suit)
                allowCardThrow[i] = true;
            else if (this.allowSpades() && card.suit.name === 'Spades')
                allowCardThrow[i] = true;
            else 
                allowCardThrow[i] = false;
        })
        return allowCardThrow;
    }

    // Apply incoming state from server (players that arent host)
    private applyState(payload: any): void {

    if (payload.players && payload.players.length > 0) {
        const myId = this.gameSocket.socketId;
        const myHand = this.gameSocket.myHand$.value;

        this.players.update(current => {
            const base = current.length > 0 ? current : payload.players.map((p: any) => ({
                ...p, hand: [], bid: 0
            }));

            return payload.players.map((incoming: any) => {
                const existing = base.find((p: any) => p.id === incoming.id);
                return {
                    ...incoming,
                    hand: incoming.id === myId
                        ? (existing?.hand?.length > 0 ? existing.hand : myHand)
                        : [],
                };
            });
        });
    }

    if (payload.currentPlayersTurn !== undefined)
        this.currentPlayersTurn.set(payload.currentPlayersTurn);
    if (payload.currentRoundsLeader !== undefined)
        this.currentRoundsLeader.set(payload.currentRoundsLeader);
    if (payload.teamBids)
        this.teamBids.set(payload.teamBids);
    if (payload.gameRounds !== undefined)
        this.gameRounds.set(payload.gameRounds);
    if (payload.currentPot)
        this.currentPot.set(payload.currentPot);
    if (payload.isGameOver !== undefined)
        this.isGameOver.set(payload.isGameOver);
    }

    get potCards(): Card[] {
    return this.currentPot().map(entry => entry.card);
  }
}