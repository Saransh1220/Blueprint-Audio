import { Component, input } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { SpecCardComponent } from '../../components/spec-card/spec-card';
import type { Spec } from '../../models';
import { type HomepageData, LabService } from '../../services/lab';
import { DiscoverComponent } from './discover.component';

@Component({ selector: 'app-spec-card', template: '{{ spec().id }}' })
class SpecCardStub {
  readonly spec = input.required<Spec>();
}

const homepage: HomepageData = {
  generatedAt: '2026-01-01T00:00:00Z',
  cacheTtlSeconds: 60,
  stats: { totalLiveBeats: 2, newReleases7d: 2, totalProducers: 1 },
  sections: {
    trending: { title: 'Trending', source: 'query', items: [] },
    new_releases: {
      title: 'New releases',
      source: 'query',
      items: ['beat-1', 'beat-2'].map((id, index) => ({
        rank: index + 1,
        score: 0,
        movement: '-',
        metrics: { plays: 0, favorites: 0, downloads: 0, purchases: 0, revenue: 0 },
        spec: { id } as Spec,
      })),
    },
  },
};

describe('DiscoverComponent', () => {
  let fixture: ComponentFixture<DiscoverComponent>;
  let root: HTMLElement;
  const getHome = vi.fn<LabService['getHome']>();

  beforeEach(() => {
    getHome.mockReset();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: LabService, useValue: { getHome } }],
    }).overrideComponent(DiscoverComponent, {
      remove: { imports: [SpecCardComponent] },
      add: { imports: [SpecCardStub] },
    });
    fixture = TestBed.createComponent(DiscoverComponent);
    root = fixture.nativeElement;
  });

  it('loads a catalog preview and renders only populated sections', () => {
    const response = new Subject<HomepageData>();
    getHome.mockReturnValue(response);
    fixture.detectChanges();
    expect(getHome).toHaveBeenCalledWith({ limit: 8, period: '30d' });
    expect(root.querySelector('app-loading-spinner')).toBeTruthy();

    response.next(homepage);
    response.complete();
    fixture.detectChanges();

    expect(root.querySelector('app-loading-spinner')).toBeNull();
    expect(Array.from(root.querySelectorAll('section h2'), (h) => h.textContent)).toEqual([
      'New releases',
    ]);
    expect(Array.from(root.querySelectorAll('app-spec-card'), (card) => card.textContent)).toEqual([
      'beat-1',
      'beat-2',
    ]);
    expect(root.querySelector('section a')?.getAttribute('href')).toBe('/explore?sort=newest');
  });

  it('links to the catalog for an empty response', () => {
    getHome.mockReturnValue(of({ ...homepage, sections: {} }));
    fixture.detectChanges();

    expect(root.querySelector('section')).toBeNull();
    expect(root.querySelector('a[href="/explore"]')?.textContent).toContain('Browse all beats');
  });

  it('offers the same catalog link after a failed request and stops loading', () => {
    getHome.mockReturnValue(throwError(() => new Error('Catalog unavailable')));
    fixture.detectChanges();

    expect(fixture.componentInstance.failed()).toBe(true);
    expect(root.querySelector('app-loading-spinner')).toBeNull();
    expect(root.querySelector('a[href="/explore"]')?.textContent).toContain('Browse all beats');
  });
});
