import { TestBed } from '@angular/core/testing';
import { SuPageHeadComponent } from './su-page-head.component';

describe('SuPageHeadComponent', () => {
  function create(inputs: Record<string, string>) {
    const fixture = TestBed.createComponent(SuPageHeadComponent);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the heading, accent, eyebrow and subtitle', () => {
    const el = create({
      heading: 'Good morning,',
      accent: 'Sam.',
      eyebrow: 'Monday · studio',
      subtitle: 'Here is your catalog.',
    });

    expect(el.querySelector('h1')?.textContent).toContain('Good morning,');
    expect(el.querySelector('h1 em')?.textContent).toBe('Sam.');
    expect(el.querySelector('.eyebrow')?.textContent).toContain('Monday · studio');
    expect(el.querySelector('.subtitle')?.textContent).toBe('Here is your catalog.');
  });

  it('omits the optional parts when they are empty', () => {
    const el = create({ heading: 'Only a title' });

    expect(el.querySelector('h1 em')).toBeNull();
    expect(el.querySelector('.eyebrow')).toBeNull();
    expect(el.querySelector('.subtitle')).toBeNull();
    expect(el.querySelector('.head-actions')).not.toBeNull();
  });
});
