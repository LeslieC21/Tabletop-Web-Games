import { CatanCards } from "../../pages/games/catan/catan.models";
import { Card  } from "../constants/deck";
import { ResourceType } from "./CatanModels";

export interface PlayerModel {
    socketId: string;
    name: string;
    isHost: boolean;
    hand: Card[] | CatanCards[];
    handSize: number;
    bid: number;
    tricksWon: number;  // Resets each hand
    score: number;      // Running score across each hand
    bags: number;       // An Extra trick won ABOVE your teams bid. This runs across all hands.
    ready: boolean;
}

export interface Player {
    socketId: string;
    name: string;
    isHost: boolean;
    ready: boolean;
}

export interface CatanPlayer extends Player {
    hand: ResourceType[];
}

export interface SpadesPlayer extends Player {
    hand: Card[];
    handsize: number;
    bid: number;
    tricksWon: number;
    score: number;
    bags: number;
}