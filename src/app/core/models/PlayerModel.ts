import { Card  } from "../constants/deck";

export interface PlayerModel {
    clientId: string;
    socketId: string;
    name: string;
    isHost: boolean;
    hand: Card[];
    handSize: number;
    bid: number;
    tricksWon: number;  // Resets each hand
    score: number;      // Running score across each hand
    bags: number;       // An Extra trick won ABOVE your teams bid. This runs across all hands.
    ready: boolean;
}