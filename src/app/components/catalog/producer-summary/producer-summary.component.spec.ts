import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProducerSummaryComponent } from './producer-summary.component';
import { MOCK_SAMPLE_PACK_DETAIL } from '../../../content/catalog/catalog.mock-data';

describe('ProducerSummaryComponent', () => {
  let component: ProducerSummaryComponent;
  let fixture: ComponentFixture<ProducerSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProducerSummaryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProducerSummaryComponent);
    fixture.componentRef.setInput('producer', MOCK_SAMPLE_PACK_DETAIL.producerProfile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
