import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  filterMode = signal<'all' | 'live' | 'drafts' | 'sold'>('all');
  searchTerm = signal('');
  genreFilter = signal('');
  sortMode = signal('newest');
  selectedTracks = signal<Set<string>>(new Set());
  currentPage = signal(1);
  perPage = signal(12);

  pagination = this.labService.specsPagination;
  trackCount = computed(() => {
    const pagination = typeof this.pagination === 'function' ? this.pagination() : null;
    return pagination?.total ?? this.tracks().length;
  });
  liveCount = computed(() => this.tracks().filter((track) => !!track.price).length);
  draftCount = computed(() => this.tracks().filter((track) => !track.price).length);
  selectedCount = computed(() => this.selectedTracks().size);
  totalPages = computed(() => Math.max(1, Math.ceil(this.trackCount() / this.perPage())));
  pageStart = computed(() => (this.trackCount() ? (this.currentPage() - 1) * this.perPage() + 1 : 0));
  pageEnd = computed(() => Math.min(this.currentPage() * this.perPage(), this.trackCount()));

  filteredTracks = computed(() => {
    const q = this.searchTerm().trim().toLowerCase();
    const genre = this.genreFilter().toLowerCase();
    const filtered = this.tracks().filter((track) => {
      const genreText = this.getGenreLabel(track).toLowerCase();
      const matchesQuery =
        !q ||
        track.title?.toLowerCase().includes(q) ||
        track.key?.toLowerCase().includes(q) ||
        genreText.includes(q);
      const matchesGenre = !genre || genreText.includes(genre);

      if (!matchesQuery || !matchesGenre) return false;
      if (this.filterMode() === 'drafts') return !track.price;
      if (this.filterMode() === 'live') return !!track.price;
      if (this.filterMode() === 'sold') return false;
      return true;
    });
    const sorted = [...filtered];
    if (this.sortMode() === 'plays') {
      sorted.sort((a, b) => this.getPlayCount(b) - this.getPlayCount(a));
    } else if (this.sortMode() === 'revenue') {
      sorted.sort((a, b) => this.getEarned(b) - this.getEarned(a));
    } else if (this.sortMode() === 'alpha') {
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }
    return sorted;
  });

  constructor() {
    this.loadTracks();
  }

  loadTracks(page = this.currentPage()) {
    this.isLoading.set(true);
    this.currentPage.set(page);
    this.labService.getSpecs(this.buildApiFilters()).subscribe({
      next: (specs) => {
        this.tracks.set(specs);
        this.selectedTracks.set(new Set());
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  setView(mode: 'grid' | 'list') { this.viewMode.set(mode); }

  setFilter(mode: 'all' | 'live' | 'drafts' | 'sold') { this.filterMode.set(mode); }

  setSearch(term: string) {
    this.searchTerm.set(term);
    this.loadTracks(1);
  }

  setGenreFilter(genre: string) {
    this.genreFilter.set(genre);
    this.loadTracks(1);
  }

  setSortMode(mode: string) {
    this.sortMode.set(mode);
    this.loadTracks(1);
  }

  previousPage() {
    if (this.currentPage() <= 1) return;
    this.loadTracks(this.currentPage() - 1);
  }

  nextPage() {
    if (this.currentPage() >= this.totalPages()) return;
    this.loadTracks(this.currentPage() + 1);
  }

  goToPage(page: number) {
    const safePage = Math.min(Math.max(page, 1), this.totalPages());
    if (safePage === this.currentPage()) return;
    this.loadTracks(safePage);
  }

  toggleSelect(id: string) {
    this.selectedTracks.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  getGenreLabel(track: Spec) {
    return track.genres?.[0]?.name || 'Beat';
  }

  trackInitial(track: Spec) {
    return (track.title || 'b').slice(0, 1).toLowerCase();
  }

  getPlayCount(track: Spec) {
    return track.analytics?.playCount ?? 0;
  }

  getFavoriteCount(track: Spec) {
    return track.analytics?.favoriteCount ?? 0;
  }

  getSoldCount(track: Spec) {
    return Math.max(0, Math.round((track.analytics?.favoriteCount ?? 0) / 3));
  }

  getEarned(track: Spec) {
    return this.getSoldCount(track) * (track.price || 0);
  }

  getStatus(track: Spec): 'live' | 'review' | 'draft' {
    if (!track.price) return 'draft';
    if (track.processingStatus === 'pending' || track.processingStatus === 'processing') return 'review';
    return 'live';
  }

  releaseMeta(track: Spec) {
    const status = this.getStatus(track);
    if (status === 'draft') return 'Draft · 80% complete · needs cover art';
    if (status === 'review') return 'Submitted recently · awaiting review';
    return `Released · ${this.getGenreLabel(track).toLowerCase()} · with stems`;
  }

  currency(value: number) {
    if (!value) return '—';
    return `₹${Math.round(value).toLocaleString('en-IN')}`;
  }
  private buildApiFilters() {
    const search = this.searchTerm().trim();
    const genre = this.genreFilter().trim();
    const sortMap: Record<string, string> = {
      newest: 'newest',
      plays: 'plays',
      revenue: 'revenue',
      alpha: 'title',
    };

    return {
      category: 'beat' as const,
      page: this.currentPage(),
      per_page: this.perPage(),
      sort: sortMap[this.sortMode()] ?? this.sortMode(),
      ...(search ? { search } : {}),
      ...(genre ? { genres: [genre] } : {}),
    };
  }
}
