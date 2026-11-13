import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MOCK_SAMPLE_PACKS } from '../../../content/catalog/catalog.mock-data';
import { SamplePackCardComponent } from './sample-pack-card.component';

describe('SamplePackCardComponent', () => {
  let component: SamplePackCardComponent;
  let fixture: ComponentFixture<SamplePackCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SamplePackCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SamplePackCardComponent);
    fixture.componentRef.setInput('pack', MOCK_SAMPLE_PACKS[0]);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
