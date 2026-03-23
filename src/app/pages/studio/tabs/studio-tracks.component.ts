import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LabService, AuthService } from '../../../services';
import { Spec } from '../../../models';

@Component({
  selector: 'app-studio-tracks',
  imports: [CommonModule, RouterLink],
  templateUrl: './studio-tracks.component.html',
  styleUrl: './studio-tracks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioTracksComponent {
  private labService = inject(LabService);
  private authService = inject(AuthService);

  currentUser = this.authService.currentUser;
  tracks = signal<Spec[]>([]);
  isLoading = signal(true);
  viewMode = signal<'grid' | 'list'>('grid');

  trackCount = computed(() => this.tracks().length);

  constructor() {
    this.loadTracks();
  }

  private loadTracks() {
    this.isLoading.set(true);
    // Load all specs — the API returns producer's own specs when authenticated
    this.labService.getSpecs({ category: 'beat' }).subscribe({
      next: (specs) => {
        this.tracks.set(specs);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  setView(mode: 'grid' | 'list') {
    this.viewMode.set(mode);
  }
}
