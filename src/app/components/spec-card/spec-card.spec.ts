import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Spec } from '../../models';
import { SpecActionService } from '../../services/spec-action.service';

import { SpecCardComponent } from './spec-card';

describe('SpecCardComponent', () => {
  let component: SpecCardComponent;
  let fixture: ComponentFixture<SpecCardComponent>;

  beforeEach(async () => {
    const actionServiceMock = {
      isCurrentlyPlaying: vi.fn().mockReturnValue(false),
      syncFavorite: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
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
});
