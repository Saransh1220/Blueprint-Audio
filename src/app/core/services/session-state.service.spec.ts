import { TestBed } from '@angular/core/testing';
import { SessionStateService } from './session-state.service';
import { Role, SystemRole, User } from '../../models';

describe('SessionStateService', () => {
  let service: SessionStateService;

  const mockUser: User = {
    id: 'user-1',
    name: 'Test',
    display_name: 'Tester',
    email: 'test@example.com',
    role: Role.PRODUCER,
    system_role: SystemRole.USER,
    status: 'active',
    email_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SessionStateService],
    });
    service = TestBed.inject(SessionStateService);
  });

  it('starts in loading status with null user and generation 0', () => {
    expect(service.status()).toBe('loading');
    expect(service.currentUser()).toBeNull();
    expect(service.currentUserId()).toBeNull();
    expect(service.isVerified()).toBe(false);
    expect(service.generation()).toBe(0);
  });

  it('sets verified user and increments generation', () => {
    service.setVerified(mockUser);
    expect(service.status()).toBe('verified');
    expect(service.currentUser()).toEqual(mockUser);
    expect(service.currentUserId()).toBe('user-1');
    expect(service.isVerified()).toBe(true);
    expect(service.generation()).toBe(1);
  });

  it('sets anonymous state and increments generation', () => {
    service.setVerified(mockUser);
    expect(service.generation()).toBe(1);

    service.setAnonymous();
    expect(service.status()).toBe('anonymous');
    expect(service.currentUser()).toBeNull();
    expect(service.currentUserId()).toBeNull();
    expect(service.isVerified()).toBe(false);
    expect(service.generation()).toBe(2);
  });

  it('sets unavailable status', () => {
    service.setUnavailable();
    expect(service.status()).toBe('unavailable');
  });
});
