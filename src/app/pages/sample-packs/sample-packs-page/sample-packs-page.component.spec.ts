import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ToastService } from '../../../services/toast.service';
import { SamplePacksPageComponent } from './sample-packs-page.component';

describe('SamplePacksPageComponent', () => {
  let component: SamplePacksPageComponent;
  let fixture: ComponentFixture<SamplePacksPageComponent>;
  const navigate = vi.fn().mockResolvedValue(true);
  const show = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [SamplePacksPageComponent],
      providers: [
        { provide: Router, useValue: { navigate, createUrlTree: () => ({}), serializeUrl: () => '' } },
        { provide: ToastService, useValue: { show } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SamplePacksPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.filteredPacks().length).toBe(component.packs.length);
    expect(component.visiblePacks().length).toBe(
      Math.min(component.pageSize, component.packs.length),
    );
  });

  it('sorts by newest, popular and downloads', () => {
    const times = component.filteredPacks().map((p) => Date.parse(p.publishedAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));

    component.updateSort('popular');
    const plays = component.filteredPacks().map((p) => p.engagement.playCount);
    expect(plays).toEqual([...plays].sort((a, b) => b - a));

    component.updateSort('downloads');
    const dls = component.filteredPacks().map((p) => p.engagement.downloadCount);
    expect(dls).toEqual([...dls].sort((a, b) => b - a));
    expect(component.page()).toBe(1);
  });

  it('filters by search term and resets page', () => {
    component.updatePage(3);
    const target = component.packs[0];
    component.updateSearch(`  ${target.title.toUpperCase()} `);
    expect(component.page()).toBe(1);
    expect(component.filteredPacks().some((p) => p.id === target.id)).toBe(true);
    component.updateSearch('zzzz-no-such-pack');
    expect(component.filteredPacks()).toEqual([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty')).toBeTruthy();
  });

  it('updates view, page, navigates and toasts', () => {
    component.updateView('list');
    expect(component.viewMode()).toBe('list');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-sample-pack-list-item')).toBeTruthy();

    component.updatePage(2);
    expect(component.page()).toBe(2);
    component.openPack('my-slug');
    expect(navigate).toHaveBeenCalledWith(['/sample-packs', 'my-slug']);
    component.openFilter('Genre');
    expect(show).toHaveBeenCalledWith('Genre filters are ready for API wiring.', 'info');
  });
});
