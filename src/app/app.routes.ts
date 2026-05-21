import { Routes } from '@angular/router';

import { StartGame } from './pages/start-game/start-game';
import { BlackJackGameBoard } from './pages/Blackjack/blackjack-game-board';
import { GameSelector } from './pages/game-selector/game-selector';
import { SpadesGameBoard } from './pages/spades/spades-game-board';

export const routes: Routes = [
    {
        path: '',
        component: GameSelector
    },
    {
        path: 'GameLobby/:game',
        component: StartGame
    },
    {
        path: 'Play/Blackjack',
        component: BlackJackGameBoard
    },
    {
        path: 'Play/Spades',
        component: SpadesGameBoard
    },
    {
        path: '**',
        redirectTo: ''
    }
];
