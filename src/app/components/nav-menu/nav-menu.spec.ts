import '../../../test-setup';
import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { NavMenuComponent } from './nav-menu';
import type { NavMenuItem } from './nav-menu.items';

@Component({ template: '' })
class Stub {}

const items: NavMenuItem[] = [
  {
    label: 'Explore',
    description: 'Beats and producers',
    icon: 'fa-compass',
    route: '/explore',
    tint: 'cobalt',
  },
  {
    label: 'Loops',
    description: 'Drag-ready ideas',
    icon: 'fa-repeat',
    route: '/loops',
    tint: 'lime',
  },
];

describe('NavMenuComponent', () => {
  let fixture: ComponentFixture<NavMenuComponent>;
  let el: HTMLElement;

  const render = (inputs: Record<string, unknown> = {}) => {
    fixture.componentRef.setInput('label', 'Browse');
    fixture.componentRef.setInput('items', items);
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: Stub }])],
    });
    fixture = TestBed.createComponent(NavMenuComponent);
    el = fixture.nativeElement;
  });

  it('labels the panel and highlights the configured destination', () => {
    render({ featuredRoute: '/explore' });
    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('Browse');
    expect(el.querySelector('.heading')?.textContent).toBe('Browse');
    expect(el.querySelector('a.featured')?.getAttribute('href')).toBe('/explore');
  });

  it('lists each destination as a link with its icon, name and line', () => {
    render();
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('a.item'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/explore', '/loops']);
    expect(links[0].querySelector('.name')?.textContent).toBe('Explore');
    expect(links[0].querySelector('.desc')?.textContent).toBe('Beats and producers');
    expect(links[0].querySelector('.icon i')?.classList.contains('fa-compass')).toBe(true);
  });

  it('marks the page you are on', async () => {
    render();
    await TestBed.inject(Router).navigateByUrl('/loops');
    fixture.detectChanges();
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('a.item'));
    expect(links[0].classList.contains('active')).toBe(false);
    expect(links[1].classList.contains('active')).toBe(true);
  });

  it('navigates when a destination is clicked', async () => {
    render();
    (el.querySelectorAll('a.item')[1] as HTMLAnchorElement).click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/loops');
  });
});
