import { Component, Input } from '@angular/core';

import { Card } from '../../core/constants/deck';

@Component({
  selector: 'app-cards',
  imports: [],
  templateUrl: './cards.html',
  styleUrl: './cards.css',
})
export class Cards {
  @Input({ required: true}) card!: Card;
}
