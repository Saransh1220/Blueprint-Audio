import { TestBed } from '@angular/core/testing';
import { SuStatComponent } from './su-stat.component';

describe('SuStatComponent', () => {
  function create(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(SuStatComponent);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the label and value with the default accent', () => {
    const el = create({ label: 'Plays', value: '1,234' });

    expect(el.querySelector('.label')?.textContent).toContain('Plays');
    expect(el.querySelector('.value')?.textContent).toBe('1,234');
    expect(el.querySelector('.stat')?.getAttribute('data-accent')).toBe('hot');
    expect(el.querySelector('.delta')).toBeNull();
    expect(el.querySelector('.hint')).toBeNull();
    expect(el.querySelector('.spark')).toBeNull();
  });

  it('shows an upward change, hint and sparkline', () => {
    const el = create({
      label: 'Revenue',
      value: '₹5,678',
      delta: '+12.0%',
      up: true,
      hint: 'vs prior week',
      spark: '0,20 40,10 80,2',
      accent: 'cobalt',
    });

    const delta = el.querySelector('.delta') as HTMLElement;
    expect(delta.textContent).toContain('▲');
    expect(delta.textContent).toContain('+12.0%');
    expect(delta.classList.contains('up')).toBe(true);
    expect(el.querySelector('.hint')?.textContent).toBe('vs prior week');
    expect(el.querySelector('polyline')?.getAttribute('points')).toBe('0,20 40,10 80,2');
    expect(el.querySelector('.stat')?.getAttribute('data-accent')).toBe('cobalt');
  });

  it('shows a downward change and a neutral change', () => {
    const down = create({ label: 'Plays', value: '1', delta: '−3.0%', up: false });
    expect(down.querySelector('.delta')?.textContent).toContain('▼');
    expect(down.querySelector('.delta')?.classList.contains('down')).toBe(true);

    TestBed.resetTestingModule();
    const neutral = create({ label: 'Plays', value: '1', delta: '0%', up: null });
    expect(neutral.querySelector('.delta')?.textContent).toContain('•');
    expect(neutral.querySelector('.delta')?.classList.contains('up')).toBe(false);
    expect(neutral.querySelector('.delta')?.classList.contains('down')).toBe(false);
  });
});
