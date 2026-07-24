import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoopCardComponent } from './loop-card.component';
import { MOCK_LOOPS } from '../../../content/catalog/catalog.mock-data';

describe('LoopCardComponent', () => {
  let component: LoopCardComponent;
  let fixture: ComponentFixture<LoopCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoopCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoopCardComponent);
    fixture.componentRef.setInput('loop', MOCK_LOOPS[0]);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
