import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  type OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpecRowComponent } from '../../components';
import { Role, User } from '../../models';
import { AnalyticsService, AuthService, LabService } from '../../services';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SpecRowComponent, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private labService = inject(LabService);
  private analyticsService = inject(AnalyticsService);

  readonly Role = Role;

  currentUser = this.authService.currentUser;
  currentDate = signal<Date>(new Date());

  // --- Overview State ---
  selectedGenres = signal<string[]>([]);
  filteredSpecs = signal<any[]>([]);

  genres = signal<string[]>([
    'Trap',
    'Drill',
    'RnB',
    'Lo-Fi',
    'Hip Hop',
    'Pop',
    'Tech',
    'House',
    'Experimental',
    'Ambient',
  ]);

  constructor() {
    effect(
      () => {
        const genres = this.selectedGenres();
        this.loadSpecs(genres);
      },
      { allowSignalWrites: true },
    );

    // Reactively load analytics when user is available
    effect(() => {
      const user = this.currentUser();
      if (user?.role === Role.PRODUCER) {
        this.loadAnalytics();
      }
    });
  }

  ngOnInit() {
    // Initialization handled by effects
  }

  loadAnalytics() {
    this.analyticsService.getOverview().subscribe({
      next: (data) => {
        this.stats.set([
          {
            label: 'Total Plays',
            value: data.total_plays.toLocaleString(),
            icon: 'fas fa-play',
            trend: 'Lifetime',
          },
          {
            label: 'Revenue',
            value: '₹' + data.total_revenue.toLocaleString(),
            icon: 'fas fa-rupee-sign',
            trend: 'Lifetime',
          },
          {
            label: 'Downloads',
            value: data.total_downloads.toLocaleString(),
            icon: 'fas fa-download',
            trend: 'Lifetime',
          },
          {
            label: 'Favorites',
            value: data.total_favorites.toLocaleString(),
            icon: 'fas fa-heart',
            trend: 'Lifetime',
          },
        ]);
      },
      error: (err) => {
        console.error('Dashboard analytics error', err);
        // Fallback to zeros if API fails (e.g. backend not updated yet)
        this.stats.set([
          { label: 'Total Plays', value: '0', icon: 'fas fa-play', trend: 'No Data' },
          { label: 'Revenue', value: '₹0', icon: 'fas fa-rupee-sign', trend: 'No Data' },
          { label: 'Downloads', value: '0', icon: 'fas fa-download', trend: 'No Data' },
          { label: 'Favorites', value: '0', icon: 'fas fa-heart', trend: 'No Data' },
        ]);
      },
    });
  }

  // --- Overview Logic ---
  loadSpecs(genres: string[]) {
    this.labService.getSpecs({ category: 'beat', genres }).subscribe((specs) => {
      this.filteredSpecs.set(specs);
    });
  }

  toggleGenre(genre: string) {
    this.selectedGenres.update((current) => {
      if (current.includes(genre)) return current.filter((g) => g !== genre);
      return [...current, genre];
    });
  }

  getGenreImage(genre: string): string {
    const map: Record<string, string> = {
      Trap: 'assets/images/genres/trap.png',
      Drill: 'assets/images/genres/drill.png',
      RnB: 'assets/images/genres/rnb.png',
      Experimental: 'assets/images/genres/experimental.png',
      House: 'assets/images/genres/house.png',
      'Lo-Fi': 'assets/images/genres/lofi.png',
      'Hip Hop': 'assets/images/genres/hiphop.png',
      Pop: 'assets/images/genres/pop.png',
      Tech: 'assets/images/genres/tech.png',
      Ambient: 'assets/images/genres/ambient.png',
    };
    return map[genre] || 'assets/images/placeholder.jpg';
  }

  stats = signal([
    { label: 'Total Plays', value: '-', icon: 'fas fa-play', trend: 'Loading...' },
    { label: 'Revenue', value: '-', icon: 'fas fa-dollar-sign', trend: 'Loading...' },
    { label: 'Downloads', value: '-', icon: 'fas fa-download', trend: 'Loading...' },
    { label: 'Favorites', value: '-', icon: 'fas fa-heart', trend: 'Loading...' },
  ]);

  spotlight = signal({
    title: 'FEATURED DROP',
    artist: 'METRO BOOMIN',
    image: 'assets/images/metro.jpg',
    description: 'Explore the latest sound kit from the legendary producer.',
  });
}
