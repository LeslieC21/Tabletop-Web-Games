import { Component, effect, ElementRef, HostListener, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, fromEvent, merge, debounceTime, tap, filter } from 'rxjs';

import { createDefaultGameState, GameSocketService, ChatMessage } from '../../core/ConnectionServices/GameSocketService';
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
  chatMessages = signal<ChatMessage[]>([]);
  gameStarted = signal<boolean>(false);
  inRoom = signal<boolean>(false);
  amHost = signal<boolean>(false);
  hideChat = signal<boolean>(true);
  myId = '';
  clientId = '';
  errorMsg = '';

  private subs = new Subscription();
  chatBoxEle = viewChild<ElementRef>('chatBoxContainer');
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
    this.instructions = (GAME_RULES[this.gameTitle]).instructions;
    this.allowMultiplePlayers = (GAME_RULES[this.gameTitle]).allowMultiplayer;

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

    this.subs.add(
      this.gameSocket.chatMessages$.subscribe(newMsg => {
        this.chatMessages.update(msgs => [...msgs, newMsg]);
        this.hideChat.set(false);
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
    this.gameStarted.set(false);
    this.showHostLeft.set(null);
  }
}
