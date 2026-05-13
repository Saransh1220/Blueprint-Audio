import '../../../test-setup';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { LabService } from '../../services';
import { HeroComponent } from './hero';

describe('HeroComponent', () => {
  let component: HeroComponent;
  let fixture: ComponentFixture<HeroComponent>;
  const getSpecs = vi.fn();

  beforeEach(async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    getSpecs.mockReturnValue(
      of([
        {
          id: 'beat-1',
          producerId: 'producer-1',
          producerName: 'Kita Sol',
          type: 'Instrumental',
          category: 'beat',
          imageUrl: '/assets/beat.jpg',
          title: 'Violet Hour',
          bpm: 92,
          key: 'Em',
          tags: [],
          price: 29,
          genres: [{ id: 'g1', name: 'R&B', slug: 'rnb' }],
          licenses: [],
          processingStatus: 'completed',
        },
      ]),
    );

    await TestBed.configureTestingModule({
      imports: [HeroComponent],
      providers: [provideRouter([]), { provide: LabService, useValue: { getSpecs } }],
    }).compileComponents();

    fixture = TestBed.createComponent(HeroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    getSpecs.mockReset();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads beat cards from specs api', () => {
    expect(getSpecs).toHaveBeenCalledWith({
      category: 'beat',
      page: 1,
      per_page: 7,
      sort: 'newest',
    });
    expect(component.beatCards()[0]).toMatchObject({
      id: 'beat-1',
      title: 'Violet Hour',
      producer: 'Kita Sol',
      producerHandle: '@kitasol',
      genre: 'R&B',
      meta: '92 BPM / Em',
      price: '$29',
      imageUrl: '/assets/beat.jpg',
    });
  });
});
