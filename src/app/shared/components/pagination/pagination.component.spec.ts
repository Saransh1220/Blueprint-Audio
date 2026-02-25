import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  let fixture: ComponentFixture<PaginationComponent>;
  let component: PaginationComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('currentPage', 1);
    fixture.componentRef.setInput('total', 100);
    fixture.componentRef.setInput('perPage', 10);
    fixture.detectChanges();
  });

  it('computes page metadata and visible pages', () => {
    expect(component.totalPages()).toBe(10);
    expect(component.startItem()).toBe(1);
    expect(component.endItem()).toBe(10);
    expect(component.visiblePages()).toEqual([1, 2, -1, 10]);

    fixture.componentRef.setInput('currentPage', 5);
    fixture.detectChanges();
    expect(component.visiblePages()).toEqual([1, -1, 4, 5, 6, -1, 10]);
  });

  it('emits page changes only for valid transitions', () => {
    const emitSpy = vi.fn();
    component.pageChange.subscribe(emitSpy);

    component.onPageChange(2);
    expect(emitSpy).toHaveBeenCalledWith(2);

    emitSpy.mockClear();
    component.onPageChange(1);
    component.onPageChange(0);
    component.onPageChange(999);
    expect(emitSpy).not.toHaveBeenCalled();
  });
});
