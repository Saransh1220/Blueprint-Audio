import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { GetPublicProfileRequest, UpdateProfileRequest } from '../core/api/user.requests';
import { ApiService } from '../core/services/api.service';
import { UserService } from './user.service';

describe('UserService', () => {
  it('delegates updateProfile and getPublicProfile to ApiService', () => {
    const execute = vi.fn().mockReturnValue(of({}));
    TestBed.configureTestingModule({
      providers: [UserService, { provide: ApiService, useValue: { execute } }],
    });
    const service = TestBed.inject(UserService);

    service.updateProfile({ bio: 'producer' }).subscribe();
    service.getPublicProfile('u1').subscribe();

    expect(execute.mock.calls[0][0]).toBeInstanceOf(UpdateProfileRequest);
    expect(execute.mock.calls[1][0]).toBeInstanceOf(GetPublicProfileRequest);
  });
});
