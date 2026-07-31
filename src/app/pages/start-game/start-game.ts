import { ChangeDetectorRef, Component, effect, NgZone, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { GameSocketService } from '../../core/ConnectionServices/GameSocketService';
import { PlayerModel } from '../../core/models/PlayerModel';
import { Game, GAME_RULES } from '../../core/constants/gameRules';
import { SpadesGameBoard } from '../spades/spades-game-board';
import { MarkdownPipe } from '../../core/OtherServices/MarkdownPipe';
import { StoreService } from '../../core/GameServices/Store';

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
    private cdr: ChangeDetectorRef, 
    private router: Router,
    private store: StoreService) {
    this.gameTitle = this.route.snapshot.paramMap.get('game')! as Game;
    this.instructions = (GAME_RULES[this.gameTitle]).instructions;
    this.allowMultiplePlayers = (GAME_RULES[this.gameTitle]).allowMultiplayer;
    this.clientId = store.getClientId();
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
        // console.log('roomCreated$ fired, roomCode:', roomCode);
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
        this.amHost.set(this.gameSocket.isHost(players));
      })
    );

    this.subs.add(
      this.gameSocket.gameState$.subscribe((state) => { 
        // console.log('gameState$ received:', state);
        this.gameStarted.set(state.started);
        this.cdr.markForCheck();
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
          console.log("HostLeft fired");
          this.showHostLeft.set(state);
          console.log(this.showHostLeft());
          this.joinCode = '';
        }
      })
    )
  }

  createRoom(): void {
    this.gameSocket.createRoom(this.playerName, this.clientId);
  }

  joinRoom(): void {
    this.gameSocket.joinRoom(this.joinCode, this.playerName, this.clientId);
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
    this.joinCode = '';
    this.roomCode = null;
    this.players.set([]);
    this.gameStarted.set(false);
    this.inRoom.set(false);
    this.amHost.set(false);
  }

  leaveRoom(): void {
    this.gameSocket.leaveGame(this.clientId);
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
