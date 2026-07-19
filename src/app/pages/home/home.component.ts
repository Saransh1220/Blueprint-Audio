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
  imports: [HeroComponent, TickerComponent, GenresSectionComponent, LabSectionComponent],
  template: `
    <app-hero
      [useExternalData]="useHomepageData()"
      [homepageLoading]="homepageLoading()"
      [featuredSpecs]="featuredSpecs()"
    ></app-hero>
    <app-ticker></app-ticker>
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
