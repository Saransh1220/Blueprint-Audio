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
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { NgOptimizedImage } from '@angular/common';

import type { Spec } from '../../models';
import { SpecActionService } from '../../services/spec-action.service';

@Component({
  selector: 'app-spec-card',
  imports: [CommonModule, NgOptimizedImage, RouterLink],
  templateUrl: './spec-card.html',
  styleUrls: ['./spec-card.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecCardComponent implements OnInit, OnDestroy {
  @Input() spec!: Spec;
  @Input() priority = false;

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
}
