import { Component, Input, Output } from '@angular/core';
import { ResourceType } from '../../core/models/CatanModels';

@Component({
  selector: 'app-catan-card',
  imports: [],
  templateUrl: './catan-card.html',
  styleUrl: './catan-card.css',
})
export class CatanCard {
  @Input({ required: true}) resource!: ResourceType;
  @Input () isCardHidden: boolean = false;
  @Input () canSelect: boolean = false;
}
