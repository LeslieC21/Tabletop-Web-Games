import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Cards } from '../../components/cards/cards';
import { SpadesService } from '../../core/GameServices/spades';
import { Player } from '../../components/player/player';
import { GameSocketService } from '../../core/ConnectionServices/GameSocketService';

@Component({
  selector: 'app-spades-game-board',
  imports: [RouterLink, Cards],
  templateUrl: './spades-game-board.html',
  styleUrl: './spades-game-board.css',
})

export class SpadesGameBoard {
  SpadesService = inject(SpadesService);
  gameSocket = inject(GameSocketService);
  
  currentPlayer = this.SpadesService.currentPlayersTurn;
  playerName = this.SpadesService.players().at(this.currentPlayer())!.name;
  gameRound = this.SpadesService.gameRounds;
  selectedCard: number | null = (null);
  showBidModal = signal<boolean>(false);
  submittedBid = signal<boolean>(false);

  constructor() {
    effect(() => {
      if(this.gameRound() === 0 && this.currentPlayer() === 1) {
        setTimeout(() => {
          // Prompt the user to select their bid!
          this.showBidModal.set(true);
        }, 5000)
      }
    })
  }

  restartGame() {
    
  }

  setPlayerBid() {
    this.showBidModal.set(false);
    this.submittedBid.set(true);

    const playerBid = document.getElementById('bid') as HTMLInputElement;
    this.SpadesService.setPlayerBid(parseInt(playerBid.value));
  }

  selectCard(event: Event, cardIndex: number) {
    event.preventDefault();

    // Check if we have a card already selected
    if(this.selectedCard != null) {
      const priorCardSelected = document.getElementById(`playerCard${this.selectedCard}`) as HTMLElement;
      priorCardSelected.classList.remove('selectedCard')
    }

    this.selectedCard = cardIndex;
    console.log(this.selectedCard);

    const selectedCard = document.getElementById(`playerCard${cardIndex}`) as HTMLElement;
    selectedCard.classList.add('selectedCard');
  }

  ngOnInit() {
    this.SpadesService.dealDeck();
  }
}
