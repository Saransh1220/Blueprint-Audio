import { TestBed } from '@angular/core/testing';
import { SuPanelComponent } from './su-panel.component';

describe('SuPanelComponent', () => {
  function create(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(SuPanelComponent);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the heading and hint', () => {
    const el = create({ heading: 'Revenue', hint: 'Last 30 days' });

    expect(el.querySelector('h2')?.textContent).toBe('Revenue');
    expect(el.querySelector('.hint')?.textContent).toBe('Last 30 days');
    expect(el.getAttribute('data-tone')).toBe('default');
    expect(el.hasAttribute('data-accent')).toBe(false);
    expect(el.querySelector('.mark')).toBeNull();
  });

  it('reflects the tone and accent on the host and shows the title marker', () => {
    const el = create({ heading: 'Top beats', tone: 'dark', accent: 'sun' });

    expect(el.getAttribute('data-tone')).toBe('dark');
    expect(el.getAttribute('data-accent')).toBe('sun');
    expect(el.querySelector('.mark')).not.toBeNull();
    expect(el.querySelector('.hint')).toBeNull();
  });

  it('removes the body padding class logic when flush is set', () => {
    const flush = create({ heading: 'List', flush: true });
    expect(flush.querySelector('.panel')?.classList.contains('flush')).toBe(true);
  });

  it('supports the soft tone', () => {
    const el = create({ heading: 'Settings', tone: 'soft' });
    expect(el.getAttribute('data-tone')).toBe('soft');
  });
});
