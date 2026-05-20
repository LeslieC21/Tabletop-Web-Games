import { Card  } from "../constants/deck";

export interface PlayerModel {
    id: number;
    name: string;
    hand: Card[];
    score: number;
    bid?: number;
}