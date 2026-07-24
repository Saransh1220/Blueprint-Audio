import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelatedPackCardComponent } from './related-pack-card.component';
import { MOCK_SAMPLE_PACKS } from '../../../content/catalog/catalog.mock-data';

describe('RelatedPackCardComponent', () => {
  let component: RelatedPackCardComponent;
  let fixture: ComponentFixture<RelatedPackCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelatedPackCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RelatedPackCardComponent);
    fixture.componentRef.setInput('pack', MOCK_SAMPLE_PACKS[0]);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
