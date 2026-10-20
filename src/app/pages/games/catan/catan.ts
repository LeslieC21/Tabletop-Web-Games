import { Component, computed, effect, EventEmitter, inject, Input, Output, signal } from '@angular/core';

import { ResourceType, BuildType, Gameboard, createInitialGameboard, Edge, Vertex, BUILD_COSTS } from '../../../core/models/CatanModels';
import { GameSocketService } from '../../../core/ConnectionServices/GameSocketService';
import { CatanGameState, CatanCards } from './catan.models';
import { CatanGameService } from './catan.service';
import { ModalService } from '../../../services/dialog.service';
import { CatanCard } from '../../../components/catan-card/catan-card';
import { ModalInform } from '../../../shared/components/modal-inform/modal-inform';


const SCALE = 18;
const PADDING = 36;
 
const SETTLEMENT_PATH = 'M -8 8 L -8 -1 L 0 -9 L 8 -1 L 8 8 Z';
const CITY_PATH = 'M -12 9 L -12 -2 L -4 -2 L -4 -9 L 0 -13 L 4 -9 L 4 -2 L 12 -2 L 12 9 Z';

interface TileView {
  id: string;
  points: string;
  cx: number;
  cy: number;
  resource: ResourceType;
  numberToken: number | null;
  hot: boolean; // 6 or 8
}
 
interface EdgeView {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  hasRoad: boolean;
  owner: Edge['owner'];
  locked: boolean;
}
 
interface VertexView {
  id: string;
  x: number;
  y: number;
  building: BuildType;
  owner: Vertex['owner'];
  locked: boolean;
}

interface ResourceCardView {
  id: string,
  resource: ResourceType;
}

@Component({
  selector: 'app-catan-game-board',
  imports: [CatanCard],
  providers: [CatanGameService],
  templateUrl: './catan.html',
  styleUrl: './catan.css',
})
export class CatanGameBoard {
  @Input ({ required: true }) roomCode!: string;
  @Output() closeGame = new EventEmitter<void>();
  @Output() resetGame = new EventEmitter<void>();
  
  gameSocket = inject(GameSocketService);
  catanService = inject(CatanGameService);
  modalService = inject(ModalService);

  viewBox = '0 0 100 100';
  tiles = signal<TileView[]>([]);
  edges = signal<EdgeView[]>([]);
  vertices = signal<VertexView[]>([]);
  board = signal<Gameboard>(createInitialGameboard());
  isPlacing = signal<boolean>(false);
  isStoreOpen = signal<boolean>(false);
  selectedCards = signal<string[]>([]);

  readonly settlementPath = SETTLEMENT_PATH;
  readonly cityPath = CITY_PATH;

  currentGameState = signal<CatanGameState | null>(null);
  myPlayer = computed(() => {
      let s =  this.gameSocket.socketId;
      return this.currentGameState()!.players.find(p => p.socketId == s);
  })
  otherPlayers = computed(() => {
    return this.currentGameState()!.players.filter(p => p.socketId !== this.gameSocket.socketId);
  })
  currentTurnId = computed(() => {
    let s = this.currentGameState()!.currentTurnIndex;
    return this.currentGameState()!.players.at(s)?.socketId;
  })
  myHand = computed<ResourceCardView[]>(() => {
    const r = this.myPlayer()?.hand.resources;
    if(!r) return [];

    return Object.entries(r).flatMap(([resource, count]) => 
      Array.from({ length: count }, (_, i) => ({
        id: `${resource}-${i}`,
        resource:  resource as ResourceType
      }))
    )
  })
  get myId(): string {
    return this.gameSocket.socketId;
  }
  constructor() {
    this.catanService.state$.subscribe((state) => {
      this.currentGameState.set(state)
      this.board.set(state.gameBoard!)
      this.updateBoard();
    });

    effect(() => {
      const action = this.myPlayer()?.pendingActions[0];
      if (action == 'removeCards') {
        this.modalService.open(ModalInform, 
          { 
            title: 'Someone rolled a 7!', 
            message: `Since a 7 was rolled and you have more than 7 cards you need to remove
            1/2 of your deck. To do this- select ${Math.ceil(this.myHand().length / 2)} cards to give back to the bank.`
          })
      } else if (action == 'movingRobber' && 
        !this.otherPlayers()
        .some(p => p.pendingActions
          .some(action => action == 'removeCards'))) {
        this.modalService.open(ModalInform, 
          { 
            title: 'You rolled a 7!', 
            message: `You rolled a seven- so you can now move the robber to stop resource gathering from that tile,
            then select a card from another player that has a building on that tile.`
        })
      }
    })
  }

  rollDice(): void {
    if(this.currentTurnId() !== this.myId || this.currentGameState()!.phase === 'setup') return;

    this.catanService.rollDice();
  }

  toggleStore(): void {
    this.isStoreOpen.update(value => !value);
  }

  buyItem(item: BuildType): void {
    // Determine if player is 'allowed' to buy that item
    if (item == 'City') {
      var canBuy = this.vertices().some(x => x.building == 'Settlement' && x.owner == this.myId);
      if(!canBuy) return;
    }

    // var canAfford = Object.entries(BUILD_COSTS[item]).every(
    //   ([res, n]) => this.myHand()[res as ResourceType] >= n!
    // )
  }

