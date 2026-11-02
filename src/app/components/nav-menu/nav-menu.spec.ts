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
    fixture.componentRef.setInput('heading', 'Find your next');
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

  it('names the panel and sets the last word of the heading apart', () => {
    render({ accent: 'sound', label: 'Browse' });
    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('Browse');
    expect(el.querySelector('.heading')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Find your next sound',
    );
    expect(el.querySelector('.heading em')?.textContent).toBe('sound');
  });

  it('draws a plain heading when there is no accent', () => {
    render();
    expect(el.querySelector('.heading em')).toBeNull();
  });

  it('lists each destination as a link with its icon, name and line', () => {
    render();
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('a.item'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/explore', '/loops']);
    expect(links[0].querySelector('.name')?.textContent).toBe('Explore');
    expect(links[0].querySelector('.desc')?.textContent).toBe('Beats and producers');
    expect(links[0].querySelector('.icon i')?.classList.contains('fa-compass')).toBe(true);
    expect(links[1].querySelector('.icon')?.getAttribute('data-tint')).toBe('lime');
  });

  it('marks the page you are on', async () => {
    render();
    await TestBed.inject(Router).navigateByUrl('/loops');
    fixture.detectChanges();
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('a.item'));
    expect(links[0].classList.contains('active')).toBe(false);
    expect(links[1].classList.contains('active')).toBe(true);
  });

  it('says which destination was chosen', () => {
    const chosen: NavMenuItem[] = [];
    fixture.componentInstance.selected.subscribe((item) => chosen.push(item));
    render();
    (el.querySelectorAll('a.item')[1] as HTMLAnchorElement).click();
    expect(chosen).toEqual([items[1]]);
  });

  it('draws no footer when none is given', () => {
    render();
    expect(el.querySelector('.foot')?.children.length).toBe(0);
  });
});

@Component({
  imports: [NavMenuComponent],
  template: `
    <app-nav-menu heading="Jump to" [items]="items">
      <div navMenuFooter class="given">Open studio</div>
    </app-nav-menu>
  `,
})
class Host {
  readonly items = items;
}

describe('NavMenuComponent footer slot', () => {
  it('shows what is projected under the grid', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const host = TestBed.createComponent(Host);
    host.detectChanges();
    const foot = host.nativeElement.querySelector('.foot') as HTMLElement;
    expect(foot.querySelector('.given')?.textContent).toBe('Open studio');
  });
});
