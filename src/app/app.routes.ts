import { Routes } from '@angular/router';

import { StartGame } from './pages/start-game/start-game';
import { BlackJackGameBoard } from './pages/Blackjack/blackjack-game-board';
import { GameSelector } from './pages/game-selector/game-selector';

export const routes: Routes = [
    {
        path: '',
        component: GameSelector
    },
    {
        path: 'Blackjack-Start',
        component: StartGame
    },
    {
        path: 'Blackjack',
        component: BlackJackGameBoard
    },
    {
        path: '**',
        redirectTo: 'Blackjack-Start'
    }
];
