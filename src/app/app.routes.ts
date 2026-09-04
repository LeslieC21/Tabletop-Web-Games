import { Routes } from '@angular/router';

import { StartGame } from './pages/start-game/start-game';
import { BlackJackGameBoard } from './pages/games/Blackjack/blackjack-game-board';
import { GameSelector } from './pages/game-selector/game-selector';
import { SpadesGameBoard } from './pages/games/spades/spades-game-board';
import { CatanGameBoard } from './pages/games/catan/catan';
import { GAME_LIST } from './core/constants/gameRules';

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
        path: '**',
        redirectTo: ''
    }
];
