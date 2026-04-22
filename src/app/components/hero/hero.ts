import {
  type AfterViewInit,
  type OnInit,
  type OnDestroy,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { FormsModule } from '@angular/forms';
import { Genre } from '../../models/enums';

@Component({
  selector: 'app-hero',
  imports: [RouterLink, FormsModule],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block' },
})
export class HeroComponent implements AfterViewInit, OnInit, OnDestroy {
  private el = inject(ElementRef);
  private router = inject(Router);

  // Search logic
  searchQuery = signal('');
  isSearchFocused = signal(false);
  activeChips = signal<string[]>(['Trap']);
  
  // Rotating headline
  useCases = [
    'your next single',
    'your film score',
    "tonight's session",
    'your EP',
    'your advertisement',
    'your mixtape',
  ];
  currentUseCase = signal(this.useCases[0]);
  useCaseOpacity = signal(1);
  private ucInterval: any;

  // Rotating placeholders
  placeholders = [
    'trap beats at 140 BPM…',
    'dark moody piano loops…',
    'afrobeats with stems…',
    'cinematic trailer music…',
    '“looking for sync-ready R&B”',
    'producers from Lagos…',
  ];
  currentPlaceholder = signal(this.placeholders[0]);
  private phInterval: any;

  ngOnInit() {
    let ucIdx = 0;
    this.ucInterval = setInterval(() => {
      ucIdx = (ucIdx + 1) % this.useCases.length;
      this.useCaseOpacity.set(0);
      setTimeout(() => {
        this.currentUseCase.set(this.useCases[ucIdx]);
        this.useCaseOpacity.set(1);
      }, 200);
    }, 2400);

    let phIdx = 0;
    this.phInterval = setInterval(() => {
      if (!this.isSearchFocused()) {
        phIdx = (phIdx + 1) % this.placeholders.length;
        this.currentPlaceholder.set(this.placeholders[phIdx]);
      }
    }, 2800);
  }

  ngOnDestroy() {
    clearInterval(this.ucInterval);
    clearInterval(this.phInterval);
  }

  ngAfterViewInit(): void {
    const reveals = this.el.nativeElement.querySelectorAll('.gs-reveal');
    gsap.to(reveals, {
      opacity: 1,
      y: 0,
      duration: 1.2,
      stagger: 0.1,
      ease: 'power2.out',
      delay: 0.1,
    });
  }

  // Chip management
  addChip(label: string) {
    if (!this.activeChips().some((c) => c.toLowerCase() === label.toLowerCase())) {
      this.activeChips.update((chips) => [...chips, label]);
    }
  }

  removeChip(label: string) {
    this.activeChips.update((chips) => chips.filter((c) => c !== label));
  }

  // Search
  onSearchFocus() {
    this.isSearchFocused.set(true);
  }

  onSearchBlur() {
    setTimeout(() => {
      this.isSearchFocused.set(false);
    }, 150);
  }

  pickSuggest(label: string) {
    this.searchQuery.set(label);
    this.doSearch();
  }

  doSearch() {
    const queryParams: Record<string, string> = {};
    const matchedGenres: string[] = [];
    const searchTerms: string[] = [];

    // Separate active chips into valid genres vs free-text search strings
    const allGenres = Object.values(Genre).map(g => g.toLowerCase());
    
    for (const chip of this.activeChips()) {
      const lowerChip = chip.toLowerCase();
      // Handle the case where the enum has R&B but the chip might be R&B or Rnb etc.
      // We will look for a direct match in the values.
      const exactGenreMatch = Object.values(Genre).find(g => g.toLowerCase() === lowerChip);
      if (exactGenreMatch) {
        matchedGenres.push(exactGenreMatch);
      } else {
        searchTerms.push(chip);
      }
    }

    if (this.searchQuery().trim()) {
      searchTerms.push(this.searchQuery().trim());
    }

    if (matchedGenres.length > 0) {
      queryParams['genres'] = matchedGenres.join(',');
    }
    
    if (searchTerms.length > 0) {
      queryParams['search'] = searchTerms.join(' ');
    }

    // Direct to search page with mapped parameters
    this.router.navigate(['/search'], { queryParams });
  }

  doQuick(key: string) {
    const queryParams: Record<string, string | number> = {};
    if (key === 'under-30') {
      queryParams['max_price'] = 999;
    } else if (key === 'new') {
      queryParams['sort'] = 'newest';
    } else if (key === 'stems') {
      queryParams['search'] = 'stems';
    } else if (key === 'sync') {
      queryParams['search'] = 'sync';
    }
    this.router.navigate(['/search'], { queryParams });
  }
}
