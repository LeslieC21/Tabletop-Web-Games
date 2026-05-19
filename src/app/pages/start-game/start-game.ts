import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-start-game',
  imports: [RouterLink],
  templateUrl: './start-game.html',
  styleUrl: './start-game.css',
})
export class StartGame {
  gameTitle = 'Blackjack';
  howToPlay = '';
  allowMultiplePlayers = false;
}
