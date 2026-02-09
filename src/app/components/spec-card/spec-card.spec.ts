import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Spec } from '../../models';

import { SpecCardComponent } from './spec-card';

describe('SpecCardComponent', () => {
  let component: SpecCardComponent;
  let fixture: ComponentFixture<SpecCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpecCardComponent],
      providers: [provideRouter([])],
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
