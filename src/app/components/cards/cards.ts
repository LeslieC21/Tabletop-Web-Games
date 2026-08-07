import { Component, Input, signal } from '@angular/core';

import { Card } from '../../core/constants/deck';

@Component({
  selector: 'app-cards',
  imports: [],
  templateUrl: './cards.html',
  styleUrl: './cards.css',
})
export class Cards {
  @Input({ required: true}) card!: Card;
  @Input () isCardHidden: boolean = false;
  @Input () isFlipped: boolean = false;
  @Input () isSelected: boolean = false;
  @Input () myTurn: boolean = true;
  @Input() displayManyCards: boolean = true;
}
