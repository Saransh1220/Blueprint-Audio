import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoopListItemComponent } from './loop-list-item.component';
import { MOCK_LOOPS } from '../../../content/catalog/catalog.mock-data';

describe('LoopListItemComponent', () => {
  let component: LoopListItemComponent;
  let fixture: ComponentFixture<LoopListItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoopListItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoopListItemComponent);
    fixture.componentRef.setInput('loop', MOCK_LOOPS[0]);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
