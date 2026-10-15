import { CatanGameState } from "../../pages/games/catan/catan.models";
import { SpadesGameState } from "../../pages/games/spades/spades.models";

export type GameType = 'spades' | 'catan';

export type GameState = SpadesGameState | CatanGameState;