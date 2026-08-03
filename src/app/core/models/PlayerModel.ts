import { Card  } from "../constants/deck";

export interface PlayerModel {
    clientId: string;
    socketId: string;
    name: string;
    isHost: boolean;
    hand: Card[];
    handSize: number;
    bid: number;
    tricksWon: number;
    score: number;
    bags: number;
}