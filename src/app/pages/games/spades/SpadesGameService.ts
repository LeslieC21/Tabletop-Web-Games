import { inject, Injectable } from "@angular/core";
import { GameSocketService } from "../../../core/ConnectionServices/GameSocketService";
import { SpadesGameState } from "./spades.models";
import { BehaviorSubject } from "rxjs";
import { Card } from "../../../core/constants/deck";

@Injectable()
export class SpadesGameService {
    private conn = inject(GameSocketService);

    readonly state$ = this.conn.selectState<SpadesGameState>('spades');
    readonly myHand$ = new BehaviorSubject<Card[]>([]);

    private sub = this.conn.fromEvent<{ hand: Card[] }>('hand-dealt')
    .subscribe(({ hand }) => this.myHand$.next(hand));

    placeBid(amount: number) {
        this.conn.sendAction(this.conn.roomCode$.value!, 'bid', { amount });
    }

    playCard(card: Card) {
        this.conn.sendAction(this.conn.roomCode$.value!, 'play-card', { card });
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }
}