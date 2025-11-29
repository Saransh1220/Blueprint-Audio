import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
})
export class ModalComponent {
  constructor(public modalService: ModalService) {}

  get modalInputs(): Record<string, unknown> | undefined {
    return this.modalService.state()?.data;
  }

  close() {
    this.modalService.close();
  }
}
