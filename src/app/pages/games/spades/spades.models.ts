import { Card } from "../../../core/constants/deck";
import { BaseGameState, BasePlayerState } from "../../../core/models/game-state.model";

export interface SpadesGameState extends BaseGameState {
    started: boolean;
    phase: "waiting" | "bidding" | "playing" | "hand-complete" | "game-over" | "sudden-death" | "starting";
    players: SpadesPlayer[];
    dealerIndex: number,    
    currentTurnIndex: number,    
    currentTrick: Trick[],        
    spadesBroken: boolean,               
    winner: number,
}

export interface SpadesPlayer extends BasePlayerState {
    hand: Card[];
    handsize: number;
    bid: number;
    tricksWon: number;
    score: number;
    bags: number;
}

export interface Trick {
    card: Card;
    playerToMutate: string;
}