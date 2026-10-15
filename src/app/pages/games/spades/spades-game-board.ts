import { Component, signal, Output, EventEmitter, computed, Input, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Cards } from '../../../components/cards/cards';
// import { GameState, createDefaultGameState } from '../../../core/ConnectionServices/GameSocketService';
import { GameSocketService } from '../../../core/ConnectionServices/GameSocketService';
import { Card } from '../../../core/constants/deck';
import { SpadesGameState } from './spades.models';
import { SpadesGameService } from './SpadesGameService';

@Component({
  selector: 'app-spades-game-board',
  imports: [Cards, FormsModule],
  templateUrl: './spades-game-board.html',
  styleUrl: './spades-game-board.css',
})
export class SpadesGameBoard {
  @Input ({ required: true }) roomCode!: string;
  @Output() closeGame = new EventEmitter<void>();
  @Output() resetGame = new EventEmitter<void>();

  spadesService = inject(SpadesGameService);

  currentGameState = signal<SpadesGameState | null>(null);
  myOldGameState = signal<SpadesGameState | null>(null);
    currentTurnId = computed(() => {
      let s = this.currentGameState()!.currentTurnIndex;
      return this.currentGameState()!.players.at(s)?.socketId;
    })
    myPlayer = computed(() => {
      let s =  this.gameSocket.socketId;
      return this.currentGameState()!.players.find(p => p.socketId == s);
    })
    myHand = computed(() => {
      return this.myPlayer()!.hand as Card[];
    });

    selectedCard = signal<Card | null>(null);
    showScoreModal = signal<boolean>(false);
    showBidModal = signal<boolean>(false);
  
    constructor(private gameSocket: GameSocketService) {
      this.spadesService.state$.subscribe((state) => {

        if(state.phase === "hand-complete" || state.phase === "game-over" || state.phase === "sudden-death") {
          this.showScoreModal.set(true);
        } else if(this.showScoreModal() && state.phase === "bidding") {
          this.showScoreModal.set(false);
        }

        if(state.phase !== this.currentGameState()!.phase && state.phase === "game-over" || state.phase === "sudden-death") {
          this.myOldGameState.set(state);
        }

        this.currentGameState.update(s => ({ ...state }));
        this.selectedCard.set(null);

        if(this.currentGameState()!.phase == "bidding"&& 
          this.myPlayer()?.bid == -1 && 
          this.currentTurnId() === this.myId) {
          this.showBidModal.set(true);
        } 
      });
    }

    get myId(): string {
      return this.gameSocket.socketId;
    }

  leaveGame() {
    this.showScoreModal.set(false);
    this.closeGame.emit();
  }

  playAgain() {
    this.gameSocket.sendAction(this.roomCode, 'mark-ready', {});
    this.resetGame.emit();
  }

  setPlayerBid() {
    const playerBid = Number((document.getElementById('playerBid') as HTMLInputElement).value);
    
    // Send value of the bid to the server
    this.gameSocket.sendAction(this.roomCode, 'submit-playerBid', { bid: playerBid });
    this.myOldGameState.set(this.currentGameState());
    this.showBidModal.set(false);
  }

  selectCard(event: Event, card: Card) {
    this.selectedCard.set(card);
    console.log(this.selectedCard())
  }

  isSelected(card: Card): boolean {
    const selected = this.selectedCard();
    if(!selected)
      return false;

    return selected.rank === card.rank && selected.suit.name === card.suit.name;
  }

  playCard() {
    this.gameSocket.sendAction(this.roomCode, 'play-card', { card: this.selectedCard() })
  }

  playNewHand() {
    this.showScoreModal.set(false);
    if(this.myPlayer()!.isHost) {
      this.gameSocket.sendAction(this.roomCode, 'new-hand', {});
    }
  }
}
