import { Component, inject, effect } from '@angular/core';
import { RouterLink } from '@angular/router'
import confetti from 'canvas-confetti';

import { BlackJackService } from '../../core/GameServices/blackjack';
import { Player } from '../../components/player/player';
import { Cards } from '../../components/cards/cards';

@Component({
  selector: 'app-game-board',
  imports: [Player, Cards, RouterLink],
  templateUrl: './blackjack-game-board.html',
  styleUrl: './blackjack-game-board.css',
})
export class BlackJackGameBoard {
  BlackJackService = inject(BlackJackService);
  currentPlayer = this.BlackJackService.currentPlayersTurn;
  winner = {
    winner: '',
    message: ''
  };

  constructor() {
    effect(() => {
      if(this.currentPlayer() > this.BlackJackService.players().length - 1) {
        this.winner = this.BlackJackService.determineWinner();
        if(this.winner.winner == 'Player') {
          this.launchConfetti();
        }
      }
    })
  }

  launchConfetti() {
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.6 }
    });
  }

  playerHit() {
    this.BlackJackService.playerHit();
  }

  playerStand() {
    this.BlackJackService.endTurn();
    this.currentPlayer = this.BlackJackService.currentPlayersTurn;
  }

  restartGame() {
    // Reset winner
    this.winner = {
      winner: '',
      message: ''
    }

    this.BlackJackService.resetGame();
  }

 ngOnInit() {
  this.BlackJackService.dealDeck();
 }
}
