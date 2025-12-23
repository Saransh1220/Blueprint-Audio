import { Component, Input, inject, ChangeDetectionStrategy } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';

import type { Spec } from '../../models/spec';
import { ModalService } from '../../services/modal.service';
import { PlayerService } from '../../services/player.service';
import { LicenseSelectorComponent } from '../license-selector/license-selector.component';

@Component({
  selector: 'app-spec-card',
  standalone: true,
  imports: [NgOptimizedImage],
  templateUrl: './spec-card.html',
  styleUrls: ['./spec-card.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecCardComponent {
  @Input() spec!: Spec;
  playerService = inject(PlayerService);
  modalService = inject(ModalService);
  router = inject(Router);

  playSong(event: MouseEvent) {
    event.stopPropagation();
    this.playerService.showPlayer(this.spec);
  }

  addToCart(event: MouseEvent) {
    event.stopPropagation();
    this.modalService.open(LicenseSelectorComponent, 'Select License', {
      spec: this.spec,
    });
  }

  openDetails() {
    // Navigate to details page
    // Remove the '#' if present to make URL cleaner, though our service handles both
    const id = this.spec.id.replace('#', '');
    this.router.navigate(['/beats', id]);
  }
}
