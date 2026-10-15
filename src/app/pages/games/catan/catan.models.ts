import { DevelopmentCard, Gameboard, ResourceType } from "../../../core/models/CatanModels";
import { BaseGameState, BasePlayerState } from "../../../core/models/game-state.model";

export interface CatanGameState extends BaseGameState {
    gameType: 'catan';
    phase: 'waiting' | 'setup' | 'roll' | 'main' | 'robber' | 'game-over';
    players: CatanPlayer[];
    gameBoard: Gameboard;
    robberTileId: string;
}

export interface CatanPlayer extends BasePlayerState {
    hand: CatanCards;
    placedBuildings: number;
    placedRoads: number;
    status: 'ready' | 'movingRobber' | 'removingCards' | 'proposingTrade';
    hasRolled: boolean;
}

export interface CatanCards {
    resources: ResourceCard[],
    devCards: []
}

export interface ResourceCard {
    resource: string,
    quantity: number
}