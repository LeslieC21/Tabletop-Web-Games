import { Component, inject } from '@angular/core';
import { BlackJackService } from '../../core/GameServices/blackjack';

import { Card } from '../../core/constants/deck';
import { Cards } from '../cards/cards';

@Component({
  selector: 'app-player',
  imports: [Cards],
  templateUrl: './player.html',
  styleUrl: './player.css',
})
export class Player {
  BService = inject(BlackJackService);

  cards: Card[] = this.BService.players().at(0)!.hand
}
