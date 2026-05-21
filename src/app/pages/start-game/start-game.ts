import { Component, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { GameSocketService } from '../../core/ConnectionServices/GameSocketService';
import { PlayerModel } from '../../core/models/PlayerModel';
import { Game, GAME_RULES } from '../../core/constants/gameRules';
import { SpadesGameBoard } from '../spades/spades-game-board';

@Component({
  selector: 'app-start-game',
  imports: [RouterLink, CommonModule, FormsModule, SpadesGameBoard],
  templateUrl: './start-game.html',
  styleUrl: './start-game.css',
})
export class StartGame {
  gameTitle: Game =  'Blackjack';
  instructions = 'This is my body!';
  allowMultiplePlayers = false;
  showInstructions = signal<boolean>(false);

  playerName = '';
  joinCode = '';
  roomCode: string | null = null;
  players: PlayerModel[] = [];
  gameStarted = false;
  inRoom = signal<boolean>(false);
  amHost = false;
  myId = '';
  errorMsg = '';

    private subs = new Subscription();

  constructor(public gameSocket: GameSocketService, private route: ActivatedRoute) {
    this.gameTitle = this.route.snapshot.paramMap.get('game')! as Game;
    this.instructions = (GAME_RULES[this.gameTitle]).instructions;
    this.allowMultiplePlayers = (GAME_RULES[this.gameTitle]).allowMultiplayer;
  }

  ngOnInit(): void {
    this.gameSocket.connect();

    this.subs.add(
      this.gameSocket.connected$.subscribe(isConnected => {
        if (isConnected) {
          this.myId = this.gameSocket.socketId;
        }
      })
    );

    this.subs.add(
      this.gameSocket.roomCreated$.subscribe(({ roomCode, players }) => {
        this.roomCode = roomCode;
        this.players = players;
        this.inRoom.set(true);
        this.amHost = true;
      })
    );

    this.subs.add(
      this.gameSocket.roomJoined$.subscribe(({ roomCode, players, gameState }) => {
        this.roomCode = roomCode;
        this.players = players;
        this.gameStarted = gameState.started;
        this.inRoom.set(true);
        this.amHost = this.gameSocket.isHost(players);
      })
    );

    this.subs.add(
      this.gameSocket.players$.subscribe(players => {
        this.players = players;
        this.amHost = this.gameSocket.isHost(players);
      })
    );

    this.subs.add(
      this.gameSocket.gameStarted$.subscribe(() => {
        this.gameStarted = true;
      })
    );

    this.subs.add(
      this.gameSocket.error$.subscribe(msg => {
        this.errorMsg = msg;
        setTimeout(() => (this.errorMsg = ''), 3000);
      })
    );
  }

  createRoom(): void {
    this.gameSocket.createRoom(this.playerName);
  }

  joinRoom(): void {
    this.gameSocket.joinRoom(this.joinCode, this.playerName);
  }

  startGame(): void {
    if(this.roomCode) this.gameSocket.startGame(this.roomCode);
  }

  leaveRoom(): void {
    this.gameSocket.disconnect();
    this.gameSocket.connect();
    this.inRoom.set(false);
    this.roomCode = null;
    this.players = [];
    this.gameStarted = false;
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.gameSocket.disconnect();
  }
}
