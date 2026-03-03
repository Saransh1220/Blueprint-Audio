import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { LabService } from '../../services/lab';
import { AnalyticsService } from '../../services/analytics.service';
import { DashboardComponent } from './dashboard.component';
import { Role } from '../../models';

describe('DashboardComponent', () => {
  const getSpecs = vi.fn();
  const getOverview = vi.fn();
  const refresh$ = new Subject<void>();

  function create(userRole = Role.PRODUCER) {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { currentUser: signal({ role: userRole }) } },
        { provide: LabService, useValue: { getSpecs, refresh$ } },
        { provide: AnalyticsService, useValue: { getOverview } },
      ],
    });
    return TestBed.runInInjectionContext(() => new DashboardComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getSpecs.mockReturnValue(of([{ id: 's1' }]));
    getOverview.mockReturnValue(
      of({ total_plays: 10, total_revenue: 50, total_downloads: 5, total_favorites: 2 }),
    );
  });

  it('loads specs and analytics, toggles genres and maps genre images', () => {
    const component = create();
    component.loadSpecs([]);
    component.loadAnalytics();
    expect(getSpecs).toHaveBeenCalled();
    expect(component.filteredSpecs().length).toBe(1);
    expect(component.stats()[0].value).toBe('10');

    component.toggleGenre('Trap');
    expect(component.selectedGenres()).toContain('Trap');
    component.toggleGenre('Trap');
    expect(component.selectedGenres()).not.toContain('Trap');

    expect(component.getGenreImage('Trap')).toContain('trap.png');
    expect(component.getGenreImage('Unknown')).toContain('placeholder');
    refresh$.next();
    expect(getSpecs).toHaveBeenCalled();
  });

  it('handles analytics errors with fallback stats', () => {
    getOverview.mockReturnValueOnce(throwError(() => new Error('x')));
    const component = create();
    component.loadAnalytics();
    expect(component.stats()[0].trend).toBe('No Data');
  });
});
