import { Component } from '@angular/core';
import { RouterLink } from "@angular/router";

import { GAME_LIST } from '../../core/constants/gameRules';

@Component({
  selector: 'app-game-selector',
  imports: [RouterLink],
  templateUrl: './game-selector.html',
  styleUrl: './game-selector.css',
})
export class GameSelector {
  Games = GAME_LIST;
}
