import { CommonModule, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  Input,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { BRAND } from '../../core/config/brand';

import type { Spec } from '../../models';
import { SpecActionService } from '../../services/spec-action.service';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { producerLink } from '../../utils/producer-link';

@Component({
  selector: 'app-spec-card',
  imports: [CommonModule, NgOptimizedImage, RouterLink, MoneyPipe],
  templateUrl: './spec-card.html',
  styleUrls: ['./spec-card.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecCardComponent implements OnInit, OnDestroy {
  readonly brand = BRAND;
  @Input() spec!: Spec;
  @Input() priority = false;
  @Input() appearance: 'default' | 'explore' | 'market' = 'default';

  actionService = inject(SpecActionService);
  cdr = inject(ChangeDetectorRef);

  // Local state for favorite
  isFavoriting = signal(false);

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

  get imageUrl(): string {
    return this.spec.imageUrl || 'assets/images/placeholder.jpg';
  }

  formatDuration(seconds: number): string {
    return this.actionService.formatDuration(seconds);
  }

  producerRoute() {
    return producerLink(this.producerHandle());
  }

  producerHandle() {
    return this.spec.producerHandle || this.spec.producerId;
  }
}
