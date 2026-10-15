import { inject, Injectable } from "@angular/core";
import { GameSocketService } from "../../../core/ConnectionServices/GameSocketService";
import { CatanGameState, CatanCards } from "./catan.models";
import { BehaviorSubject } from "rxjs";

@Injectable()
export class CatanGameService {
    private conn = inject(GameSocketService);

    readonly state$ = this.conn.selectState<CatanGameState>('catan');
    readonly myHand$ = new BehaviorSubject<CatanCards[]>([]);

    private sub = this.conn.fromEvent<{ hand: CatanCards[] }>('hand-dealt')
    .subscribe(({ hand }) => this.myHand$.next(hand));

    rollDice() {
        this.conn.sendAction(this.conn.roomCode$.value!, 'roll-dice', {});
    }

    moveRobber(tileId: string) {
        this.conn.sendAction(this.conn.roomCode$.value!, 'moved-robber', { tileId });
    }

    endPlayerTurn() {
        this.conn.sendAction(this.conn.roomCode$.value!, 'end-turn', {});
    }

    addBuilding(vertexId: string) {
        this.conn.sendAction(this.conn.roomCode$.value!, 'player-add-building', { vertexId });
    }

    addRoad(edgeId: string) {
        this.conn.sendAction(this.conn.roomCode$.value!, 'player-add-road', { edgeId });
    }

    removeBuilding(vertexId: string) {
        this.conn.sendAction(this.conn.roomCode$.value!, 'player-remove-building', { vertexId });
    }

    removeRoad(edgeId: string) {
        this.conn.sendAction(this.conn.roomCode$.value!, 'player-remove-road', { edgeId });
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }
}