import {
  type AfterViewInit,
  Component,
  computed,
  Input,
  type OnInit,
  signal,
  inject,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Genre, MusicalKey } from '../../models/enums';
import type { Spec } from '../../models/spec';
import { LabService } from '../../services/lab';
import { PlayerService } from '../../services/player.service';
import { SpecCardComponent } from '../spec-card/spec-card';
import { SpecListItemComponent } from '../spec-list-item/spec-list-item.component';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-lab-section',
  standalone: true,
  imports: [SpecCardComponent, SpecListItemComponent, FormsModule],
  templateUrl: './lab-section.html',
  styleUrls: ['./lab-section.scss'],
})
export class LabSectionComponent implements OnInit, AfterViewInit {
  private labService = inject(LabService);
  private playerService = inject(PlayerService);

  @Input() type: 'beat' | 'sample' = 'beat';
  specs = signal<Spec[]>([]);
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

      // Price
      const matchesPrice = spec.price >= minPrice && spec.price <= maxPrice;

      // Key
      const matchesKey = keyFilter === 'All' || spec.key === keyFilter;

      return matchesSearch && matchesGenre && matchesBpm && matchesPrice && matchesKey;
    });
  });

  ngOnInit(): void {
    this.labService.getSpecs(this.type).subscribe((specs) => {
      this.specs.set(specs);
    });
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
