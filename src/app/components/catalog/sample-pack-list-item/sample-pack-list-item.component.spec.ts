import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SamplePackListItemComponent } from './sample-pack-list-item.component';
import { MOCK_SAMPLE_PACKS } from '../../../content/catalog/catalog.mock-data';

describe('SamplePackListItemComponent', () => {
  let component: SamplePackListItemComponent;
  let fixture: ComponentFixture<SamplePackListItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SamplePackListItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SamplePackListItemComponent);
    fixture.componentRef.setInput('pack', MOCK_SAMPLE_PACKS[0]);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
