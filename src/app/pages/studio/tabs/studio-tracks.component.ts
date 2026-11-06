import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { SpecActionService } from '../../../services/spec-action.service';
import { SpecService } from '../../../services/spec.service';
import { SpecAdapter } from '../../../adapters/spec.adapter';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Spec } from '../../../models';
import { AuthService, LabService, ToastService } from '../../../services';

@Component({
  selector: 'app-studio-tracks',
  imports: [CommonModule, RouterLink, ConfirmDialogComponent],
  templateUrl: './studio-tracks.component.html',
  styleUrl: './studio-tracks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioTracksComponent {
  private labService = inject(LabService);
  private specService = inject(SpecService);
  private adapter = inject(SpecAdapter);
  readonly actions = inject(SpecActionService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  readonly confirmation = viewChild(ConfirmDialogComponent);
  readonly trackPendingDelete = signal<Spec | null>(null);

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

  pagination = signal<{ total: number } | null>(null);
  trackCount = computed(() => {
    const pagination = typeof this.pagination === 'function' ? this.pagination() : null;
    return pagination?.total ?? this.tracks().length;
  });
  liveCount = computed(
    () => this.tracks().filter((track) => this.getStatus(track) === 'live').length,
  );
  draftCount = computed(
    () => this.tracks().filter((track) => this.getStatus(track) === 'draft').length,
  );
  selectedCount = computed(() => this.selectedTracks().size);
  totalPages = computed(() => Math.max(1, Math.ceil(this.trackCount() / this.perPage())));
  pageStart = computed(() =>
    this.trackCount() ? (this.currentPage() - 1) * this.perPage() + 1 : 0,
  );
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
      if (this.filterMode() === 'drafts') return this.getStatus(track) === 'draft';
      if (this.filterMode() === 'live') return this.getStatus(track) === 'live';
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
    this.labService.refresh$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.loadTracks(this.currentPage());
    });
  }

  loadTracks(page = this.currentPage()) {
    this.isLoading.set(true);
    this.currentPage.set(page);
    const user = this.currentUser();
    if (!user) {
      this.tracks.set([]);
      this.isLoading.set(false);
      return;
    }
    this.specService.getUserSpecs(user.id, page, this.perPage()).subscribe({
      next: (response) => {
        this.pagination.set(response.metadata);
        this.tracks.set(response.data.map((dto) => this.adapter.adapt(dto)));
        this.selectedTracks.set(new Set());
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

  setFilter(mode: 'all' | 'live' | 'drafts' | 'sold') {
    this.filterMode.set(mode);
  }

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

  editTrack(event: Event, track: Spec) {
    event.stopPropagation();
    this.router.navigate(['/studio/upload'], { queryParams: { edit: track.id } });
  }

  confirmDelete(event: Event, track: Spec) {
    event.stopPropagation();
    this.trackPendingDelete.set(track);
    this.confirmation()?.open({
      title: 'Delete beat?',
      message: `Remove “${track.title || 'this track'}” from your catalog?`,
      confirmText: 'Delete beat',
      type: 'danger',
    });
  }

  onDeleteConfirmed() {
    const track = this.trackPendingDelete();
    if (!track) return;
    this.specService.deleteSpec(track.id).subscribe({
      next: () => {
        this.toastService.success('Beat deleted');
        this.trackPendingDelete.set(null);
        this.loadTracks();
      },
      error: () => {
        this.toastService.error('Unable to delete this beat. Please try again.');
        this.trackPendingDelete.set(null);
      },
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
    return 0; // Sales figures are hidden until the per-track sales endpoint is connected.
  }

  getEarned(track: Spec) {
    return this.getSoldCount(track) * (track.price || 0);
  }

  getStatus(track: Spec): 'live' | 'review' | 'draft' {
    if (track.processingStatus === 'failed') return 'draft';
    if (track.processingStatus === 'pending' || track.processingStatus === 'processing')
      return 'review';
    return 'live';
  }

  releaseMeta(track: Spec) {
    const status = this.getStatus(track);
    if (status === 'draft') return 'Draft';
    if (status === 'review') return 'Submitted recently · awaiting review';
    return `Released · ${this.getGenreLabel(track).toLowerCase()}`;
  }

  currency(value: number) {
    if (!value) return '—';
    return '—';
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
