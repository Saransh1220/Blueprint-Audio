import { Component, Input, inject } from '@angular/core';

import type { Spec } from '../../models/spec';
import { ModalService } from '../../services/modal.service';
import { PlayerService } from '../../services/player.service';
import { LicenseSelectorComponent } from '../license-selector/license-selector.component';

@Component({
  selector: 'app-spec-card',
  standalone: true,
  imports: [],
  templateUrl: './spec-card.html',
  styleUrls: ['./spec-card.scss'],
})
export class SpecCardComponent {
  @Input() spec!: Spec;
  playerService = inject(PlayerService);
  modalService = inject(ModalService);

  playSong() {
    this.playerService.showPlayer(this.spec);
  }

  addToCart(event: MouseEvent) {
    event.stopPropagation();
    this.modalService.open(LicenseSelectorComponent, 'Select License', {
      spec: this.spec,
    });
  }
}
