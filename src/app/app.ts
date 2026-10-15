import { Component, signal, inject, ViewContainerRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ModalService } from './services/dialog.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})

export class App {
  protected readonly title = signal('Blackjack');

  constructor(vcr: ViewContainerRef) {
    inject(ModalService).registerContainer(vcr);
  }
}
