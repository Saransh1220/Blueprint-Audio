import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SamplePackHeroComponent } from './sample-pack-hero.component';
import { MOCK_SAMPLE_PACK_DETAIL } from '../../../content/catalog/catalog.mock-data';

describe('SamplePackHeroComponent', () => {
  let component: SamplePackHeroComponent;
  let fixture: ComponentFixture<SamplePackHeroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SamplePackHeroComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SamplePackHeroComponent);
    fixture.componentRef.setInput('pack', MOCK_SAMPLE_PACK_DETAIL);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
