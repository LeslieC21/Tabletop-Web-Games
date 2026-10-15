import { Card  } from "../constants/deck";
import { ResourceType } from "./CatanModels";

export interface PlayerModel {
    name: string;
    hand: Card[];
    score: number;
}