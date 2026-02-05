import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import {
  GetPublicProfileRequest,
  PublicUserResponse,
  UpdateProfileDto,
  UpdateProfileRequest,
} from '../core/api/user.requests';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private api = inject(ApiService);

  updateProfile(data: UpdateProfileDto): Observable<PublicUserResponse> {
    return this.api.execute(new UpdateProfileRequest(data));
  }

  getPublicProfile(userId: string): Observable<PublicUserResponse> {
    return this.api.execute(new GetPublicProfileRequest(userId));
  }
}
