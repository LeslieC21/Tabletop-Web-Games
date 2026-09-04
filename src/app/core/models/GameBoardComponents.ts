import { EventEmitter } from "@angular/core";

export interface GameBoardComponent {
    roomCode: string;
    closeGame: EventEmitter<void>;
    resetGame: EventEmitter<void>;
}