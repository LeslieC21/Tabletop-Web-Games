import { Component, inject, input, output } from '@angular/core';
import { ModalMessage } from '../../../core/models/modal-message.model';
import { ModalService } from '../../../services/dialog.service';

@Component({
  selector: 'app-modal-inform',
  imports: [],
  templateUrl: './modal-inform.html',
  styleUrl: './modal-inform.css',
})
export class ModalInform {
  private modalService = inject(ModalService);

  modalMessage?: ModalMessage;

  close(): void {
    this.modalService.close();
  }

  confirm(): void {
    console.log('Action Confirmed!');
    this.modalService.close();
  }
}
