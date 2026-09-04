import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-catan-game-board',
  imports: [],
  templateUrl: './catan.html',
  styleUrl: './catan.css',
})
export class CatanGameBoard {
  @Input ({ required: true }) roomCode!: string;
  @Output() closeGame = new EventEmitter<void>();
  @Output() resetGame = new EventEmitter<void>();
  
}
