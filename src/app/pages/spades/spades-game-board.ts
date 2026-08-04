import { Component, effect, inject, signal, Output, EventEmitter, computed, Input, NgZone } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { Cards } from '../../components/cards/cards';
// import { SpadesService } from '../../core/GameServices/spades';
import { GameState, createDefaultGameState } from '../../core/ConnectionServices/GameSocketService';
import { GameSocketService } from '../../core/ConnectionServices/GameSocketService';
import { Card } from '../../core/constants/deck';
import { reset } from 'canvas-confetti';

@Component({
  selector: 'app-spades-game-board',
  imports: [Cards, FormsModule],
  templateUrl: './spades-game-board.html',
  styleUrl: './spades-game-board.css',
})
export class SpadesGameBoard {
  @Input ({ required: true }) roomCode!: string;
  @Output() closeGame = new EventEmitter<void>();

  currentGameState = signal<GameState>(createDefaultGameState());
    currentTurnId = computed(() => {
      let s = this.currentGameState().currentTurnIndex;
      return this.currentGameState().players.at(s)?.clientId;
    })
    myPlayer = computed(() => {
      let s =  this.gameSocket.getClientId();
      return this.currentGameState().players.find(p => p.clientId == s);
    })
    myHand = computed(() => {
      return this.myPlayer()!.hand;
    });

    selectedCard = signal<Card | null>(null);
    myOldScore = signal<number>(0);
    showScoreModal = signal<boolean>(false);
  
    constructor(private gameSocket: GameSocketService) {
      this.gameSocket.gameState$.subscribe((state) => {
        console.log("Game State Updated to: ");
        console.log(state);
        if(state.phase === "hand-complete") {
          // Keep Old game state to display to modal
          this.showScoreModal.set(true);

          // MOVE THIS TO ITS OWN FUNC
          // // Continue the game while modal is open
          // this.gameSocket.sendAction(this.roomCode, 'new-hand', {});
        }
        this.currentGameState.update(s => ({ ...state }));
        this.selectedCard.set(null);
      });
    }

    get myId(): string {
      return this.gameSocket.getClientId();
    }

  leaveGame() {
    this.closeGame.emit();
  }

  setPlayerBid() {
    const playerBid = (document.getElementById('playerBid') as HTMLInputElement).value;

    // Send value of the bid to the server
    this.gameSocket.sendAction(this.roomCode, 'submit-playerBid', { bid: playerBid });
    this.myOldScore.set(this.myPlayer()?.score!);
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
}
