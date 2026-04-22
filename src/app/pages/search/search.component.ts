import { Component, computed, inject, signal, type OnDestroy, type OnInit } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { SpecCardComponent } from '../../components/spec-card/spec-card';
import { SpecListItemComponent } from '../../components/spec-list-item/spec-list-item.component';
import { LoadingSpinnerComponent } from '../../components/ui/loading-spinner/loading-spinner.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { Genre, MusicalKey, type Spec } from '../../models';
import { LabService } from '../../services/lab';
import { ToastService } from '../../services/toast.service';

type GroupKey = 'genres' | 'bpm' | 'price' | 'key' | 'licenses' | 'moods' | 'extras';
type KeyMode = 'any' | 'major' | 'minor';

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    SpecCardComponent,
    SpecListItemComponent,
    LoadingSpinnerComponent,
    PaginationComponent,
  ],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
})
export class SearchPageComponent implements OnInit, OnDestroy {
  private labService = inject(LabService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastService = inject(ToastService);
  private document = inject(DOCUMENT);

  specs = signal<Spec[]>([]);
  isLoading = signal(true);
  viewMode = signal<'grid' | 'list'>('grid');
  pagination = this.labService.specsPagination;
  currentPage = signal(1);

  searchTerm = signal('');
  genre = signal<string[]>([]);
  bpmRange = signal<[number, number]>([60, 200]);
  priceRange = signal<[number, number]>([0, 50000]);
  key = signal('All');
  sortOption = signal('newest');

  mobileFiltersOpen = signal(false);
  perPageShell = signal('16');
  keyMode = signal<KeyMode>('any');
  openGroups = signal<Record<GroupKey, boolean>>({
    genres: true,
    bpm: true,
    price: true,
    key: true,
    licenses: true,
    moods: true,
    extras: true,
  });

  genres = Object.values(Genre);
  keys = ['All', ...Object.values(MusicalKey)];

  tickerItems = [
    'Fresh drops every Friday',
    '40,000+ artists trust Cult Beats',
    'Filter by BPM, key, and mood',
    'Use the rack your way',
  ];

  inertLicenses = [
    { label: 'Any license', count: '142' },
    { label: 'Basic', count: '118' },
    { label: 'Premium', count: '74' },
    { label: 'Exclusive', count: '11' },
  ];

  inertMoodTags = ['Dark', 'Dreamy', 'Romantic', 'Aggressive', 'Cinematic', 'Hype'];

  inertExtras = [
    { title: 'Has stems', sub: 'separate tracks included' },
    { title: 'Tagless preview', sub: 'no voice tag in demo' },
    { title: 'New this week', sub: 'dropped in last 7 days' },
    { title: 'Trending', sub: 'rising in sales' },
  ];

  activeFilterChips = computed(() => {
    const chips: Array<{ id: string; label: string }> = [];

    if (this.searchTerm().trim()) {
      chips.push({ id: 'search', label: this.searchTerm().trim() });
    }

    this.genre().forEach((g) => chips.push({ id: `genre:${g}`, label: g }));

    if (this.bpmRange()[0] !== 60 || this.bpmRange()[1] !== 200) {
      chips.push({ id: 'bpm', label: `${this.bpmRange()[0]}-${this.bpmRange()[1]} BPM` });
    }

    if (this.priceRange()[0] !== 0 || this.priceRange()[1] !== 50000) {
      chips.push({ id: 'price', label: `₹${this.priceRange()[0]}-₹${this.priceRange()[1]}` });
    }

    if (this.key() !== 'All') {
      chips.push({ id: 'key', label: this.key() });
    }

    return chips;
  });

  resultCount = computed(() => this.pagination()?.total ?? this.specs().length);
  totalPages = computed(() => {
    const meta = this.pagination();
    return meta ? Math.max(1, Math.ceil(meta.total / meta.per_page)) : 1;
  });

  bpmFillLeft = computed(() => ((this.bpmRange()[0] - 60) / (200 - 60)) * 100);
  bpmFillWidth = computed(() => ((this.bpmRange()[1] - this.bpmRange()[0]) / (200 - 60)) * 100);
  priceFillLeft = computed(() => (this.priceRange()[0] / 50000) * 100);
  priceFillWidth = computed(
    () => ((this.priceRange()[1] - this.priceRange()[0]) / 50000) * 100,
  );

  visibleKeys = computed(() => {
    const mode = this.keyMode();
    if (mode === 'major') {
      return this.keys.filter((k) => k === 'All' || k.includes('MAJOR'));
    }
    if (mode === 'minor') {
      return this.keys.filter((k) => k === 'All' || k.includes('MINOR'));
    }
    return this.keys;
  });

  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;
  private routeSubscription?: Subscription;
  private scrollToTopOnNextFetch = false;

  ngOnInit() {
    this.document.body.classList.add('search-page-active');

    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => {
        this.applyFilters();
      });

    this.routeSubscription = this.route.queryParams.subscribe((params) => {
      if (params['search'] !== undefined) this.searchTerm.set(params['search']);
      else this.searchTerm.set('');

      if (params['genres']) this.genre.set(params['genres'].split(','));
      else this.genre.set([]);

      const minBpm = params['min_bpm'] ? Number(params['min_bpm']) : 60;
      const maxBpm = params['max_bpm'] ? Number(params['max_bpm']) : 200;
      this.bpmRange.set([minBpm, maxBpm]);

      const minPrice = params['min_price'] ? Number(params['min_price']) : 0;
      const maxPrice = params['max_price'] ? Number(params['max_price']) : 50000;
      this.priceRange.set([minPrice, maxPrice]);

      if (params['key']) this.key.set(params['key']);
      else this.key.set('All');

      if (params['sort']) this.sortOption.set(params['sort']);
      else this.sortOption.set('newest');

      if (params['page']) this.currentPage.set(Number(params['page']));
      else this.currentPage.set(1);

      this.syncKeyModeFromKey();
      this.fetchSpecs();
    });
  }

