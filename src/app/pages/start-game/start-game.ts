import { Component, ComponentRef, computed, effect, ElementRef, HostListener, signal, Type, viewChild, ViewContainerRef } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, fromEvent, merge, debounceTime, tap, filter } from 'rxjs';

import { createDefaultGameState, GameSocketService, ChatMessage } from '../../core/ConnectionServices/GameSocketService';
import { PlayerModel } from '../../core/models/PlayerModel';
import { Game, GAME_METADATA } from '../../core/constants/gameRules';
import { MarkdownPipe } from '../../core/OtherServices/MarkdownPipe';
import { GAME_BOARD_REGISTRY } from '../../core/constants/gameRules';
import { GameBoardComponent } from '../../core/models/GameBoardComponents';
import { SUITS, RANK_VALUES } from '../../core/constants/deck';

@Component({
  selector: 'app-start-game',
  imports: [RouterLink, CommonModule, FormsModule, MarkdownPipe],
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
  chatMessages = signal<ChatMessage[]>([]);
  gameStarted = signal<boolean>(false);
  inRoom = signal<boolean>(false);
  amHost = signal<boolean>(false);
  hideChat = signal<boolean>(true);
  myId = '';
  errorMsg = '';

  cardNumber = Math.floor(Math.random() * (13)) + 1;
  cardSuit = SUITS[Math.floor(Math.random() * 3)].imageUrl;

  gameComponent: Type<GameBoardComponent> | null;
  gameInputs = signal<{ roomCode: string } | null>(null);
  gameOutletRef = viewChild('gameOutlet', { read: ViewContainerRef });
  private currentGameRef: ComponentRef<GameBoardComponent> | null = null;

  private subs = new Subscription();
  chatBoxEle = viewChild<ElementRef>('chatBoxContainer');
  @HostListener('window:beforeunload', ['$event'])
  handleTabClose(event: BeforeUnloadEvent) {
    this.gameSocket.leaveGame();
    this.gameSocket.disconnect();
  }

  @HostListener('window:keydown.shift.enter', ['$event'])
  handleKeyDown(event: KeyboardEvent | Event) {
    // Ensure we arent focused in the chat box
    if(this.inRoom())
      this.hideChat.update(c => !c);

    // If we are opening the chat box - set the scroll to the bottom
    if(!this.hideChat()) {
      setTimeout(() => {
        const scrollContainer = document.querySelector('.chat-messages');
        const inputElement = document.getElementById('chat-box');
        scrollContainer!.scrollTop = scrollContainer!.scrollHeight;
        inputElement?.focus();
      }, 1)
    }
  }

  @HostListener('window:click', ['$event'])
  handleClick(event: MouseEvent | Event ) {
      const scrollContainer = document.getElementById('chat-box-container');
      if(!scrollContainer?.contains(event.target as Node))
        this.hideChat.set(true);
  }

  constructor(
    public gameSocket: GameSocketService, 
    private route: ActivatedRoute, 
    private router: Router
  ) {
    this.gameTitle = this.route.snapshot.paramMap.get('game')! as Game;
    console.log(this.gameTitle);
    this.instructions = (GAME_METADATA[this.gameTitle]).instructions;
    this.allowMultiplePlayers = (GAME_METADATA[this.gameTitle]).allowMultiplayer;
    this.gameComponent = GAME_BOARD_REGISTRY[this.gameTitle] ?? null;

    effect(() => {
      const container = this.gameOutletRef();
      const started = this.gameStarted();

      if (container && started && this.gameComponent && this.gameInputs()) {
        this.mountGameComponent(container);
      } else if (!started) {
        this.currentGameRef?.destroy();
        this.currentGameRef = null;
      }
    })

    effect(() => {
      const elementRef = this.chatBoxEle();
      if(elementRef) {
        let el = elementRef.nativeElement;
        let isHovering = true;

        const enter$ = fromEvent(el, 'pointerenter').pipe(
          tap(() => { isHovering = true; })
        );
        const exit$ = fromEvent(el, 'pointerleave').pipe(
          tap(() => { isHovering = false; })
        );

        this.subs.add(
          merge(
            fromEvent(el, 'click'), 
            fromEvent(el, 'mousemove'), 
            fromEvent(el, 'keydown'),
            fromEvent(el, 'pointerover'),
            enter$,
            exit$
            )
          .pipe(
            tap(() => this.hideChat.set(false)),
            debounceTime(4000),
            filter(() => !isHovering)
          )
          .subscribe(() => {
            this.hideChat.set(true)
          })
        )
      }
    })
  }

  private mountGameComponent(container: ViewContainerRef) {
    if (this.currentGameRef) return;  // Already mounted

    container.clear();
    const ref = container.createComponent(this.gameComponent!);

    ref.setInput('roomCode', this.gameInputs()!.roomCode);

    this.subs.add(ref.instance.closeGame?.subscribe(() => this.leaveRoom()));
    this.subs.add(ref.instance.resetGame?.subscribe(() => this.resetGame()));

    this.currentGameRef = ref;
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
        this.gameInputs.set({roomCode: roomCode });
        this.players.set(players);
        this.inRoom.set(true);
        this.amHost.set(true);
      })
    );

    this.subs.add(
      this.gameSocket.roomJoined$.subscribe(({ roomCode, players, gameState }) => {
        this.roomCode = roomCode;
        this.gameInputs.set({ roomCode: roomCode });
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

    this.subs.add(
      this.gameSocket.chatMessages$.subscribe(newMsg => {
        this.chatMessages.update(msgs => [...msgs, newMsg]);
        this.hideChat.set(false);
      })
    )
  }

  createRoom(): void {
    this.gameSocket.createRoom(this.playerName, this.gameTitle.toLowerCase());
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
    this.leaveRoom();
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

  sendMessage(input: HTMLInputElement) {
    // Check that the input isn't empty
    const msg = input.value;
    if(msg == "") return;

    const msgPayload = {
      from: this.playerName,
      message: msg
    }
    this.gameSocket.sendMessage(this.roomCode!, msgPayload);
    input.value = "";
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.currentGameRef?.destroy();
    this.gameStarted.set(false);
    this.showHostLeft.set(null);
  }
}
