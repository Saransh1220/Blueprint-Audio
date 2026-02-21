import { CommonModule } from '@angular/common';
import { Component, effect, inject, type OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SpecCardComponent } from '../../components/spec-card/spec-card';
import { SpecListItemComponent } from '../../components/spec-list-item/spec-list-item.component';
import { LoadingSpinnerComponent } from '../../components/ui/loading-spinner/loading-spinner.component';
import { Genre, MusicalKey, type Spec } from '../../models';
import { LabService } from '../../services/lab';
import { ToastService } from '../../services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SpecCardComponent,
    SpecListItemComponent,
    LoadingSpinnerComponent,
    PaginationComponent,
  ],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
})
export class SearchPageComponent implements OnInit {
  private labService = inject(LabService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastService = inject(ToastService);

  specs = signal<Spec[]>([]);
  isLoading = signal(true);
  viewMode = signal<'grid' | 'list'>('list');
  pagination = this.labService.specsPagination;
  currentPage = signal(1);

  // Filter Signals
  searchTerm = signal('');
  genre = signal<string[]>([]);
  bpmRange = signal<[number, number]>([60, 200]);
  priceRange = signal<[number, number]>([0, 50000]);
  key = signal('All');
  sortOption = signal('newest');

  // Options
  genres = Object.values(Genre);
  keys = ['All', ...Object.values(MusicalKey)];

  constructor() {
    // Effect/Constructor logic if needed
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      // Update signals from URL
      if (params['search'] !== undefined) this.searchTerm.set(params['search']);
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

      if (params['page']) this.currentPage.set(Number(params['page']));
      else this.currentPage.set(1);

      // Trigger fetch
      this.fetchSpecs();
    });
  }

  // Called ONLY when URL changes (via subscription)
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
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: (err) => {
          console.error('Error fetching specs:', err);
          this.isLoading.set(false);
          this.toastService.show('Failed to load results. Please try again.', 'error');
        },
      });
  }

  // Updates URL based on current signals
  applyFilters() {
    const queryParams: any = {};
    if (this.searchTerm()) queryParams.search = this.searchTerm();
    if (this.genre().length) queryParams.genres = this.genre().join(',');
    if (this.bpmRange()[0] !== 60) queryParams.min_bpm = this.bpmRange()[0];
    if (this.bpmRange()[1] !== 200) queryParams.max_bpm = this.bpmRange()[1];
    if (this.priceRange()[0] !== 0) queryParams.min_price = this.priceRange()[0];
    if (this.priceRange()[1] !== 50000) queryParams.max_price = this.priceRange()[1];
    if (this.key() !== 'All') queryParams.key = this.key();
    if (this.sortOption()) queryParams.sort = this.sortOption();

    // Reset to page 1 on filter change
    queryParams.page = 1;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
    });
  }

  updatePage(page: number) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge',
    });
  }

  // Filter Actions
  toggleGenre(g: string) {
    this.genre.update((current) =>
      current.includes(g) ? current.filter((x) => x !== g) : [...current, g],
    );
    this.applyFilters();
  }

  updateBpm(event: Event, index: 0 | 1) {
    const val = Number((event.target as HTMLInputElement).value);
    this.bpmRange.update((curr) => {
      const newRange = [...curr] as [number, number];
      newRange[index] = val;
      return newRange;
    });
  }

  // Called by (change) event on sliders
  onFilterChange() {
    this.applyFilters();
  }

  updatePrice(event: Event, index: 0 | 1) {
    const val = Number((event.target as HTMLInputElement).value);
    this.priceRange.update((curr) => {
      const newRange = [...curr] as [number, number];
      newRange[index] = val;
      return newRange;
    });
  }

  setKey(k: string) {
    this.key.set(k);
    this.applyFilters();
  }

  onSearch() {
    this.applyFilters();
  }

  clearFilters() {
    this.genre.set([]);
    this.bpmRange.set([60, 200]);
    this.priceRange.set([0, 50000]);
    this.key.set('All');
    this.searchTerm.set('');
    this.applyFilters();
  }

  setSortOption(option: string) {
    this.sortOption.set(option);
    this.fetchSpecs();
  }

  setViewMode(mode: 'grid' | 'list') {
    this.viewMode.set(mode);
  }
}
