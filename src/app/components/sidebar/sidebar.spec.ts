import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Genre, Role } from '../../models';
import { AuthService, CartService } from '../../services';
import { SidebarComponent } from './sidebar';

@Component({ template: '' })
class BrowsePageStub {}

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let root: HTMLElement;
  const currentUser = signal<{ role: Role } | null>(null);
  const count = signal(0);

  beforeEach(() => {
    currentUser.set(null);
    count.set(0);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'explore', component: BrowsePageStub },
          { path: 'discover', component: BrowsePageStub },
        ]),
        { provide: AuthService, useValue: { currentUser } },
        { provide: CartService, useValue: { count } },
      ],
    });
    fixture = TestBed.createComponent(SidebarComponent);
    root = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('updates purchase and selling links on sign-in and reflects the cart count', () => {
    expect(root.querySelector('a[href="/login"]')?.textContent).toContain('Purchases');
    expect(root.querySelector('a[href="/cart"] .count')).toBeNull();

    currentUser.set({ role: Role.ARTIST });
    count.set(3);
    fixture.detectChanges();
    expect(root.querySelector('a[href="/studio/purchases"]')?.textContent).toContain('Purchases');
    expect(root.querySelector('a[href="/cart"] .count')?.textContent).toBe('3');
    expect(root.querySelector('a[href="/upload"]')).toBeNull();

    currentUser.set({ role: Role.PRODUCER });
    fixture.detectChanges();
    expect(root.querySelector('a[href="/upload"]')?.textContent).toContain('Upload');
    expect(root.querySelector('a[href="/studio/overview"]')?.textContent).toContain('Studio');
  });

  it('updates active links across catalog routes and query parameters', async () => {
    const router = TestBed.inject(Router);
    const active = () => root.querySelector('[aria-current="page"]')?.textContent?.trim();
    await router.navigateByUrl('/discover');
    fixture.detectChanges();
    expect(active()).toBe('Explore');

    await router.navigateByUrl('/explore?search=trap');
    fixture.detectChanges();
    expect(active()).toBe('All beats');

    root.querySelector<HTMLAnchorElement>('a[href="/discover?section=new_releases"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(active()).toBe('New releases');

    const toggle = root.querySelector<HTMLButtonElement>('[aria-controls="sidebar-genres"]')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    const genre = Object.values(Genre)[0];
    await router.navigate(['/explore'], { queryParams: { genres: genre } });
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('#sidebar-genres .active')?.textContent?.trim()).toBe(genre);

    toggle.click();
    fixture.detectChanges();
    expect(root.querySelector('#sidebar-genres')).toBeNull();
  });
});
