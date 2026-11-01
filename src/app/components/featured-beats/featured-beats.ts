import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';

import type { Spec } from '../../models';
import { PlayerService } from '../../services/player.service';
import { SpecActionService } from '../../services/spec-action.service';
import { DiscCarouselComponent } from '../disc-carousel/disc-carousel';
import { specToDisc } from './featured-beats.utils';

/** Home: the featured beats as a cascade of discs, with play and view actions for the chosen one. */
@Component({
  selector: 'app-featured-beats',
  imports: [DiscCarouselComponent],
  templateUrl: './featured-beats.html',
  styleUrl: './featured-beats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturedBeatsComponent {
  private readonly player = inject(PlayerService);
  private readonly actions = inject(SpecActionService);

  readonly specs = input<readonly Spec[]>([]);

  readonly items = computed(() => this.specs().map(specToDisc));
  readonly activeIndex = signal(0);
  readonly activeSpec = computed<Spec | null>(
    () => this.specs()[this.activeIndex()] ?? this.specs()[0] ?? null,
  );
  readonly activeIsPlaying = computed(() => {
    const spec = this.activeSpec();
    return !!spec && this.player.currentTrack()?.id === spec.id && this.player.isPlaying();
  });

  open(index = this.activeIndex()): void {
    const spec = this.specs()[index];
    if (spec) this.actions.openDetails(spec);
  }

  togglePlay(): void {
    const spec = this.activeSpec();
    if (!spec) return;
    if (this.player.currentTrack()?.id === spec.id) this.player.togglePlay();
    else this.player.showPlayer(spec);
  }
}
