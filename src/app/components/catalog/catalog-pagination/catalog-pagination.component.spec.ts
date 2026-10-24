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

  it('computes ranges and pages', () => {
    expect(component.totalPages()).toBe(2);
    expect(component.start()).toBe(1);
    expect(component.end()).toBe(12);
    expect(component.pages()).toEqual([1, 2]);

    fixture.componentRef.setInput('page', 2);
    fixture.detectChanges();
    expect(component.start()).toBe(13);
    expect(component.end()).toBe(22);

    fixture.componentRef.setInput('totalItems', 0);
    fixture.detectChanges();
    expect(component.start()).toBe(0);
    expect(component.totalPages()).toBe(1);
  });

  it('emits only valid page changes', () => {
    const emitted: number[] = [];
    component.pageChange.subscribe((p) => emitted.push(p));
    component.selectPage(0);
    component.selectPage(3);
    component.selectPage(1);
    expect(emitted).toEqual([]);
    component.selectPage(2);
    expect(emitted).toEqual([2]);
  });
});
