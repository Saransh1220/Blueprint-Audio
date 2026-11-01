import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type OnInit,
  signal,
} from '@angular/core';
import { catchError, finalize, of } from 'rxjs';

import {
  // FeaturedBeatsComponent, // disc carousel section, parked for now
  GenresSectionComponent,
  HeroComponent,
  LabSectionComponent,
  TickerComponent,
} from '../../components';
import type { Spec } from '../../models';
import { LabService, type HomepageData } from '../../services';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    HeroComponent,
    TickerComponent,
    // FeaturedBeatsComponent,
    GenresSectionComponent,
    LabSectionComponent,
  ],
  template: `
    <app-hero></app-hero>
    <app-ticker></app-ticker>
    <!-- <app-featured-beats [specs]="discSpecs()"></app-featured-beats> -->
    <app-genres-section></app-genres-section>
    <app-lab-section
      [useExternalData]="useHomepageData()"
      [homepageLoading]="homepageLoading()"
      [newReleaseSpecs]="newReleaseSpecs()"
      [topChartSpecsInput]="topChartSpecs()"
      [trendingSpecs]="trendingSpecs()"
    ></app-lab-section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  private labService = inject(LabService);

  homepage = signal<HomepageData | null>(null);
  homepageLoading = signal(true);
  useHomepageData = signal(true);

  featuredSpecs = computed(() => this.sectionSpecs('featured'));
  newReleaseSpecs = computed(() => this.sectionSpecs('new_releases'));
  topChartSpecs = computed(() => this.sectionSpecs('top_charts'));
  trendingSpecs = computed(() => this.sectionSpecs('trending'));
  /** The first non-empty list wins: hand-picked, then trending, then newest. */
  discSpecs = computed(
    () =>
      [this.featuredSpecs(), this.trendingSpecs(), this.newReleaseSpecs()].find((l) => l.length) ??
      [],
  );

  ngOnInit(): void {
    this.labService
      .getHome({ limit: 8, period: '30d' })
      .pipe(
        catchError(() => {
          this.useHomepageData.set(false);
          return of(null);
        }),
        finalize(() => this.homepageLoading.set(false)),
      )
      .subscribe((homepage) => {
        this.homepage.set(homepage);
      });
  }

  private sectionSpecs(key: string): Spec[] {
    return this.homepage()?.sections[key]?.items.map((item) => item.spec) ?? [];
  }
}
