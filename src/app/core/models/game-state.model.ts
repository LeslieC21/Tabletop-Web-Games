import { GameType } from "./game-type.model";

export interface BaseGameState {
    gameType: GameType;
    started: boolean;
    roundNumber: number,   
    currentTurnIndex: number;
    winner: number;
}

export interface BasePlayerState {
    socketId: string;
    name: string;
    isHost: boolean;
    score: number;
    ready: boolean;
}