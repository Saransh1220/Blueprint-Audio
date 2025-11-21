import { Component, OnInit, AfterViewInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Spec } from '../../models/spec';
import { LabService } from '../../services/lab';
import { SpecCardComponent } from '../spec-card/spec-card';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-lab-section',
  standalone: true,
  imports: [CommonModule, SpecCardComponent, FormsModule],
  templateUrl: './lab-section.html',
  styleUrls: ['./lab-section.scss'],
})
export class LabSectionComponent implements OnInit, AfterViewInit {
  specs = signal<Spec[]>([]);

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
  genres = ['Trap_v2', 'Drill_Core', 'R&B_Soul', 'Exp_Audio', 'House', 'Lo-Fi'];
  keys = ['All', 'C# MINOR', 'A MAJOR', 'D MINOR', 'F# MAJOR', 'G MINOR'];

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
      const matchesGenre =
        genreFilters.length === 0 ||
        genreFilters.some((g) =>
          spec.tags.some((t) => t.toUpperCase() === g.toUpperCase().split('_')[0]),
        ); // Simple matching logic

      // BPM
      const matchesBpm = spec.bpm >= minBpm && spec.bpm <= maxBpm;

      // Price
      const matchesPrice = spec.price >= minPrice && spec.price <= maxPrice;

      // Key
      const matchesKey = keyFilter === 'All' || spec.key === keyFilter;

      return matchesSearch && matchesGenre && matchesBpm && matchesPrice && matchesKey;
    });
  });

  constructor(private labService: LabService) {}

  ngOnInit(): void {
    this.labService.getSpecs().subscribe((specs) => {
      this.specs.set(specs);
    });
  }

  ngAfterViewInit(): void {
    this.refreshAnimations();
  }

  refreshAnimations() {
    // Wait for DOM update
    setTimeout(() => {
      ScrollTrigger.refresh();
      gsap.utils.toArray('.gs-item').forEach((item: any, i: number) => {
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

  updateBpm(event: any, index: 0 | 1) {
    const val = Number(event.target.value);
    this.filters.bpmRange.update((current) => {
      const newRange = [...current] as [number, number];
      newRange[index] = val;
      return newRange;
    });
  }

  updatePrice(event: any, index: 0 | 1) {
    const val = Number(event.target.value);
    this.filters.priceRange.update((current) => {
      const newRange = [...current] as [number, number];
      newRange[index] = val;
      return newRange;
    });
  }
}
