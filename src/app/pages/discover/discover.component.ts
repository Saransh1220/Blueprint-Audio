import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { SpecCardComponent } from '../../components/spec-card/spec-card';
import { LoadingSpinnerComponent } from '../../components/ui/loading-spinner/loading-spinner.component';
import type { Spec } from '../../models';
import { type HomepageData, LabService } from '../../services/lab';

interface DiscoverSection {
  key: string;
  title: string;
  icon: string;
  blurb: string;
  /** Where "See all" goes. */
  query?: Record<string, string>;
}

/** Sectioned entry to the catalog; "All beats" (/explore) is the filterable list. */
@Component({
  selector: 'app-discover',
  imports: [RouterLink, SpecCardComponent, LoadingSpinnerComponent],
  templateUrl: './discover.component.html',
  styleUrl: './discover.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscoverComponent implements OnInit {
  private readonly lab = inject(LabService);

  readonly loading = signal(true);
  readonly failed = signal(false);
  private readonly data = signal<HomepageData | null>(null);

  readonly sections: readonly DiscoverSection[] = [
    {
      key: 'trending',
      title: 'Trending now',
      icon: 'fa-fire',
      blurb: 'What buyers are playing this month',
    },
    {
      key: 'new_releases',
      title: 'New releases',
      icon: 'fa-bolt',
      blurb: 'Fresh drops from producers',
      query: { sort: 'newest' },
    },
    {
      key: 'top_charts',
      title: 'Top charts',
      icon: 'fa-ranking-star',
      blurb: 'Best sellers on the platform',
    },
    {
      key: 'featured',
      title: 'Staff picks',
      icon: 'fa-star',
      blurb: 'Hand-picked by the team',
    },
  ];

  ngOnInit(): void {
    this.lab
      .getHome({ limit: 8, period: '30d' })
      .pipe(
        catchError(() => {
          this.failed.set(true);
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((d) => this.data.set(d));
  }

  specs(key: string): Spec[] {
    return this.data()?.sections[key]?.items.map((i) => i.spec) ?? [];
  }

  hasAny(): boolean {
    return this.sections.some((s) => this.specs(s.key).length);
  }
}
