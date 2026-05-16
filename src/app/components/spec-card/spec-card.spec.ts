import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Spec } from '../../models';
import { SpecActionService } from '../../services/spec-action.service';

import { SpecCardComponent } from './spec-card';

describe('SpecCardComponent', () => {
  let component: SpecCardComponent;
  let fixture: ComponentFixture<SpecCardComponent>;
  let actionServiceMock: {
    isCurrentlyPlaying: ReturnType<typeof vi.fn>;
    syncFavorite: ReturnType<typeof vi.fn>;
    playSong: ReturnType<typeof vi.fn>;
    addToCart: ReturnType<typeof vi.fn>;
    openDetails: ReturnType<typeof vi.fn>;
    toggleFavorite: ReturnType<typeof vi.fn>;
    downloadFreeMp3: ReturnType<typeof vi.fn>;
    formatDuration: ReturnType<typeof vi.fn>;
  };
  let unsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    unsubscribe = vi.fn();
    actionServiceMock = {
      isCurrentlyPlaying: vi.fn().mockReturnValue(false),
      syncFavorite: vi.fn().mockReturnValue({ unsubscribe }),
      playSong: vi.fn(),
      addToCart: vi.fn(),
      openDetails: vi.fn(),
      toggleFavorite: vi.fn(),
      downloadFreeMp3: vi.fn(),
      formatDuration: vi.fn((s: number) => `0:${String(Math.floor(s)).padStart(2, '0')}`),
    };

    await TestBed.configureTestingModule({
      imports: [SpecCardComponent],
      providers: [provideRouter([]), { provide: SpecActionService, useValue: actionServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(SpecCardComponent);
    component = fixture.componentInstance;
    component.spec = {
      id: '1',
      title: 'Test Spec',
      price: 10,
      bpm: 120,
      key: 'C Major',
      duration: 200,
      tags: ['tag1'],
      imageUrl: 'test-image.jpg',
      audioUrl: 'test-audio.mp3',
      type: 'beat',
      category: 'beat',
      licenses: [],
    } as unknown as Spec;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('delegates card actions to the shared action service', () => {
    const event = new MouseEvent('click');

    component.playSong(event);
    component.addToCart(event);
    component.openDetails();
    component.toggleFavorite(event);
    component.downloadFreeMp3(event);

    expect(actionServiceMock.playSong).toHaveBeenCalledWith(event, component.spec);
    expect(actionServiceMock.addToCart).toHaveBeenCalledWith(event, component.spec);
    expect(actionServiceMock.openDetails).toHaveBeenCalledWith(component.spec);
    expect(actionServiceMock.toggleFavorite).toHaveBeenCalledWith(
      event,
      component.spec,
      component.isFavoriting,
      component.cdr,
    );
    expect(actionServiceMock.downloadFreeMp3).toHaveBeenCalledWith(event, component.spec);
  });

  it('uses fallback media helpers and cleans up favorite sync', () => {
    expect(component.imageUrl).toBe('test-image.jpg');
    expect(component.formatDuration(8)).toBe('0:08');

    component.spec = { ...component.spec, imageUrl: '' } as Spec;
    expect(component.imageUrl).toBe('assets/images/placeholder.jpg');

    component.ngOnDestroy();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
