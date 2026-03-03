import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HeaderComponent } from './header';
import { CartService, AuthService, NotificationService } from '../../services';

describe('HeaderComponent behavior', () => {
  const markAsRead = vi.fn();
  const markAllAsRead = vi.fn();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CartService, useValue: {} },
        { provide: AuthService, useValue: {} },
        {
          provide: NotificationService,
          useValue: {
            notifications: signal([]),
            unreadCount: signal(0),
            markAsRead,
            markAllAsRead,
          },
        },
      ],
    });
  });

  it('toggles menus and notification actions', () => {
    const component = TestBed.runInInjectionContext(() => new HeaderComponent());

    component.toggleNotifications();
    expect(component.isNotificationsOpen).toBe(true);
    expect(component.isUserMenuOpen).toBe(false);
    expect(component.isMobileMenuOpen).toBe(false);
    component.toggleNotifications();
    expect(component.isNotificationsOpen).toBe(false);

    component.toggleMobileMenu();
    expect(component.isMobileMenuOpen).toBe(true);
    expect(component.isNotificationsOpen).toBe(false);
    component.toggleMobileMenu();
    expect(component.isMobileMenuOpen).toBe(false);

    component.toggleUserMenu();
    expect(component.isUserMenuOpen).toBe(true);
    expect(component.isMobileMenuOpen).toBe(false);
    component.toggleUserMenu();
    expect(component.isUserMenuOpen).toBe(false);

    const stopPropagation = vi.fn();
    component.markAsRead('n1', { stopPropagation } as any);
    expect(stopPropagation).toHaveBeenCalled();
    expect(markAsRead).toHaveBeenCalledWith('n1');

    component.markAllAsRead();
    expect(markAllAsRead).toHaveBeenCalled();

    component.closeNotifications();
    component.closeMobileMenu();
    component.closeUserMenu();
    expect(component.isNotificationsOpen).toBe(false);
    expect(component.isMobileMenuOpen).toBe(false);
    expect(component.isUserMenuOpen).toBe(false);
  });
});
