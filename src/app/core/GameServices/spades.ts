import { effect, Injectable, signal } from '@angular/core';

import { Card, DECK, SUITS } from '../constants/deck';
import { PlayerModel } from '../models/PlayerModel';
import { GameSocketService, GameState, createDefaultGameState } from '../ConnectionServices/GameSocketService';
import { filter, take } from 'rxjs';

interface cardPot {
  card: Card;
  cardOwner: string; // This will be the player id
}

@Injectable({
  providedIn: 'root',
})

export class SpadesService {
  currentGameState = signal<GameState>(createDefaultGameState());

  constructor(private gameSocket: GameSocketService) {
    this.gameSocket.gameState$.subscribe((state) => {
      this.currentGameState.set(state);
    });
  }
}