  fetchSpecs() {
    this.isLoading.set(true);
    this.labService
      .getSpecs({
        search: this.searchTerm(),
        genres: this.genre(),
        min_bpm: this.bpmRange()[0],
        max_bpm: this.bpmRange()[1],
        min_price: this.priceRange()[0],
        max_price: this.priceRange()[1],
        key: this.key(),
        page: this.currentPage(),
        sort: this.sortOption(),
      })
      .subscribe({
        next: (specs) => {
          this.specs.set(specs);
          this.isLoading.set(false);
          if (this.scrollToTopOnNextFetch) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            this.scrollToTopOnNextFetch = false;
          }
        },
        error: (err) => {
          console.error('Error fetching specs:', err);
          this.isLoading.set(false);
          this.scrollToTopOnNextFetch = false;
          this.toastService.show('Failed to load results. Please try again.', 'error');
        },
      });
  }

  applyFilters() {
    const queryParams: Record<string, string | number> = {};
    if (this.searchTerm().trim()) queryParams['search'] = this.searchTerm().trim();
    if (this.genre().length) queryParams['genres'] = this.genre().join(',');
    if (this.bpmRange()[0] !== 60) queryParams['min_bpm'] = this.bpmRange()[0];
    if (this.bpmRange()[1] !== 200) queryParams['max_bpm'] = this.bpmRange()[1];
    if (this.priceRange()[0] !== 0) queryParams['min_price'] = this.priceRange()[0];
    if (this.priceRange()[1] !== 50000) queryParams['max_price'] = this.priceRange()[1];
    if (this.key() !== 'All') queryParams['key'] = this.key();
    if (this.sortOption()) queryParams['sort'] = this.sortOption();
    queryParams['page'] = 1;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
    });
  }

  updatePage(page: number) {
    this.scrollToTopOnNextFetch = true;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge',
    });
  }

  toggleGenre(g: string) {
    this.genre.update((current) =>
      current.includes(g) ? current.filter((x) => x !== g) : [...current, g],
    );
    this.applyFilters();
  }

  updateBpm(event: Event, index: 0 | 1) {
    const val = Number((event.target as HTMLInputElement).value);
    this.bpmRange.update((curr) => {
      const next = [...curr] as [number, number];
      next[index] = val;
      if (next[0] > next[1]) {
        if (index === 0) next[1] = val;
        else next[0] = val;
      }
      return next;
    });
  }

  updatePrice(event: Event, index: 0 | 1) {
    const val = Number((event.target as HTMLInputElement).value);
    this.priceRange.update((curr) => {
      const next = [...curr] as [number, number];
      next[index] = val;
      if (next[0] > next[1]) {
        if (index === 0) next[1] = val;
        else next[0] = val;
      }
      return next;
    });
  }

  onFilterChange() {
    this.applyFilters();
  }

  setKey(k: string) {
    this.key.set(k);
    this.syncKeyModeFromKey();
    this.applyFilters();
  }

  setKeyMode(mode: KeyMode) {
    this.keyMode.set(mode);
    if (mode === 'major' && this.key() !== 'All' && this.key().includes('MINOR')) {
      this.key.set('All');
    }
    if (mode === 'minor' && this.key() !== 'All' && this.key().includes('MAJOR')) {
      this.key.set('All');
    }
  }

  onSearchInput(term: string) {
    this.searchTerm.set(term);
    this.searchSubject.next(term);
  }

  onSearch() {
    this.applyFilters();
  }

  clearFilters() {
    this.genre.set([]);
    this.bpmRange.set([60, 200]);
    this.priceRange.set([0, 50000]);
    this.key.set('All');
    this.keyMode.set('any');
    this.searchTerm.set('');
    this.applyFilters();
  }

  setSortOption(option: string) {
    this.sortOption.set(option);
    this.applyFilters();
  }

  setViewMode(mode: 'grid' | 'list') {
    this.viewMode.set(mode);
  }

  toggleMobileFilters(force?: boolean) {
    this.mobileFiltersOpen.set(force ?? !this.mobileFiltersOpen());
  }

  toggleGroup(group: GroupKey) {
    this.openGroups.update((current) => ({ ...current, [group]: !current[group] }));
  }

  isGroupOpen(group: GroupKey) {
    return this.openGroups()[group];
  }

  removeActiveChip(id: string) {
    if (id === 'search') {
      this.searchTerm.set('');
    } else if (id.startsWith('genre:')) {
      const g = id.split(':')[1];
      this.genre.update((current) => current.filter((item) => item !== g));
    } else if (id === 'bpm') {
      this.bpmRange.set([60, 200]);
    } else if (id === 'price') {
      this.priceRange.set([0, 50000]);
    } else if (id === 'key') {
      this.key.set('All');
      this.keyMode.set('any');
    }
    this.applyFilters();
  }

  ngOnDestroy() {
    this.document.body.classList.remove('search-page-active');
    this.searchSubscription?.unsubscribe();
    this.routeSubscription?.unsubscribe();
  }

  private syncKeyModeFromKey() {
    const current = this.key();
    if (current === 'All') {
      this.keyMode.set('any');
    } else if (current.includes('MAJOR')) {
      this.keyMode.set('major');
    } else if (current.includes('MINOR')) {
      this.keyMode.set('minor');
    }
  }
}
