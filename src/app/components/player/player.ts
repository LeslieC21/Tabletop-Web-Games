import { Component, effect, inject } from '@angular/core';
import { BlackJackService } from '../../core/GameServices/blackjack';

import { Card } from '../../core/constants/deck';
import { Cards } from '../cards/cards';

@Component({
  selector: 'app-player',
  imports: [],
  templateUrl: './player.html',
  styleUrl: './player.css',
})
export class Player {
  
}
