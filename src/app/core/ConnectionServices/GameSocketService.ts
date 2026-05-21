import { Injectable, OnDestroy, NgZone } from "@angular/core";
import { io, Socket } from 'socket.io-client'
import { BehaviorSubject, Subject } from "rxjs";

import { PlayerModel } from "../models/PlayerModel";
import { Card } from "../constants/deck";

// export interface Player {
//   id: string;
//   name: string;
//   isHost: boolean;
// }
 
export interface GameState {
  started: boolean;
  [key: string]: any;
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
}

export interface GameUpdatePayload {
    action: string;
    payload: any;
    from: string;
}

export interface StateSyncedPayload {
    gameState: GameState;
}

export interface ErrorPayload {
    message: string;
}

@Injectable({ providedIn: 'root'})

export class GameSocketService implements OnDestroy{
    public socket!: Socket;
    private readonly SERVER_URL = 'http://localhost:3000';

    // Public state streams
    players$ = new BehaviorSubject<PlayerModel[]>([]);
    gameState$ = new BehaviorSubject<GameState>({ started: false })
    roomCode$ = new BehaviorSubject<string | null>(null);
    connected$ = new BehaviorSubject<boolean>(false);
    error$ = new Subject<string>();

    // Event streams
    roomCreated$ = new Subject<RoomCreatedPayload>();
    roomJoined$ = new Subject<RoomJoinedPayload>();
    playerJoined$ = new Subject<PlayerJoinedPayload>();
    playerLeft$ = new Subject<PlayerLeftPayload>();
    gameStarted$ = new Subject<GameState>();
    gameUpdate$ = new Subject<GameUpdatePayload>();
    myHand$ = new Subject<Card[]>();
    stateSynced$ = new Subject<StateSyncedPayload>();

    constructor(private ngZone: NgZone) {}

    connect(): void {
        if (this.socket?.connected) return;

        this.socket = io(this.SERVER_URL, {
            transports: ['websocket'],
            autoConnect: true
        });

        this.ngZone.run(() => {
            this.socket.on('connect', () => {
                console.log('Connected to game server:', this.socket.id);
                this.connected$.next(true);
            });
        });

        this.ngZone.run(() => {
            this.socket.on('disconnect', () => {
                console.log('Disconnected from game server');
                this.connected$.next(false);
            });
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
        this.socket.emit('create-room', { playerName });
    }

    joinRoom(roomCode: string, playerName: string): void {
        this.socket.emit('join-room', {
            roomCode: roomCode.toUpperCase(), playerName
        });
    }

    startGame(roomCode: string): void {
        this.socket.emit('start-game', { roomCode })
    }

    // Game Actions
    sendAction(roomCode: string, action: string, payload: any): void {
        this.socket.emit('game-action', { 
            roomCode,
            action,
            payload
        });
    }

    dealHands(targetPlayerId: string, hand: Card[]): void {
        this.socket.emit('deal-hand', {
            targetPlayerId: targetPlayerId,
            hand
        })
    }

    syncState(roomCode: string, gameState: Partial<GameState>): void {
        this.socket.emit('sync-state', { 
            roomCode,
            gameState
        });
    }

    // Helpers
    get socketId(): string {
        return this.socket?.id ?? '';
    }

    isHost(players: PlayerModel[]): boolean {
        return players.find(p => p.id === this.socketId)?.isHost ?? false;
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

        this.socket.on('room-joined', ( data: RoomJoinedPayload) => {
            this.ngZone.run(() => {
                this.roomCode$.next(data.roomCode);
                this.players$.next(data.players);
                this.gameStarted$.next(data.gameState);
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
            this.ngZone.run(() => {
                this.players$.next(data.players);
                this.playerLeft$.next(data);
            });
        });

        this.socket.on('game-started', ({ gameState }: { gameState: GameState}) => {
            this.ngZone.run(() => {
                this.gameState$.next(gameState);
                this.gameStarted$.next(gameState);
            });
        });

        this.socket.on('game-update', (data: GameUpdatePayload) => {
            this.ngZone.run(() => {
                this.gameUpdate$.next(data);
            });
        });

        this.socket.on('deal-hand', ({ hand }: { hand: Card[] }) => {
            this.ngZone.run(() => {
                this.myHand$.next(hand);
            });
        });

        this.socket.on('state-synced', (data: StateSyncedPayload) => {
            this.ngZone.run(() => {
                this.gameState$.next(data.gameState);
                this.stateSynced$.next(data);
            });
        })

        this.socket.on('error', (data: ErrorPayload) => {
            this.ngZone.run(() => {
                console.error('Server error:', data.message);
                this.error$.next(data.message);
            });
        })
    }

    ngOnDestroy(): void {
        this.disconnect();
    }
}