  updateBoard(): void {
    const { tiles, vertices, edges } = this.currentGameState()!.gameBoard;
    const vertexList = Object.values(vertices);

    const xs = vertexList.map((v) => v.x * SCALE);
    const ys = vertexList.map((v) => v.y * SCALE);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const width = Math.max(...xs) - minX;
    const height = Math.max(...ys) - minY;
    this.viewBox = `${minX - PADDING} ${minY - PADDING} ${width + PADDING * 2} ${height + PADDING * 2}`;

    this.tiles.set(tiles.map((tile) => {
      const corners = tile.vertexIds.map((id) => ({
        x: vertices[id].x * SCALE,
        y: vertices[id].y * SCALE
      }));
      return {
        id: tile.id,
        points: corners.map((c) => `${c.x},${c.y}`).join(' '),
        cx: corners.reduce((sum, c) => sum + c.x, 0) / corners.length,
        cy: corners.reduce((sum, c) => sum + c.y, 0) / corners.length,
        resource: tile.resource,
        numberToken: tile.numberToken,
        hot: tile.numberToken === 6 || tile.numberToken === 8
      };
    }));

    this.edges.set(Object.values(edges).map((edge) => {
      const [a, b] = edge.vertexIds.map((id) => vertices[id]);
      return {
        id: edge.id,
        x1: a.x * SCALE,
        y1: a.y * SCALE,
        x2: b.x * SCALE,
        y2: b.y * SCALE,
        hasRoad: edge.hasRoad,
        owner: edge.owner,
        locked: edge.locked
      };
    }))

    this.vertices.set(vertexList.map((v) => ({
      id: v.id,
      x: v.x * SCALE,
      y: v.y * SCALE,
      building: v.building,
      owner: v.owner,
      locked: v.locked
    })))
  }

  vertexClick(vertexId: string, event: MouseEvent) {
    event.preventDefault();
    if(this.currentTurnId() != this.myId)
      return;
    
    if (event.button == 0) {
      if (this.currentGameState()!.phase == 'setup' && this.currentGameState()!.roundNumber != this.myPlayer()!.placedBuildings) {
        this.sendPlayerAddBuilding(vertexId); 
      } else if (this.currentGameState()!.phase != 'setup') {
        this.sendPlayerAddBuilding(vertexId);
      }
    } else if (event.button == 2) {
      this.sendPlayerRemoveBuilding(vertexId);
    }
  }

  edgeClick(edgeId: string, event: MouseEvent) {
    event.preventDefault();
    console.log(this.currentGameState()!.currentTurnIndex);
    if(this.currentTurnId() != this.myId)
      return;
    
    if (event.button == 0) {
      if (this.currentGameState()!.phase == 'setup' && this.currentGameState()!.roundNumber != this.myPlayer()!.placedRoads) {
        this.sendPlayerAddRoad(edgeId); 
      } else if (this.currentGameState()!.phase != 'setup') {
        this.sendPlayerAddRoad(edgeId);
      }
    } else if (event.button == 2) {
      this.sendPlayerRemoveRoad(edgeId);
    }
  }

  tileClick(tileId: string) {
    if (this.myPlayer()?.pendingActions[0] != 'movingRobber') return;

    console.log('Clicked Tile ' + tileId)
    this.catanService.moveRobber(tileId);
  }

  sendPlayerRemoveBuilding(id: string) {
    this.catanService.removeBuilding(id);
  }

  sendPlayerAddBuilding(id: string) {
    this.catanService.addBuilding(id);
  }

  sendPlayerRemoveRoad(id: string) {
    this.catanService.removeRoad(id);
  }

  sendPlayerAddRoad(id: string) {
    this.catanService.addRoad(id);
  }

  canPlayerBuyItem(building: BuildType) {
    var canAfford = Object.entries(BUILD_COSTS[building])
    console.log(canAfford);
  }

  selectOpponentCard(playerId: string) {
    if (this.currentGameState()!.isStealingFrom.some(id => id === playerId))
      this.catanService.playerStoleCard(playerId)
    else return;
  }

  playerSelectedOwnCard(cardId: string) {
    const selectedCard = document.getElementById(cardId);
    // console.log(cardId)
    // console.log(selectedCard)

    if (selectedCard === null) return;

    // Change this to happen on the component i guess
    if (selectedCard.classList.contains('card-selected')) {
      this.selectedCards.update(curr => [
        ...curr.filter(card => card !== cardId)
      ]
      )
      selectedCard.classList.remove('card-selected')
    } else {
      this.selectedCards.update(curr => [...curr, cardId]);
      selectedCard.classList.add('card-selected')
    }
  }

  giveCardsToBank() {
    if (this.selectedCards().length !== Math.ceil(this.myHand().length / 2)) return;

    this.catanService.playerSelectedOwnCards(this.selectedCards());

    this.selectedCards.set([]);
    let selectedCards = document.getElementsByClassName('card-selected');
    for(const ele of selectedCards) {
      ele.classList.remove('card-selected');
    }
  }

  endTurn() {
    // First two rounds of the game is setup - don't allow end turn if there is not a road and building placed this round.
    if (
      this.currentGameState()!.phase == 'setup' && 
      (this.currentGameState()!.roundNumber != this.myPlayer()!.placedRoads ||
      this.currentGameState()!.roundNumber != this.myPlayer()!.placedBuildings) ||
      this.currentTurnId() !== this.myId
    ) {
      return;
    }

    this.catanService.endPlayerTurn();
  }
}
