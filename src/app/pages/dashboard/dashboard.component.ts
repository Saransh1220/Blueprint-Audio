import { CommonModule } from '@angular/common';
import { Component, inject, type OnInit, signal } from '@angular/core';
import { HeaderComponent } from '../../components/header/header';
import { SpecRowComponent } from '../../components/spec-row/spec-row.component';
import { AuthService, type User } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HeaderComponent, SpecRowComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);

  currentUser = signal<User | null>(null);
  currentDate = signal<Date>(new Date());
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
    {
      label: 'Total Plays',
      value: '12.5K',
      icon: 'fas fa-play',
      trend: '+12%',
    },
    {
      label: 'Revenue',
      value: '$2,450',
      icon: 'fas fa-dollar-sign',
      trend: '+8%',
    },
    {
      label: 'Followers',
      value: '850',
      icon: 'fas fa-user-friends',
      trend: '+24%',
    },
  ]);

  spotlight = signal({
    title: 'FEATURED DROP',
    artist: 'METRO BOOMIN',
    image: 'assets/images/metro.jpg', // Placeholder
    description: 'Explore the latest sound kit from the legendary producer.',
  });

  ngOnInit() {
    // In a real app, we'd subscribe to the signal or observable.
    // Since AuthService uses a signal, we can just read it or use computed.
    // But for now, let's just set it from the service.
    this.currentUser.set(this.authService.currentUser());
  }
}
