import { Card  } from "../constants/deck";

export interface PlayerModel {
    id: string;
    name: string;
    isHost: boolean;
    hand: Card[];
    score: number;
    handScore: number;
    bid?: number;
}