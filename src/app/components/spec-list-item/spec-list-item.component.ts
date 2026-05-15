import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
  computed,
  signal,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule, NgOptimizedImage } from '@angular/common';

import type { Spec } from '../../models';
import { SpecActionService } from '../../services/spec-action.service';

@Component({
  selector: 'app-spec-list-item',
  imports: [CommonModule, NgOptimizedImage],
  templateUrl: './spec-list-item.component.html',
  styleUrls: ['./spec-list-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecListItemComponent implements OnInit, OnDestroy {
  actionService = inject(SpecActionService);
  cdr = inject(ChangeDetectorRef);

  isFavoriting = signal(false);

  @Input({ required: true }) spec!: Spec;
  @Input() priority = false;
  @Input() appearance: 'default' | 'market' = 'default';

  isCurrentlyPlaying = computed(() => this.actionService.isCurrentlyPlaying(this.spec));

  private favoriteSub?: Subscription;

  ngOnInit() {
    this.favoriteSub = this.actionService.syncFavorite(this.spec, this.cdr);
  }

  ngOnDestroy() {
    this.favoriteSub?.unsubscribe();
  }

  playSong(event: Event) {
    this.actionService.playSong(event, this.spec);
  }
  addToCart(event: Event) {
    this.actionService.addToCart(event, this.spec);
  }
  openDetails() {
    this.actionService.openDetails(this.spec);
  }
  /** Row click: play in list/market view, navigate in default card view */
  handleRowClick(event: Event) {
    if (this.appearance === 'market') {
      this.actionService.playSong(event, this.spec);
    } else {
      this.actionService.openDetails(this.spec);
    }
  }
  /** Title click in list view: stop row-click propagation, then navigate */
  navigateToDetails(event: Event) {
    event.stopPropagation();
    this.actionService.openDetails(this.spec);
  }
  toggleFavorite(event: Event) {
    this.actionService.toggleFavorite(event, this.spec, this.isFavoriting, this.cdr);
  }
  downloadFreeMp3(event: Event) {
    this.actionService.downloadFreeMp3(event, this.spec);
  }

  formatDuration(seconds: number): string {
    return this.actionService.formatDuration(seconds);
  }

  getGenreLabel(): string {
    return this.spec.genres?.[0]?.name || this.spec.category || 'Beat';
  }

  getMarketTags(): string[] {
    const tags = this.spec.tags?.filter(Boolean).slice(0, 3) ?? [];
    return tags.length ? tags : [this.getGenreLabel()];
  }
}
