import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CatalogPaginationComponent } from './catalog-pagination.component';

describe('CatalogPaginationComponent', () => {
  let component: CatalogPaginationComponent;
  let fixture: ComponentFixture<CatalogPaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogPaginationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogPaginationComponent);
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('pageSize', 12);
    fixture.componentRef.setInput('totalItems', 22);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
