import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { CATALOG_REPOSITORY } from '../../../services/catalog/catalog-repository';
import { MockCatalogRepository } from '../../../services/catalog/mock-catalog-repository';
import { ToastService } from '../../../services/toast.service';
import { SamplePackDetailPageComponent } from './sample-pack-detail-page.component';

describe('SamplePackDetailPageComponent', () => {
  const show = vi.fn();
  const repo = new MockCatalogRepository();

  function create(slug: string | null) {
    const params$ = new BehaviorSubject(convertToParamMap(slug ? { slug } : {}));
    TestBed.configureTestingModule({
      imports: [SamplePackDetailPageComponent],
      providers: [
        provideRouter([]),
        { provide: ToastService, useValue: { show } },
        { provide: CATALOG_REPOSITORY, useValue: repo },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: params$, snapshot: { paramMap: params$.value } },
        },
      ],
    });
    const fixture = TestBed.createComponent(SamplePackDetailPageComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, params$ };
  }

  beforeEach(() => vi.clearAllMocks());

  it('falls back to default detail when slug missing or unknown', () => {
    const { component } = create(null);
    expect(component.pack()).toBe(repo.getSamplePackDetail(null));
    const second = TestBed.createComponent(SamplePackDetailPageComponent);
    expect(second.componentInstance).toBeTruthy();
  });

  it('falls back for unknown slug and resolves known slug', () => {
    const { component, params$ } = create('nope-nope');
    expect(component.pack().id).toBe(repo.getSamplePackDetail(null)!.id);
    const known = repo.listSamplePacks()[0];
    params$.next(convertToParamMap({ slug: known.slug }));
    expect(component.pack().id).toBe(known.id);
  });

  it('toggles state signals', () => {
    const { component } = create(null);
    component.toggleDemo();
    expect(component.demoPlaying()).toBe(true);
    component.toggleDemo();
    expect(component.demoPlaying()).toBe(false);
    component.toggleFile('f1');
    expect(component.playingFileId()).toBe('f1');
    component.toggleFile('f1');
    expect(component.playingFileId()).toBeNull();
    component.toggleWishlist();
    expect(component.wishlisted()).toBe(true);
    component.toggleFollowing();
    expect(component.following()).toBe(true);
  });

  it('toasts on acquire for free and paid packs and on download', () => {
    const { component } = create(null);
    const base = component.pack();
    const paid = { ...base, price: { ...base.price, amount_minor: 900 } };
    const free = { ...base, price: { ...base.price, amount_minor: 0 } };
    const spy = vi.spyOn(component, 'pack');
    spy.mockReturnValue(paid);
    component.acquire();
    expect(show).toHaveBeenCalledWith(`${base.title} added to cart.`, 'success');
    spy.mockReturnValue(free);
    component.acquire();
    expect(show).toHaveBeenCalledWith(`${base.title} is ready to download.`, 'success');
    component.downloadFile({ name: 'kick.wav' } as any);
    expect(show).toHaveBeenCalledWith('kick.wav preview download started.', 'success');
  });

  it('navigates to a related pack', () => {
    const { component } = create(null);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.openPack('abc');
    expect(navigate).toHaveBeenCalledWith(['/sample-packs', 'abc']);
  });
});
