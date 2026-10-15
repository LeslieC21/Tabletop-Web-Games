import { Component, Input } from '@angular/core';
import { ResourceCard } from '../../pages/games/catan/catan.models';

@Component({
  selector: 'app-catan-card',
  imports: [],
  templateUrl: './catan-card.html',
  styleUrl: './catan-card.css',
})
export class CatanCard {
    @Input({ required: true}) resource!: string;
}
