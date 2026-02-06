import { ChangeDetectionStrategy, Component, Input, inject, computed } from '@angular/core';
import { Router } from '@angular/router';

import type { Spec } from '../../models';
import { ModalService, PlayerService } from '../../services';
import { LicenseSelectorComponent } from '../license-selector/license-selector.component';

@Component({
  selector: 'app-spec-list-item',
  standalone: true,
  imports: [],
  templateUrl: './spec-list-item.component.html',
  styleUrls: ['./spec-list-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecListItemComponent {
  private playerService = inject(PlayerService);
  private modalService = inject(ModalService);
  private router = inject(Router);

  @Input({ required: true }) spec!: Spec;

  // Computed: Check if this spec is currently playing
  isCurrentlyPlaying = computed(() => {
    const currentTrack = this.playerService.currentTrack();
    const isPlaying = this.playerService.isPlaying();
    return currentTrack?.id === this.spec.id && isPlaying;
  });

  playSong(event: MouseEvent) {
    event.stopPropagation();
    const currentTrack = this.playerService.currentTrack();

    // If this track is already loaded, toggle play/pause
    if (currentTrack?.id === this.spec.id) {
      this.playerService.togglePlay();
    } else {
      // Load and play new track
      this.playerService.showPlayer(this.spec);
    }
  }

  addToCart(event: MouseEvent) {
    event.stopPropagation();
    this.modalService.open(LicenseSelectorComponent, 'Select License', {
      spec: this.spec,
    });
  }

  openDetails() {
    const id = this.spec.id.replace('#', '');
    this.router.navigate(['/beats', id]);
  }
}
