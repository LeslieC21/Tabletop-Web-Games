import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-start-game',
  imports: [RouterLink],
  templateUrl: './start-game.html',
  styleUrl: './start-game.css',
})
export class StartGame {
  gameTitle = 'Blackjack';
  instructions = 'This is my body!';
  allowMultiplePlayers = false;
  showInstructions = signal<boolean>(false);
}
