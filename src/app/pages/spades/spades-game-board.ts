import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { Cards } from '../../components/cards/cards';
import { SpadesService } from '../../core/GameServices/spades';
import { GameSocketService } from '../../core/ConnectionServices/GameSocketService';
import { Card } from '../../core/constants/deck';

@Component({
  selector: 'app-spades-game-board',
  imports: [RouterLink, Cards, FormsModule],
  templateUrl: './spades-game-board.html',
  styleUrl: './spades-game-board.css',
})

export class SpadesGameBoard {
  SpadesService = inject(SpadesService);
  gameSocket = inject(GameSocketService);

  selectedCard = signal<Card | null>(null);
  showBidModal = signal<boolean>(false);
  submittedBid = signal<boolean>(false);
  playerBid = 0;

  get myId(): string {
    return this.gameSocket.socketId;
  }

  get myPlayerIndex(): number {
    return this.SpadesService.players()
      .findIndex(p => p.id === this.myId);
  }

  get isMyTurn(): boolean {
    return this.SpadesService.currentPlayersTurn() === this.myPlayerIndex;
  }

  get myHand(): Card[] {
    return this.SpadesService.players()
      .find(p => p.id === this.myId)?.hand ?? [];
  }

  get myPlayer() {
    return this.SpadesService.players()
      .find(p => p.id === this.myId);
  }

  getTeamBid(): number {
    return this.SpadesService.teamBids().at((this.gameSocket.players$.value.indexOf(this.myPlayer!)) % 2) ?? 0;
  }

  constructor() {
    effect(() => {
      const round = this.SpadesService.gameRounds();
      if(round === 0 && !this.submittedBid()) {
        setTimeout(() => {
          // Prompt the user to select their bid!
          this.showBidModal.set(true);
        }, 5000)
      }
    });
  }

  ngOnInit() {
        console.log('myId:', this.myId);
        console.log('isHost:', this.gameSocket.isHost(this.gameSocket.players$.value));
        console.log('SpadesService.players():', this.SpadesService.players());

        if (this.gameSocket.isHost(this.gameSocket.players$.value)) {
            this.SpadesService.initPlayers();
            this.SpadesService.dealDeck();
            this.SpadesService.syncPublicState();
        }
  }

  restartGame() {
    
  }

  setPlayerBid() {
    this.showBidModal.set(false);
    this.submittedBid.set(true);
    this.SpadesService.setPlayerBid(this.playerBid);
  }

  selectCard(event: Event, card: Card) {
    event.preventDefault();
    this.selectedCard.set(card);
  }

  isSelected(card: Card): boolean {
    const selected = this.selectedCard();
    if(!selected) return false;
    return selected.rank === card.rank && selected.suit.name === card.suit.name
  }

  playCard() {
    if(!this.selectedCard() || !this.isMyTurn) return;

    this.SpadesService.playCard(this.selectedCard()!, this.myId);
    this.selectedCard.set(null);
  }
}
