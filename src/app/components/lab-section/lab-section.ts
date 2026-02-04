import {
  type AfterViewInit,
  Component,
  computed,
  Input,
  inject,
  type OnInit,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Genre, MusicalKey, type Spec } from '../../models';
import { LabService, PlayerService } from '../../services';
import { SpecCardComponent } from '../spec-card/spec-card';
import { SpecListItemComponent } from '../spec-list-item/spec-list-item.component';
import { LoadingSpinnerComponent } from '../ui/loading-spinner/loading-spinner.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-lab-section',
  standalone: true,
  imports: [
    SpecCardComponent,
    SpecListItemComponent,
    FormsModule,
    LoadingSpinnerComponent,
    PaginationComponent,
  ],
  templateUrl: './lab-section.html',
  styleUrls: ['./lab-section.scss'],
})
export class LabSectionComponent implements OnInit, AfterViewInit {
  private labService = inject(LabService);
  private playerService = inject(PlayerService);

  constructor() {
    gsap.registerPlugin(ScrollTrigger);
  }

  @Input() type: 'beat' | 'sample' = 'beat';
  specs = signal<Spec[]>([]);
  pagination = this.labService.specsPagination;
  isLoading = signal(true);
  currentPage = signal(1);
  viewMode = signal<'grid' | 'list'>('grid');

  setViewMode(mode: 'grid' | 'list') {
    this.viewMode.set(mode);
  }

  // Search & Filter State
  searchTerm = signal('');
  showFilters = signal(false);

  filters = {
    genre: signal<string[]>([]),
    bpmRange: signal<[number, number]>([60, 200]),
    priceRange: signal<[number, number]>([0, 100]),
    key: signal('All'),
  };

  // Options for Dropdowns/Tags
  genres = Object.values(Genre);
  keys = ['All', ...Object.values(MusicalKey)];

  getGenreImage(genre: string): string {
    const map: Record<string, string> = {
      [Genre.TRAP]: 'assets/images/genres/trap.png',
      [Genre.DRILL]: 'assets/images/genres/drill.png',
      [Genre.RNB]: 'assets/images/genres/rnb.png',
      [Genre.EXPERIMENTAL]: 'assets/images/genres/experimental.png',
      [Genre.HOUSE]: 'assets/images/genres/house.png',
      [Genre.LOFI]: 'assets/images/genres/lofi.png',
      [Genre.HIPHOP]: 'assets/images/genres/hiphop.png',
      [Genre.POP]: 'assets/images/genres/pop.png',
      [Genre.TECH]: 'assets/images/genres/tech.png',
      [Genre.AMBIENT]: 'assets/images/genres/ambient.png',
    };
    return map[genre] || 'assets/images/placeholder.jpg';
  }

  filteredSpecs = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const allSpecs = this.specs();
    const genreFilters = this.filters.genre();
    const [minBpm, maxBpm] = this.filters.bpmRange();
    const [minPrice, maxPrice] = this.filters.priceRange();
    const keyFilter = this.filters.key();

    return allSpecs.filter((spec) => {
      // Search
      const matchesSearch =
        spec.title.toLowerCase().includes(term) ||
        spec.tags.some((tag) => tag.toLowerCase().includes(term));

      // Genre (Tags)
      // Check if any of the selected genres match any of the spec's tags
      const matchesGenre =
        genreFilters.length === 0 || genreFilters.some((g) => spec.tags.includes(g));

      // BPM
      const matchesBpm = spec.bpm >= minBpm && spec.bpm <= maxBpm;

      // Price (Convert cents to dollars for comparison)
      const priceInDollars = spec.price / 100;
      const matchesPrice = priceInDollars >= minPrice && priceInDollars <= maxPrice;

      // Key
      const matchesKey = keyFilter === 'All' || spec.key === keyFilter;

      return matchesSearch && matchesGenre && matchesBpm && matchesPrice && matchesKey;
    });
  });

  ngOnInit(): void {
    this.refreshSpecs();
  }

  refreshSpecs(page: number = 1) {
    this.isLoading.set(true);
    this.currentPage.set(page);
    this.labService.getSpecs({ category: this.type, page }).subscribe((specs) => {
      this.specs.set(specs);
      this.isLoading.set(false);
      this.refreshAnimations();
    });
  }

  onPageChange(page: number) {
    this.refreshSpecs(page);
    // Scroll to top of lab section
    const el = document.querySelector('.lab-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  playSong(spec: Spec) {
    this.playerService.showPlayer(spec);
  }

  ngAfterViewInit(): void {
    this.refreshAnimations();
  }

  refreshAnimations() {
    // Wait for DOM update
    setTimeout(() => {
      ScrollTrigger.refresh();
      (gsap.utils.toArray('.gs-item') as Element[]).forEach((item: Element, i: number) => {
        gsap.fromTo(
          item,
          { y: 50, opacity: 0 },
          {
            scrollTrigger: { trigger: item, start: 'top 95%' },
            y: 0,
            opacity: 1,
            duration: 0.6,
            delay: i * 0.05,
            overwrite: true,
          },
        );
      });
    }, 100);
  }

  toggleFilterPanel() {
    this.showFilters.update((v) => !v);
  }

  toggleGenre(genre: string) {
    this.filters.genre.update((current) => {
      if (current.includes(genre)) {
        return current.filter((g) => g !== genre);
      } else {
        return [...current, genre];
      }
    });
  }

  updateBpm(event: Event, index: 0 | 1) {
    const val = Number((event.target as HTMLInputElement).value);
    this.filters.bpmRange.update((current) => {
      const newRange = [...current] as [number, number];
      newRange[index] = val;
      return newRange;
    });
  }

  updatePrice(event: Event, index: 0 | 1) {
    const val = Number((event.target as HTMLInputElement).value);
    this.filters.priceRange.update((current) => {
      const newRange = [...current] as [number, number];
      newRange[index] = val;
      return newRange;
    });
  }

  clearFilters() {
    this.filters.genre.set([]);
    this.filters.bpmRange.set([60, 200]);
    this.filters.priceRange.set([0, 100]);
    this.filters.key.set('All');
    this.searchTerm.set('');
  }
}
