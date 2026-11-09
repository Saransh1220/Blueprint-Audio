import '../../../test-setup';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { HeroComponent } from './hero';

describe('HeroComponent', () => {
  let fixture: ComponentFixture<HeroComponent>;
  let component: HeroComponent;
  let el: HTMLElement;
  let navigate: ReturnType<typeof vi.spyOn>;

  const options = () => Array.from(el.querySelectorAll<HTMLElement>('.scope-option'));
  const openMenu = () => {
    el.querySelector<HTMLButtonElement>('.scope-trigger')?.click();
    fixture.detectChanges();
  };
  const type = (value: string) => {
    const input = el.querySelector<HTMLInputElement>('.search-input')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(HeroComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('renders the headline over the nebula', () => {
    expect(el.querySelector('app-halftone-nebula')).toBeTruthy();
    expect(el.querySelector('h1')?.textContent).toContain('brought into focus');
  });

  it('starts on beats with a matching placeholder', () => {
    expect(el.querySelector('.scope-label')?.textContent?.trim()).toBe('Beats');
    expect(el.querySelector<HTMLInputElement>('.search-input')?.placeholder).toContain('beats');
  });

  it('has no submit button; Enter in the lone input submits the form', () => {
    expect(el.querySelector('button[type="submit"]')).toBeNull();
    expect(el.querySelectorAll('form input:not([type="hidden"])')).toHaveLength(1);
    expect(el.querySelector('.search-input')?.getAttribute('enterkeyhint')).toBe('search');
  });

  it('lists beats, sample packs and loops in the dropdown', () => {
    expect(options()).toHaveLength(0);
    openMenu();
    expect(options().map((o) => o.textContent?.trim())).toEqual(['Beats']);
    expect(options()[0].getAttribute('aria-selected')).toBe('true');
  });

  it('switching the option updates the label and placeholder and closes the menu', () => {
    openMenu();
    options()[0].click();
    fixture.detectChanges();
    expect(el.querySelector('.scope-label')?.textContent?.trim()).toBe('Beats');
    expect(el.querySelector<HTMLInputElement>('.search-input')?.placeholder).toContain('beats');
    expect(options()).toHaveLength(0);
  });

  it('searches the page that matches the chosen option', () => {
    type('lofi');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    expect(navigate).toHaveBeenLastCalledWith(['/explore'], { queryParams: { search: 'lofi' } });

    openMenu();
    options()[0].click();
    fixture.detectChanges();
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    expect(navigate).toHaveBeenLastCalledWith(['/explore'], {
      queryParams: { search: 'lofi' },
    });

    openMenu();
    options()[0].click();
    type('  ');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    expect(navigate).toHaveBeenLastCalledWith(['/explore'], { queryParams: {} });
  });

  it('offers the same three scopes as a segmented control for phones', () => {
    const segments = Array.from(el.querySelectorAll<HTMLElement>('.segment'));
    expect(segments.map((s) => s.textContent?.trim())).toEqual(['Beats']);
    expect(segments[0].getAttribute('aria-checked')).toBe('true');

    segments[0].click();
    fixture.detectChanges();
    expect(component.scope().id).toBe('beats');
    expect(el.querySelector<HTMLInputElement>('.search-input')?.placeholder).toContain('beats');
    expect(segments[0].getAttribute('aria-checked')).toBe('true');
    expect(segments[0].getAttribute('aria-checked')).toBe('true');
  });

  it('moves the segmented control with the arrow keys and wraps around', () => {
    const press = (key: string) =>
      el
        .querySelector('.segment')!
        .dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));
    press('ArrowLeft');
    expect(component.scope().id).toBe('beats');
    press('ArrowRight');
    expect(component.scope().id).toBe('beats');
  });

  it('shows a clear button only while there is text, and clears it', () => {
    expect(el.querySelector('.search-clear')).toBeNull();
    type('trap');
    const clear = el.querySelector<HTMLButtonElement>('.search-clear');
    expect(clear).toBeTruthy();
    clear!.click();
    fixture.detectChanges();
    expect(component.query()).toBe('');
    expect(el.querySelector('.search-clear')).toBeNull();
    expect(el.querySelector<HTMLInputElement>('.search-input')?.value).toBe('');
  });

  it('works from the keyboard', () => {
    const trigger = el.querySelector<HTMLButtonElement>('.scope-trigger')!;
    const key = (k: string) => {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: k, cancelable: true }));
      fixture.detectChanges();
    };
    key('ArrowDown');
    expect(component.open()).toBe(true);
    key('ArrowDown');
    key('Enter');
    expect(component.scope().id).toBe('beats');
    expect(component.open()).toBe(false);
    key('ArrowDown');
    key('Escape');
    expect(component.open()).toBe(false);
  });

  it('closes when clicking elsewhere', () => {
    openMenu();
    document.body.click();
    fixture.detectChanges();
    expect(component.open()).toBe(false);
  });
});
