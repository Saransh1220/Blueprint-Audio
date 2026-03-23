import '../../../test-setup';
import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService, CartService, NotificationService } from '../../services';
import { Role } from '../../models';

import { HeaderComponent } from './header';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  const currentUser = signal<any>(null);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser, logout: vi.fn() } },
        { provide: CartService, useValue: { count: signal(0) } },
        {
          provide: NotificationService,
          useValue: {
            notifications: signal([]),
            unreadCount: signal(0),
            markAsRead: vi.fn(),
            markAllAsRead: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  beforeEach(() => {
    currentUser.set(null);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows studio link for producers and dashboard for other signed-in users', () => {
    currentUser.set({ id: 'u1', role: Role.PRODUCER, name: 'Prod' });
    fixture.detectChanges();
    let text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Studio');
    expect(text).not.toContain('Dashboard');

    currentUser.set({ id: 'u2', role: Role.ARTIST, name: 'Artist' });
    fixture.detectChanges();
    text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Dashboard');
  });
});
