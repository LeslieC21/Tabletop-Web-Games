import { Injectable, OnDestroy, NgZone, HostListener } from "@angular/core";
import { io, Socket } from 'socket.io-client'
import { BehaviorSubject, filter, Observable, Subject } from "rxjs";

import { Card } from "../constants/deck";
import { GameState } from "../models/game-type.model";
import { BaseGameState, BasePlayerState } from "../models/game-state.model";

export type GameType = 'spades' | 'catan';

export interface HandDealtPayload {
    hand: Card[];
    gameState: GameState;
}

export interface RoomCreatedPayload {
    roomCode: string;
    players: BasePlayerState[];
}

export interface RoomJoinedPayload {
    roomCode: string;
    players: BasePlayerState[];
    gameState: GameState;
}

export interface PlayerJoinedPayload {
    players: BasePlayerState[];
    newPlayer: {
        id: string;
        name: string;
    }
}

export interface PlayerLeftPayload {
    players: BasePlayerState[];
    playerName: string;
    gameState: GameState;
}

export interface HostLeftPayload {
    hostLeft: { socketId: string };
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
    players$ = new BehaviorSubject<BasePlayerState[]>([]);
    gameState$ = new BehaviorSubject<BaseGameState | null>(null);
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

    constructor(private ngZone: NgZone) {}

    selectState<T extends GameState>(type: T['gameType']): Observable<T> {
        return this.gameState$.pipe(
            filter((s): s is T => s !== null && s.gameType === type)
        )
    }

    fromEvent<T>(event: string): Observable<T> {
        return new Observable<T>((subscriber) => {
            // const handler = (data: T) => this.ngZone.run(() => subscriber.next(data));
            this.socket.on(event, (data) => {
                this.gameState$.next(data);
            });
            // return () => this.socket.off(event, handler);
        })
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
    createRoom(playerName: string, gameType: string): void {
        this.socket.emit('create-room', { playerName, gameType });
    }

    joinRoom(roomCode: string, playerName: string): void {
        this.socket.emit('join-room', {
            roomCode: roomCode.toUpperCase(), 
            playerName
        });
    }

    startGame(roomCode: string): void {
        this.socket.emit('start-game', { roomCode })
    }

    leaveGame(): void {
        console.log("Attempting to leave game... " + this.socket.id);
        const socketId = this.socket.id;
        this.socket.emit('leave-game', { socketId })
    }

    // Game Actions
    sendAction(roomCode: string, action: string, payload: any): void {
        let socketId = this.socket.id;
        this.socket.emit('game-action', { 
            roomCode,
            action,
            socketId,
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

    isHost(players: BasePlayerState[]): boolean {
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
                this.hostLeft$.next(data.hostLeft.socketId);
                this.gameState$.next(data.gameState);
                console.log("HOST LEFT");
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

        this.socket.on('game-update', (data) => {
            console.log(data);
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