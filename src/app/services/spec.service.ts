import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import {
  DeleteSpecRequest,
  GetUserSpecsRequest,
  SpecDto,
  UpdateSpecDto,
  UpdateSpecRequest,
} from '../core/api/spec.requests';
import { PaginatedResponse } from '../models/payment';

@Injectable({
  providedIn: 'root',
})
export class SpecService {
  private api = inject(ApiService);

  getUserSpecs(userId: string, page: number = 1): Observable<PaginatedResponse<SpecDto>> {
    return this.api.execute(new GetUserSpecsRequest(userId, page));
  }

  updateSpec(specId: string, data: UpdateSpecDto): Observable<SpecDto> {
    return this.api.execute(new UpdateSpecRequest(specId, data));
  }

  deleteSpec(specId: string): Observable<void> {
    return this.api.execute(new DeleteSpecRequest(specId));
  }
}
