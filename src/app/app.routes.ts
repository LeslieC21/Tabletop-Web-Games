import { Routes } from '@angular/router';

import { StartGame } from './pages/start-game/start-game';
import { GameBoard } from './pages/game-board/game-board';

export const routes: Routes = [
    {
        path: '',
        component: StartGame
    },
    {
        path: 'Blackjack-Start',
        component: StartGame
    },
    {
        path: 'Blackjack',
        component: GameBoard
    },
    {
        path: '**',
        redirectTo: 'Blackjack-Start'
    }
];
