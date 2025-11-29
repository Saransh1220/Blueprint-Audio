import { Component, Input, signal } from '@angular/core';

import { Spec } from '../../models/spec';
import { PlayerService } from '../../services/player.service';
import { ModalService } from '../../services/modal.service';
import { LicenseSelectorComponent } from '../license-selector/license-selector.component';

@Component({
  selector: 'app-spec-list-item',
  standalone: true,
  imports: [],
  templateUrl: './spec-list-item.component.html',
  styleUrls: ['./spec-list-item.component.scss'],
})
export class SpecListItemComponent {
  @Input({ required: true }) spec!: Spec;

  constructor(
    private playerService: PlayerService,
    private modalService: ModalService,
  ) {}

  playSong(event: MouseEvent) {
    event.stopPropagation();
    this.playerService.showPlayer(this.spec);
  }

  addToCart(event: MouseEvent) {
    event.stopPropagation();
    this.modalService.open(LicenseSelectorComponent, 'Select License', { spec: this.spec });
  }
}
