import { provideHttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { AppComponent } from './app';

@Component({ template: '', standalone: true })
class DummyRouteComponent {}

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: any) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {}, // Deprecated
        removeListener: () => {}, // Deprecated
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([
          { path: '', component: DummyRouteComponent },
          { path: 'login', component: DummyRouteComponent },
          { path: 'register', component: DummyRouteComponent },
          { path: 'upload', component: DummyRouteComponent },
          { path: 'studio', component: DummyRouteComponent },
          { path: 'studio/:tab', component: DummyRouteComponent },
          { path: 'dashboard', component: DummyRouteComponent },
        ]),
        provideHttpClient(),
        provideAnimations(),
        { provide: SocialAuthService, useValue: { signOut: vi.fn().mockResolvedValue(undefined) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should render loader', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.loader')).toBeTruthy();
  });

  it('shows footer on normal pages and hides it on studio/auth/upload routes', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-footer')).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-header')).toBeTruthy();

    await router.navigateByUrl('/login');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-footer')).toBeNull();

    await router.navigateByUrl('/studio');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-footer')).toBeNull();

    await router.navigateByUrl('/upload');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-footer')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-header')).toBeNull();
  });

  it('detects studio routes from the current url', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/studio/analytics');
    expect(component.isStudioRoute()).toBe(true);

    await router.navigateByUrl('/dashboard');
    expect(component.isStudioRoute()).toBe(false);
  });

  it('detects auth routes from the current url', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/register');
    expect(component.isAuthRoute()).toBe(true);

    await router.navigateByUrl('/dashboard');
    expect(component.isAuthRoute()).toBe(false);
  });

  it('detects upload routes from the current url', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/upload');
    expect(component.isUploadRoute()).toBe(true);

    await router.navigateByUrl('/studio/upload');
    expect(component.isUploadRoute()).toBe(true);

    await router.navigateByUrl('/dashboard');
    expect(component.isUploadRoute()).toBe(false);
  });

  it('toggles cart when cart view child exists', () => {
    (component as any).cart = { toggle: vi.fn() };
    component.toggleCart();
    expect((component as any).cart.toggle).toHaveBeenCalled();

    (component as any).cart = null;
    component.toggleCart();
  });
});
