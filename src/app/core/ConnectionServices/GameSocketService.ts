import { Injectable, OnDestroy, NgZone, HostListener } from "@angular/core";
import { io, Socket } from 'socket.io-client'
import { BehaviorSubject, Subject } from "rxjs";

import { PlayerModel } from "../models/PlayerModel";
import { Card } from "../constants/deck";
 
export interface GameState {
  started: boolean;
  phase: "waiting" | "bidding" | "playing" | "hand-complete" | "game-over" | "sudden-death";
  players: PlayerModel[];
  dealerIndex: number,          // whose turn it is to deal — rotates each hand
  currentTurnIndex: number,     // index into players[] — whose turn to bid/play
  currentTrick: Trick[],             // cards played so far this trick: [{ playerId, card }]
  tricksPlayed: number,         // how many tricks completed this hand (0–13)
  spadesBroken: boolean,        // has a spade been played yet this hand
  roundNumber: number,           // which hand of the overall game this is
  winner: PlayerModel | null
}

export function createDefaultGameState(): GameState {
    return {
        started: false,
        phase: "waiting",
        players: [],
        dealerIndex: 0,
        currentTurnIndex: 0,
        currentTrick: [],
        tricksPlayed: 0,
        spadesBroken: false,
        roundNumber: 1,
        winner: null
    }
}

export interface Trick {
    card: Card;
    playerToMutate: string;
}

export interface HandDealtPayload {
    hand: Card[];
    gameState: GameState;
}

export interface RoomCreatedPayload {
    roomCode: string;
    players: PlayerModel[];
}

export interface RoomJoinedPayload {
    roomCode: string;
    players: PlayerModel[];
    gameState: GameState;
}

export interface PlayerJoinedPayload {
    players: PlayerModel[];
    newPlayer: {
        id: string;
        name: string;
    }
}

export interface PlayerLeftPayload {
    players: PlayerModel[];
    playerName: string;
    gameState: GameState;
}

export interface HostLeftPayload {
    hostLeft: { clientId: string };
    gameState: GameState;
}

export interface GameUpdatePayload {
    action: string;
    gameState: GameState;
    from: string;
}

export interface ChatMessage {
    from: string;
    message: string;
}

export interface ErrorPayload {
    message: string;
}

@Injectable({ providedIn: 'root'})

export class GameSocketService implements OnDestroy{
    public socket!: Socket;
    private readonly SERVER_URL = 'http://localhost:3000';

    @HostListener('window:beforeunload', ['$event'])
    unloadHandler(event: Event) {
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    // Public state streams
    players$ = new BehaviorSubject<PlayerModel[]>([]);
    gameState$ = new BehaviorSubject<GameState>(createDefaultGameState());
    roomCode$ = new BehaviorSubject<string | null>(null);
    connected$ = new BehaviorSubject<boolean>(false);
    hostLeft$ = new BehaviorSubject<string | null>(null);
    myHand$ = new BehaviorSubject<Card[]>([]);
    chatMessages$ = new Subject<ChatMessage>();
    error$ = new Subject<string>();

    // Event streams
    roomCreated$ = new Subject<RoomCreatedPayload>();
    roomJoined$ = new Subject<RoomJoinedPayload>();
    playerJoined$ = new Subject<PlayerJoinedPayload>();
    playerLeft$ = new Subject<PlayerLeftPayload>();
    gameUpdate$ = new Subject<GameUpdatePayload>();

    protected readonly clientId: string;
    constructor(private ngZone: NgZone) {
        const existingId = localStorage.getItem("clientId")
        if(existingId) {
            this.clientId = existingId;
        } else {
            this.clientId = crypto.randomUUID();
            localStorage.setItem("clientId", this.clientId);
        }
    }

    getClientId(): string {
        return this.clientId;
    }

    connect(): void {
        if (this.socket) return;

        this.socket = io(this.SERVER_URL, {
            transports: ['websocket', 'polling'],
            withCredentials: true,
            autoConnect: true,
            forceNew: true,
            multiplex: false
        });

            this.socket.on('connect', () => {
                this.connected$.next(true);
            });

            this.socket.on('disconnect', () => {
                this.connected$.next(false);
            });

        this.registerEvents();
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    // Room Actions
    createRoom(playerName: string): void {
        let clientId = this.clientId;
        this.socket.emit('create-room', { playerName, clientId });
    }

    joinRoom(roomCode: string, playerName: string): void {
        let clientId = this.clientId;
        this.socket.emit('join-room', {
            roomCode: roomCode.toUpperCase(), 
            playerName,
            clientId
        });
    }

    startGame(roomCode: string): void {
        this.socket.emit('start-game', { roomCode })
    }

    leaveGame(): void {
        let clientId = this.getClientId();
        console.log("Attempting to leave game... " + clientId);
        this.socket.emit('leave-game', { clientId })
    }

    // Game Actions
    sendAction(roomCode: string, action: string, payload: any): void {
        let clientId = this.clientId;
        this.socket.emit('game-action', { 
            roomCode,
            action,
            clientId,
            payload
        });
    }

    sendMessage(roomCode: string, payload: any): void {
        this.socket.emit('sent-message', {
            roomCode,
            payload
        })
    }

    // Helpers
    get socketId(): string {
        return this.socket?.id ?? '';
    }

    isHost(players: PlayerModel[]): boolean {
        return players.find(p => p.socketId === this.socketId)?.isHost ?? false;
    }

    // Private: register all server events
    private registerEvents(): void {
        this.socket.on('room-created', ( data: RoomCreatedPayload) => {
            this.ngZone.run(() => {
                this.roomCode$.next(data.roomCode);
                this.players$.next(data.players);
                this.roomCreated$.next(data);
            });
        })

        this.socket.on('host-left', ( data: HostLeftPayload) => {
                this.hostLeft$.next(data.hostLeft.clientId);
                this.gameState$.next(data.gameState);
                console.log(data);
        })

        this.socket.on('room-joined', ( data: RoomJoinedPayload) => {
            this.ngZone.run(() => {
                this.roomCode$.next(data.roomCode);
                this.players$.next(data.players);
                this.gameState$.next(data.gameState);
                this.roomJoined$.next(data);
            });
        })

        this.socket.on('player-joined', ( data: PlayerJoinedPayload) => {
            this.ngZone.run(() => {
                this.players$.next(data.players);
                this.playerJoined$.next(data);
            });
        });

        this.socket.on('player-left', (data: PlayerLeftPayload) => {
            console.log("player-left");
                this.players$.next(data.players);
                this.playerLeft$.next(data);
                this.gameState$.next(data.gameState);
        });

        this.socket.on('hand-dealt', ({ gameState, hand }: HandDealtPayload) => {
            this.ngZone.run(() => {
                this.myHand$.next(hand);
                this.gameState$.next(gameState);
            });
        });

        this.socket.on('game-update', (data: GameUpdatePayload) => {
            this.gameState$.next(data.gameState);
        });

        this.socket.on('deal-hand', ({ hand }: { hand: Card[] }) => {
            this.ngZone.run(() => {
                this.myHand$.next(hand);
            });
        });

        this.socket.on('error', (data: ErrorPayload) => {
            console.error('Server error:', data.message);
            this.error$.next(data.message);
        })

        this.socket.on('new-message', (data: ChatMessage) => {
            this.chatMessages$.next(data);
        })
    }

    ngOnDestroy(): void {
        this.leaveGame();
        this.disconnect();
    }
}