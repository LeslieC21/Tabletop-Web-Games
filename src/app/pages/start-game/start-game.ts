import { ChangeDetectorRef, Component, effect, NgZone, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { createDefaultGameState, GameSocketService } from '../../core/ConnectionServices/GameSocketService';
import { PlayerModel } from '../../core/models/PlayerModel';
import { Game, GAME_RULES } from '../../core/constants/gameRules';
import { SpadesGameBoard } from '../spades/spades-game-board';
import { MarkdownPipe } from '../../core/OtherServices/MarkdownPipe';

@Component({
  selector: 'app-start-game',
  imports: [RouterLink, CommonModule, FormsModule, SpadesGameBoard, MarkdownPipe],
  templateUrl: './start-game.html',
  styleUrl: './start-game.css',
})
export class StartGame {
  gameTitle: Game =  'Blackjack';
  instructions = 'This is my body!';
  allowMultiplePlayers = false;
  showInstructions = signal<boolean>(false);
  showHostLeft = signal<string | null>(null);

  playerName = '';
  joinCode = '';
  roomCode: string | null = null;
  players = signal<PlayerModel[]>([]);
  gameStarted = signal<boolean>(false);
  inRoom = signal<boolean>(false);
  amHost = signal<boolean>(false);
  myId = '';
  clientId = '';
  errorMsg = '';

  private subs = new Subscription();

  constructor(
    public gameSocket: GameSocketService, 
    private route: ActivatedRoute, 
    private router: Router) {
    this.gameTitle = this.route.snapshot.paramMap.get('game')! as Game;
    this.instructions = (GAME_RULES[this.gameTitle]).instructions;
    this.allowMultiplePlayers = (GAME_RULES[this.gameTitle]).allowMultiplayer;
  }

  ngOnInit(): void {
    // Create a Client ID
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
        this.players.set(players);
        this.inRoom.set(true);
        this.amHost.set(true);
      })
    );

    this.subs.add(
      this.gameSocket.roomJoined$.subscribe(({ roomCode, players, gameState }) => {
        this.roomCode = roomCode;
        this.players.set(players);
        this.gameStarted.set(gameState.started);
        this.inRoom.set(true);
        this.amHost.set(this.gameSocket.isHost(players));
      })
    );
    

    this.subs.add(
      this.gameSocket.players$.subscribe(players => {
        this.players.set(players);
        console.log(players);
        this.amHost.set(this.gameSocket.isHost(players));
      })
    );

    this.subs.add(
      this.gameSocket.gameState$.subscribe((state) => { 
        console.log(state);
        this.gameStarted.set(state.started);
        this.players.set(state.players);
      })
    );

    this.subs.add(
      this.gameSocket.error$.subscribe(msg => {
        this.errorMsg = msg;
        setTimeout(() => (this.errorMsg = ''), 3000);
      })
    );

    this.subs.add(
      this.gameSocket.hostLeft$.subscribe(state => {
        if(state !== null) {
          // Disconect from lobby
          this.inRoom.set(false);
          this.roomCode = null;
          this.players.set([]);
          this.gameStarted.set(false);

          // Show modal that the host left
          this.showHostLeft.set(state);
          this.joinCode = '';
        }
      })
    )
  }

  createRoom(): void {
    this.gameSocket.createRoom(this.playerName);
  }

  joinRoom(): void {
    this.gameSocket.joinRoom(this.joinCode, this.playerName);
  }

  startGame(): void {
    if(this.roomCode) {
      this.gameSocket.startGame(this.roomCode);
    }
  }

  routeToHome(): void {
    this.showHostLeft.set(null);
    this.router.navigate(['/']);
  }

  resetGame(): void {
    this.gameStarted.set(false);
  }

  leaveRoom(): void {
    this.inRoom.set(false);
    this.roomCode = '';
    this.joinCode = '';
    this.gameSocket.gameState$.next(createDefaultGameState());
    this.gameSocket.leaveGame();
    this.resetGame();
  }

  closeHostLeftModal() {
    this.gameSocket.hostLeft$.next(null);
    this.showHostLeft.set(null);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.gameStarted.set(false);
    this.showHostLeft.set(null);
  }
}
