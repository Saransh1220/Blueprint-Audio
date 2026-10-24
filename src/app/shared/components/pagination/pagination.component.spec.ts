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

  it('handles empty totals and small page counts', () => {
    fixture.componentRef.setInput('total', 0);
    fixture.detectChanges();
    expect(component.startItem()).toBe(0);
    expect(component.endItem()).toBe(0);
    expect(component.visiblePages()).toEqual([]);

    fixture.componentRef.setInput('total', 50);
    fixture.detectChanges();
    expect(component.visiblePages()).toEqual([1, 2, 3, 4, 5]);
  });

  it('computes visible pages near the end', () => {
    fixture.componentRef.setInput('currentPage', 10);
    fixture.detectChanges();
    expect(component.visiblePages()).toEqual([1, -1, 9, 10]);
    fixture.componentRef.setInput('currentPage', 9);
    fixture.detectChanges();
    expect(component.visiblePages()).toEqual([1, -1, 8, 9, 10]);
  });

  it('emits per-page changes and renders variants through the template', () => {
    const perPage: number[] = [];
    component.perPageChange.subscribe((v) => perPage.push(v));
    component.onPerPageChange({ target: { value: '32' } } as unknown as Event);
    expect(perPage).toEqual([32]);

    fixture.componentRef.setInput('showPerPage', true);
    fixture.componentRef.setInput('variant', 'studio');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.pagination-perpage')).toBeTruthy();
    expect(el.querySelector('.pagination-container')?.classList).toContain('studio');
    expect(el.querySelector('.prev')?.textContent).toContain('Prev');
    expect(el.querySelector('.ellipsis')).toBeTruthy();

    const select = el.querySelector('select') as HTMLSelectElement;
    select.value = '16';
    select.dispatchEvent(new Event('change'));
    expect(perPage).toEqual([32, 16]);

    const pageEmits: number[] = [];
    component.pageChange.subscribe((v) => pageEmits.push(v));
    (el.querySelector('.next') as HTMLButtonElement).click();
    (el.querySelectorAll('.page-btn')[1] as HTMLButtonElement).click();
    expect(pageEmits).toEqual([2, 2]);

    fixture.componentRef.setInput('variant', 'waveyard');
    fixture.detectChanges();
    expect(el.querySelector('.pagination-container')?.classList).toContain('waveyard');
    expect(el.querySelector('.pagination-info span')).toBeTruthy();
  });
});
