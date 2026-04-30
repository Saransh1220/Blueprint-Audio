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

  isCurrentlyPlaying = computed(() => this.actionService.isCurrentlyPlaying(this.spec));

  private favoriteSub?: Subscription;

  ngOnInit() {
    this.favoriteSub = this.actionService.syncFavorite(this.spec, this.cdr);
  }

  ngOnDestroy() {
    this.favoriteSub?.unsubscribe();
  }

  playSong(event: MouseEvent) {
    this.actionService.playSong(event, this.spec);
  }
  addToCart(event: MouseEvent) {
    this.actionService.addToCart(event, this.spec);
  }
  openDetails() {
    this.actionService.openDetails(this.spec);
  }
  toggleFavorite(event: MouseEvent) {
    this.actionService.toggleFavorite(event, this.spec, this.isFavoriting, this.cdr);
  }
  downloadFreeMp3(event: MouseEvent) {
    this.actionService.downloadFreeMp3(event, this.spec);
  }

  formatDuration(seconds: number): string {
    return this.actionService.formatDuration(seconds);
  }
}
