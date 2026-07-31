import { effect, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StoreService {
    protected readonly clientId: string;

    constructor() {
        const existingId = localStorage.getItem("clientId")
        if(existingId) {
            this.clientId = existingId;
        } else {
            this.clientId = crypto.randomUUID();
            localStorage.setItem("clientId", this.clientId);
        }
    }

    getClientId(): string {
        return this.clientId;
    }
}