import { Card  } from "../constants/deck";

export interface PlayerModel {
    clientId: string;
    socketId: string;
    name: string;
    isHost: boolean;
    hand: Card[];
    score: number;
    handScore: number;
    bid?: number;
    showModal?: boolean;
}