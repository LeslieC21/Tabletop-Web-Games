import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { StoreService } from './core/GameServices/Store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})

export class App {
  protected readonly title = signal('Blackjack');
}
