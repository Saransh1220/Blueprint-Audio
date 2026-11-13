import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StudioEarningsComponent } from './studio-earnings.component';

describe('Studio earnings availability', () => {
  it('does not advertise a balance or accept a payout before ledger integration', () => {
    TestBed.configureTestingModule({
      imports: [StudioEarningsComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(StudioEarningsComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('not available yet');
    expect(root.querySelector('button')).toBeNull();
    expect(root.querySelector('a')?.getAttribute('href')).toBe('/studio/orders');
  });
});
