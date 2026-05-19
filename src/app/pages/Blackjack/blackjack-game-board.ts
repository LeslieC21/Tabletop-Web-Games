import { Component, inject, effect, signal } from '@angular/core';
import { RouterLink } from '@angular/router'
import confetti from 'canvas-confetti';

import { BlackJackService } from '../../core/GameServices/blackjack';
import { Cards } from '../../components/cards/cards';

@Component({
  selector: 'app-game-board',
  imports: [Cards, RouterLink],
  templateUrl: './blackjack-game-board.html',
  styleUrl: './blackjack-game-board.css',
})
export class BlackJackGameBoard {
  BlackJackService = inject(BlackJackService);
  currentPlayer = this.BlackJackService.currentPlayersTurn;
  showWinner = signal<boolean>(false);
  winner = {
    winner: '',
    message: ''
  };

  constructor() {
    effect(() => {
      if(this.currentPlayer() > this.BlackJackService.players().length - 1) {
        this.winner = this.BlackJackService.determineWinner();
        setTimeout(() => {
        this.showWinner.set(true);
        if(this.winner.winner == 'Player') {
            this.launchConfetti();
          }
        }, 2800)
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
    this.showWinner.set(false)
    this.winner = {
      winner: '',
      message: ''
    }

    this.BlackJackService.resetGame();
  }

 ngOnInit() {
  this.restartGame();
 }
}
