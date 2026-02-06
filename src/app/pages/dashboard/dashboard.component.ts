import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  type OnInit,
  signal,
  effect,
} from '@angular/core';
import { SpecRowComponent } from '../../components';
import { AuthService, LabService } from '../../services';
import { User, Role } from '../../models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SpecRowComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private labService = inject(LabService);

  readonly Role = Role;

  currentUser = signal<User | null>(null);
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
  }

  ngOnInit() {
    this.currentUser.set(this.authService.currentUser());
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
    { label: 'Total Plays', value: '12.5K', icon: 'fas fa-play', trend: '+12%' },
    { label: 'Revenue', value: '₹2,450', icon: 'fas fa-rupee-sign', trend: '+8%' },
    { label: 'Followers', value: '850', icon: 'fas fa-user-friends', trend: '+24%' },
  ]);

  spotlight = signal({
    title: 'FEATURED DROP',
    artist: 'METRO BOOMIN',
    image: 'assets/images/metro.jpg',
    description: 'Explore the latest sound kit from the legendary producer.',
  });
}
