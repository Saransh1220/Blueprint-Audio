import { provideHttpClient } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LabService, PlayerService } from '../../services';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: any) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {}, // Deprecated
        removeListener: () => {}, // Deprecated
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  beforeEach(async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideHttpClient(),
        provideAnimations(),
        provideRouter([]),
        {
          provide: LabService,
          useValue: {
            getHome: vi.fn().mockReturnValue(
              of({
                generatedAt: new Date().toISOString(),
                cacheTtlSeconds: 900,
                stats: { totalLiveBeats: 0, newReleases7d: 0, totalProducers: 0 },
                sections: {},
              }),
            ),
            getSpecs: vi.fn().mockReturnValue(of([])),
          },
        },
        { provide: PlayerService, useValue: { showPlayer: vi.fn() } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render hero component', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-hero')).toBeTruthy();
  });

  it('should render ticker component', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-ticker')).toBeTruthy();
  });

  it('should render lab section component', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-lab-section')).toBeTruthy();
  });

  it('maps homepage sections into spec lists', () => {
    component.homepage.set({
      generatedAt: 'x',
      cacheTtlSeconds: 1,
      stats: { totalLiveBeats: 0, newReleases7d: 0, totalProducers: 0 },
      sections: {
        featured: { title: 'F', source: 'query', items: [{ spec: { id: 'a' } }] },
        trending: { title: 'T', source: 'query', items: [{ spec: { id: 'b' } }] },
        new_releases: { title: 'N', source: 'query', items: [{ spec: { id: 'c' } }] },
        top_charts: { title: 'C', source: 'query', items: [{ spec: { id: 'd' } }] },
      },
    } as any);
    expect(component.featuredSpecs().map((s) => s.id)).toEqual(['a']);
    expect(component.trendingSpecs().map((s) => s.id)).toEqual(['b']);
    expect(component.newReleaseSpecs().map((s) => s.id)).toEqual(['c']);
    expect(component.topChartSpecs().map((s) => s.id)).toEqual(['d']);
    component.homepage.set(null);
    expect(component.featuredSpecs()).toEqual([]);
  });

  it('falls back to non-homepage data when the homepage request fails', () => {
    const labService = TestBed.inject(LabService) as any;
    labService.getHome.mockReturnValue(throwError(() => new Error('down')));
    const second = TestBed.createComponent(HomeComponent);
    second.detectChanges();
    expect(second.componentInstance.useHomepageData()).toBe(false);
    expect(second.componentInstance.homepage()).toBeNull();
    expect(second.componentInstance.homepageLoading()).toBe(false);
    expect(component.useHomepageData()).toBe(true);
    expect(component.homepageLoading()).toBe(false);
  });
});
