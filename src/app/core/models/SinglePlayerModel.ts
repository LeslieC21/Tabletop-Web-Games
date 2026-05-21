import { Card  } from "../constants/deck";

export interface PlayerModel {
    name: string;
    hand: Card[];
    score: number;
}