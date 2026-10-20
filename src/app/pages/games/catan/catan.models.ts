import { DevelopmentCard, Gameboard, ResourceType } from "../../../core/models/CatanModels";
import { BaseGameState, BasePlayerState } from "../../../core/models/game-state.model";

export type DevCardType = 'Knight' | 'VictoryPoint' | 'RoadBuilding' | 'YearOfPlenty' | 'Monopoly';

export interface CatanGameState extends BaseGameState {
    gameType: 'catan';
    phase: 'waiting' | 'setup' | 'roll' | 'main' | 'robber' | 'game-over';
    players: CatanPlayer[];
    gameBoard: Gameboard;
    robberTileId: string;
    isStealingFrom: string[];
}

export interface CatanPlayer extends BasePlayerState {
    hand: CatanCards;
    handSize: number;
    placedBuildings: number;
    placedRoads: number;
    pendingActions: string[];
    hasRolled: boolean;
}

export interface CatanCards {
    resources: Record<ResourceType, number>,
    devCards: []
}

export interface DevCard {
  id: string;
  type: DevCardType;
  boughtOnTurn: number;
  played: boolean;
}