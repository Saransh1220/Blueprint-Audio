import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReviewListComponent } from './review-list.component';
import { MOCK_SAMPLE_PACK_DETAIL } from '../../../content/catalog/catalog.mock-data';

describe('ReviewListComponent', () => {
  let component: ReviewListComponent;
  let fixture: ComponentFixture<ReviewListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReviewListComponent);
    fixture.componentRef.setInput('rating', MOCK_SAMPLE_PACK_DETAIL.rating);
    fixture.componentRef.setInput('reviews', MOCK_SAMPLE_PACK_DETAIL.reviews);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
